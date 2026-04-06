# WCAG Thresholds Reference

Display the validated WCAG 2.3.1 thresholds used in EpiHelper and explain the medical basis for each.

## Usage
`/wcag-thresholds`

## Output

Print a reference card:

```
═══════════════════════════════════════════════════════
  EpiHelper — WCAG 2.3.1 Threshold Reference
═══════════════════════════════════════════════════════

FLASH FREQUENCY
  MAX_FLASHES_PER_SECOND = 3
  • Danger zone: 3–30 Hz (peak PPR at 15–25 Hz)
  • Source: Harding & Binnie (2002) → OFCOM → W3C WCAG 2.0
  • Note: 3 Hz is regulatory threshold, NOT a biological safety guarantee

LUMINANCE CONTRAST
  MIN_LUMINANCE_DELTA = 0.10
  • Relative luminance change floor for flash detection
  • Michelson contrast >20% = clinical lower bound of risk
  • Dark rooms increase risk (dilated pupils → more retinal illuminance)

DANGER AREA
  DANGER_AREA_FRACTION = 0.25  (25% of 10° visual field)
  At 1024×768 reference: 341 × 256 pixels
  • Risk scales with visual angle subtended
  • Full-screen flash at normal distance covers 30–50° — extremely dangerous
  • Doubling viewing distance quarters the subtended angle

RED FLASH
  RED_RATIO_THRESHOLD = 0.8   (R / (R+G+B))
  • Saturated red is 2–3× more epileptogenic than other colors
  • Mechanism: L-cone photoreceptors + magnocellular pathway
  • Pokémon incident (1997): red-blue at ~12 Hz → 685 hospitalizations
  • Red flashes flagged at ANY frequency ≥3 Hz

SCREENCAST SAMPLING (flash detection)
  WIDTH = 320, HEIGHT = 240, QUALITY = 40, INTERVAL = 1000ms
  Sliding window: last 1000ms of frames
  State machine: safe → warning (1 flash) → critical (≥3 flash/sec)

═══════════════════════════════════════════════════════
  NEVER change these values without:
  1. Medical literature review
  2. Team sign-off
  3. Update to this reference + CLAUDE.md
═══════════════════════════════════════════════════════
```

Then check `src/shared/constants.ts` and verify the current code values match these thresholds exactly. Flag any discrepancies.
