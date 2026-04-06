# Seizure Risk Audit

Audit a file or component for photosensitive epilepsy (PSE) seizure risks based on WCAG 2.3.1, medical research, and EpiHelper project thresholds.

## Usage
`/seizure-risk-audit [file or component name]`

## What to check

### WCAG 2.3.1 Compliance
- Any animation, transition, or keyframe that cycles faster than **3 Hz** (3 times/sec)
- Flash area exceeding **341×256px** at 1024×768 (25% of 10° visual field)
- Red channel content (`R/(R+G+B) > 0.8`) in any flashing element

### Code Patterns That Create Risk
- `animation-duration` < 333ms on looping animations (`animation-iteration-count: infinite`)
- `setInterval` / `requestAnimationFrame` loops toggling visibility/color faster than 333ms
- `<img src="*.gif">` without a blocked/paused wrapper
- `<video autoplay>` without the autopause handler
- CSS `@keyframes` with high-contrast color alternation (especially black↔white or red↔anything)
- `canvas` or WebGL render loops with rapid color changes
- `transition` on `background-color` or `color` triggered rapidly (e.g., hover spam)

### Spatial Patterns
- High-contrast stripe/grid patterns at 3–8 cycles/degree (check CSS backgrounds, SVGs)
- Repeating radial/spiral patterns covering large screen areas
- Checkerboard patterns at high contrast

### Color Issues
- Saturated red (`#FF0000`, `#CC0000`, `#E00000`) in any dynamic element
- High red-blue contrast alternation
- Pure white flash on dark background or vice versa

## Severity Rating
- 🔴 CRITICAL: Exceeds WCAG 2.3.1 — fix before merge
- 🟠 HIGH: Approaches threshold or involves red — requires review
- 🟡 MEDIUM: Potentially problematic in specific conditions
- 🟢 LOW: Safe, but note for documentation

## Output Format
For each issue found:
1. File:line reference
2. Severity rating
3. What the risk is (cite medical basis where relevant)
4. Specific fix

Also output a summary score: PASS / WARN / FAIL for WCAG 2.3.1 compliance.
