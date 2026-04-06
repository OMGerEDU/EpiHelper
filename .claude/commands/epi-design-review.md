# Epilepsy-Safe Design Review

Review a UI component, screen, or design spec for epilepsy safety and accessibility best practices.

## Usage
`/epi-design-review [component name or file]`

## Review Checklist

### Color Safety
- [ ] No saturated red in any interactive or animated element
- [ ] No high red-blue contrast alternation
- [ ] Flash alert UI uses amber/orange — NOT red strobe
- [ ] Background colors: muted, not pure white or pure black
- [ ] All text meets WCAG 4.5:1 contrast ratio (3:1 for large text)

### Animation Safety
- [ ] No animation loops faster than 3 Hz
- [ ] All animations respect `prefers-reduced-motion: reduce`
- [ ] Transition durations: 150–300ms (not looping)
- [ ] Easing: `ease-out` preferred (decelerating = calmer)
- [ ] No spinning loaders — use progress bars instead
- [ ] Parallax/scroll effects disabled or have off toggle

### Component Risk Check
- [ ] GIFs: static thumbnail + explicit play button
- [ ] Videos: autopaused, user must click to play
- [ ] Carousels: manual-only (no auto-advance)
- [ ] Banners/alerts: static color change only (no blink/pulse)
- [ ] Loading states: progress bar or skeleton screen

### Browser Chrome Specific (EpiHelper UI)
- [ ] Protection badge: static icon + color change only (no pulse)
- [ ] Flash alert banner: amber background, persistent, clear dismiss
- [ ] Settings panel: plain English labels, grouped by risk level
- [ ] Tab indicators: no animation for loading (static spinner icon only)

### Onboarding UX
- [ ] Default protections are ON from launch — no setup required
- [ ] First-run explanation is calm and non-alarming
- [ ] "Start browsing" is one click from open

## Output Format
- Risk scorecard for each section above
- Top 3 priority fixes
- Any elements that need WCAG 2.3.1 formal analysis
- Recommended color/animation values for flagged elements
