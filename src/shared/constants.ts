// WCAG 2.3.1 flash detection parameters
export const WCAG = {
  // Flash rate threshold: no more than 3 flashes per second
  MAX_FLASHES_PER_SECOND: 3,

  // A flash = one dark→light + one light→dark transition
  // The darker image must have luminance < 0.80
  MIN_LUMINANCE_DELTA: 0.10,
  MAX_DARK_STATE_LUMINANCE: 0.80,

  // WCAG danger area: 25% of any 10° field of view
  // At 1024x768 reference display, that's 341x256 pixels
  DANGER_AREA_FRACTION: 0.25,
  REFERENCE_DANGER_PIXELS: 341 * 256, // 87,296 px at 1024x768 reference

  // Red flash: R/(R+G+B) >= 0.8 with sufficient luminance change
  RED_RATIO_THRESHOLD: 0.8,

  // Sliding window for counting flash events
  ANALYSIS_WINDOW_MS: 1000,
} as const;

// Screencast settings (lower = faster CPU, less accurate)
export const SCREENCAST = {
  WIDTH: 320,
  HEIGHT: 240,
  QUALITY: 40, // JPEG quality
} as const;

// Default protection settings (all on by default — safe first)
export const DEFAULT_PROTECTIONS = {
  flashDetection: true,
  reducedMotion: true,
  gifBlocking: true,
  videoAutopause: true,
  webglLimit: true,
  rafLimit: true,
  highContrast: false,
  brightnessOverlay: 0.0, // 0 = no dimming, 1 = fully dark
  rafTargetFps: 24,
} as const;
