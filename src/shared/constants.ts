// WCAG 2.3.1 flash detection parameters
// Scientific basis: ITC Guidelines (Harding & Jeavons 1994) → Harding & Binnie (2002)
// → OFCOM Broadcasting Code (2005) → W3C WCAG 2.0 SC 2.3.1 (2008)
// DO NOT CHANGE without WCAG review — see docs/research/02-medical-research.md
export const WCAG = {
  // Flash rate threshold: no more than 3 flashes per second.
  // Source: WCAG 2.3.1 (Level A). This is the regulatory lower bound derived from
  // Harding & Binnie (2002). Note: highly sensitive individuals can seize below 3 Hz;
  // peak danger zone is 15–25 Hz. 3 Hz is a conservative detection floor, not a
  // biological safety guarantee. False negatives are worse than false positives.
  MAX_FLASHES_PER_SECOND: 3,

  // A flash = one dark→light + one light→dark transition.
  // The darker image must have luminance < 0.80.
  // Luminance delta 0.10 corresponds to ~10% Michelson contrast — conservative floor.
  // Clinical lower bound of risk is >20% contrast (Wilkins 1995/2005).
  MIN_LUMINANCE_DELTA: 0.10,
  MAX_DARK_STATE_LUMINANCE: 0.80,

  // WCAG danger area: 25% of any 10° visual field.
  // At 1024×768 reference display that equals 341×256 pixels.
  // Medical basis: stimuli subtending >10° of visual angle significantly increase
  // seizure risk; full-screen flash at normal viewing distance covers 30–50°
  // (extremely dangerous). Source: Kasteleijn-Nolst Trenité (1989/2012), WCAG 2.3.1.
  DANGER_AREA_FRACTION: 0.25,
  REFERENCE_DANGER_PIXELS: 341 * 256, // 87,296 px at 1024×768 reference

  // Red flash: R/(R+G+B) >= 0.8 with sufficient luminance change.
  // Medical basis: saturated red flickering is 2–3× more epileptogenic than other
  // colors at the same frequency/contrast due to L-cone photoreceptor density in
  // the fovea and the magnocellular → thalamocortical loop. Red-blue alternation
  // is especially dangerous (Pokémon incident, 1997: ~12 Hz red/blue, 685 hospitalized).
  // Red flashes are flagged at any frequency ≥3 Hz — same threshold as general flash.
  // Source: Harding & Jeavons (1994), WCAG 2.3.1.
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
