# UI/UX Design Guidelines for Epilepsy-Safe Interfaces

_Research compiled for EpiHelper project — April 2026_
_Note: UI/UX research agent hit rate limit. This document compiled from WCAG spec, Epilepsy Foundation guidelines, and medical research cross-reference._

---

## 1. WCAG Success Criteria Relevant to EpiHelper

| SC | Level | Rule |
|---|---|---|
| **2.3.1** | A | No more than 3 flashes/sec; flash area <25% of 10° visual field |
| **2.3.2** | AAA | No flashes at all (stricter — target for EpiHelper's "safe mode") |
| **2.3.3** | AAA | Animation from interactions can be disabled |
| **2.2.2** | A | Pause, Stop, Hide — controls for any moving content lasting >5s |
| **1.4.3** | AA | Minimum 4.5:1 contrast ratio for text |
| **1.4.11** | AA | 3:1 contrast for UI components and graphical objects |

**EpiHelper target**: 2.3.1 (Level A required) + 2.3.3 + 2.2.2 (AAA preferred for browser chrome)

---

## 2. High-Risk UI Components to Avoid/Control

### Critical Risk
| Component | Risk | EpiHelper Response |
|---|---|---|
| Animated GIFs (inline) | **Critical** — uncontrolled frequency | Block/replace with static thumbnail + play button |
| Video autoplay | **Critical** — no user anticipation | Autopause all videos on load |
| Full-screen transitions | **High** | Limit to ≤200ms, use opacity not flash |
| Looping CSS animations | **High** | Inject `prefers-reduced-motion: reduce` CSS |
| Canvas/WebGL animations | **High** | Monitor via CDP screencast; alert/pause |

### Moderate Risk
| Component | Risk | EpiHelper Response |
|---|---|---|
| Carousels/sliders (auto) | Moderate | Force pause; respect reduced-motion |
| Loading spinners | Moderate | Replace with progress bars |
| Parallax scroll effects | Moderate | Disable via CSS injection |
| Marquee/ticker text | Moderate | Pause on reduced-motion |
| Hover animations | Low–Moderate | Shorten duration to ≤100ms |

---

## 3. Safe Color Palette Principles

### Colors to Avoid in Browser Chrome UI
```
❌ Saturated red (#FF0000, #CC0000) — most epileptogenic color
❌ High red-blue contrast combinations
❌ Pure white backgrounds (#FFFFFF) at high brightness — high luminance
❌ High-contrast black/white alternating patterns
```

### Recommended Browser Chrome Palette
```
✅ Muted blues and grays for UI chrome
✅ Soft backgrounds: #F5F5F5 (light) / #1E1E2E (dark)
✅ Accent: #5B8DEF (muted blue) — not pure saturated
✅ Warning states: amber/orange instead of red (#F59E0B)
✅ Error states: deep red-brown (#9B1C1C) not pure red
✅ Success states: muted green (#16A34A)
✅ Flash alert banner: amber background, not red strobe
```

### Contrast Ratios
- All text on backgrounds: minimum **4.5:1** (WCAG AA)
- Large text (18pt+): minimum **3:1**
- Interactive elements: minimum **3:1** border contrast
- Flash alert text: high contrast but not strobing

---

## 4. Animation Guidelines

```css
/* Always respect this in browser chrome CSS */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Safe animation parameters for EpiHelper UI:**
| Parameter | Safe Range | Reasoning |
|---|---|---|
| Duration | 150–300ms | Fast enough to feel snappy; below seizure threshold |
| Frequency | Never loop faster than 3/sec | WCAG 2.3.1 |
| Easing | `ease-out` preferred | Deceleration feels calmer than linear/ease-in |
| Movement distance | <50px for UI chrome | Minimize vestibular stimulation |
| Flash/strobe | **Never** in chrome UI | Zero tolerance |

---

## 5. Browser Chrome UI Design Principles

### Tab Bar
- No animated tab indicators (just static spinner icon for loading)
- Active tab: border highlight, not color flash
- Tab close: instant remove, no animation
- Max tab count visible: limit to prevent cognitive overload

### Address Bar
- Protection badge (🛡): static icon, color change only (green→amber→red)
- **No pulsing or blinking badge states** — use color + text only
- URL suggestions: instant show/hide, no slide animation

### Flash Alert Banner
- Use **amber/yellow** background — never red strobe
- **Persistent** (does not auto-dismiss during an alert)
- Two states: `warning` (amber) and `critical` (orange-red, static)
- Include: severity text + "Pause page" button + "I'm OK" dismiss
- Font size: 14px minimum; clear sans-serif

### Settings Panel
- Group protections by risk level (not alphabetically)
- Toggle switches: animated state change <100ms
- Labels: plain English ("Block flashing GIFs") not technical ("Disable animated media")
- Include brief explanations of what each protection does

---

## 6. Onboarding UX

### Principles
1. **Don't overwhelm** — default protections are ON; advanced settings are optional
2. **Explain without alarming** — "EpiHelper keeps animations and flashing effects under control"
3. **One-step start** — browser is safe from first launch, no setup required
4. **Trust signals** — show WCAG 2.3.1 compliance badge; mention neurologist-reviewed thresholds

### Recommended First-Run Flow
```
1. Welcome screen (static, no animation)
   "EpiHelper is already protecting you. Here's what's on by default:"
   [Simple list of 4 protections, all checked]
   [One button: "Start browsing"]

2. First flash alert (if triggered on first session)
   Amber banner: "We detected rapid flashing on this page and paused it.
   The page is safe to use now."
   [Dismiss] [Learn more]

3. Settings accessible anytime via ⚙ icon
   No pressure to configure — defaults are safe
```

---

## 7. Accessibility Beyond Epilepsy

EpiHelper users may have co-occurring conditions. Design for:

| Condition | Consideration |
|---|---|
| Migraines | Same triggers as PSE; reduce motion, high contrast, brightness |
| Autism / sensory processing | Reduce visual noise, avoid busy layouts |
| ADHD | Pause autoplay, minimize distracting animations |
| Low vision | High contrast mode, minimum 14px text |
| Screen fatigue | Dark mode, brightness controls, warm tones |

---

## 8. Component Risk Scorecard

```
RISK LEVEL    COMPONENT                      ACTION
──────────────────────────────────────────────────────
CRITICAL  🔴  Animated GIF (autoplay)        Block → static thumbnail
CRITICAL  🔴  Video autoplay                 Autopause
CRITICAL  🔴  Flashing banner/ad             Remove from DOM
HIGH      🟠  CSS animation (looping)        Pause / reduce-motion inject
HIGH      🟠  Canvas/WebGL                   Monitor + alert
HIGH      🟠  Parallax scroll                Disable via CSS
MEDIUM    🟡  Auto-carousel                  Pause
MEDIUM    🟡  Loading spinner                Replace with bar
MEDIUM    🟡  Hover animations >200ms        Shorten
LOW       🟢  Fade transitions <200ms        Allow
LOW       🟢  Static images (no motion)      Allow
SAFE      ✅  Plain text, static UI           No action needed
```

---

## 9. References & Standards

- [WCAG 2.1 Success Criterion 2.3.1](https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold)
- [WCAG 2.1 Success Criterion 2.3.3 — Animation from Interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions)
- Epilepsy Foundation — Photosensitivity and Seizures clinical guidance
- Harding & Jeavons (1994) — Photosensitive Epilepsy (MacKeith Press)
- OFCOM Broadcasting Code — Section 2.14 (Flashing images)
- CSS `prefers-reduced-motion` — MDN Web Docs
