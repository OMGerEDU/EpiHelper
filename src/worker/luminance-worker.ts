import { parentPort } from 'worker_threads';
import { WCAG, SCREENCAST } from '../shared/constants';

interface FrameMessage {
  type: 'FRAME';
  tabId: number;
  frameBuffer: Buffer; // JPEG encoded
  timestamp: number;
}

interface FlashDetectedMessage {
  type: 'FLASH_DETECTED';
  tabId: number;
  severity: 'warning' | 'critical';
  isRedFlash: boolean;
  flashCount: number;
  dangerAreaPixels: number;
}

// Per-tab state for the sliding window
interface TabFlashState {
  prevLuminance: Float32Array | null;
  transitions: Array<{ timestamp: number; direction: 'rising' | 'falling' }>;
}

const tabStates = new Map<number, TabFlashState>();

// Decode JPEG and extract raw RGBA pixels using sharp
async function decodeFrame(jpegBuffer: Buffer): Promise<{ pixels: Buffer; width: number; height: number }> {
  // Dynamic import of sharp (native module)
  const sharp = (await import('sharp')).default;
  const { data, info } = await sharp(jpegBuffer)
    .resize(SCREENCAST.WIDTH, SCREENCAST.HEIGHT, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { pixels: data, width: info.width, height: info.height };
}

// WCAG relative luminance per pixel
function pixelLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function analyzeFrame(
  pixels: Buffer,
  width: number,
  height: number,
  prevLuminance: Float32Array | null,
  timestamp: number,
  state: TabFlashState
): { flashDetected: boolean; isRedFlash: boolean; dangerAreaPixels: number; flashCount: number } {
  const totalPixels = width * height;
  const currentLuminance = new Float32Array(totalPixels);

  let risingCount = 0;
  let fallingCount = 0;
  let redFlashPixels = 0;

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 3; // RGB (no alpha from sharp raw)
    const r = pixels[offset];
    const g = pixels[offset + 1];
    const b = pixels[offset + 2];
    const lum = pixelLuminance(r, g, b);
    currentLuminance[i] = lum;

    if (prevLuminance !== null) {
      const delta = lum - prevLuminance[i];
      const darkerLum = Math.min(lum, prevLuminance[i]);

      if (Math.abs(delta) >= WCAG.MIN_LUMINANCE_DELTA && darkerLum < WCAG.MAX_DARK_STATE_LUMINANCE) {
        if (delta > 0) risingCount++;
        else fallingCount++;

        // Red flash check
        const total = r + g + b;
        if (total > 0 && r / total >= WCAG.RED_RATIO_THRESHOLD) {
          redFlashPixels++;
        }
      }
    }
  }

  state.prevLuminance = currentLuminance;

  if (prevLuminance === null) {
    return { flashDetected: false, isRedFlash: false, dangerAreaPixels: 0, flashCount: 0 };
  }

  // Scale danger area to WCAG reference resolution (1024x768)
  const scaleX = 1024 / width;
  const scaleY = 768 / height;
  const scaledRising = risingCount * scaleX * scaleY;
  const scaledFalling = fallingCount * scaleX * scaleY;
  const dangerAreaPixels = Math.max(scaledRising, scaledFalling);

  if (dangerAreaPixels < WCAG.REFERENCE_DANGER_PIXELS * WCAG.DANGER_AREA_FRACTION) {
    return { flashDetected: false, isRedFlash: false, dangerAreaPixels, flashCount: 0 };
  }

  // Record transitions in the sliding window
  const dominantDirection = risingCount > fallingCount ? 'rising' : 'falling';
  const lastTransition = state.transitions[state.transitions.length - 1];
  if (!lastTransition || lastTransition.direction !== dominantDirection) {
    state.transitions.push({ timestamp, direction: dominantDirection });
  }

  // Prune transitions outside the 1000ms window
  const windowStart = timestamp - WCAG.ANALYSIS_WINDOW_MS;
  state.transitions = state.transitions.filter((t) => t.timestamp >= windowStart);

  // Count flashes: each rising+falling pair = 1 flash
  const flashCount = Math.floor(state.transitions.length / 2);
  const isRedFlash = redFlashPixels > totalPixels * 0.05;
  const flashDetected = flashCount > WCAG.MAX_FLASHES_PER_SECOND;

  return { flashDetected, isRedFlash, dangerAreaPixels, flashCount };
}

parentPort?.on('message', async (msg: FrameMessage) => {
  if (msg.type !== 'FRAME') return;

  if (!tabStates.has(msg.tabId)) {
    tabStates.set(msg.tabId, { prevLuminance: null, transitions: [] });
  }
  const state = tabStates.get(msg.tabId)!;

  try {
    const { pixels, width, height } = await decodeFrame(msg.frameBuffer);
    const result = analyzeFrame(pixels, width, height, state.prevLuminance, msg.timestamp, state);

    if (result.flashDetected) {
      const response: FlashDetectedMessage = {
        type: 'FLASH_DETECTED',
        tabId: msg.tabId,
        severity: result.isRedFlash || result.flashCount > 5 ? 'critical' : 'warning',
        isRedFlash: result.isRedFlash,
        flashCount: result.flashCount,
        dangerAreaPixels: result.dangerAreaPixels,
      };
      parentPort?.postMessage(response);
    }
  } catch (err) {
    // Frame decode failures are non-fatal — skip this frame
  }
});
