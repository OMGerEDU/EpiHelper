# Existing Epilepsy-Safe Browsers & Tools

_Research compiled for EpiHelper project — April 2026_

---

## Key Finding for EpiHelper

**A native Electron app is architecturally superior to any browser extension** because it can access raw video frame data without CORS restrictions, enabling true Harding-class luminance analysis. No consumer product currently does this.

---

## Existing Products

| Product | Type | Key Features | Limitations |
|---|---|---|---|
| **Epilepsy Blocker** | Browser extension | CSS animation pause, GIF blocking, contrast control | No video/canvas analysis; maintenance spotty |
| **Seizure Guard** (variants) | Browser extension | `prefers-reduced-motion` injection, basic flash detection | DOM-only; can't read cross-origin video pixels |
| **Dark Reader** | Browser extension | Dark mode, contrast reduction | Not epilepsy-specific; no flash detection |
| **NoFlash / FlashStopper** | Legacy extensions | Blocked Flash plugin content | Obsolete (Flash is dead) |
| **Microsoft Edge "Limit Distracting Animations"** | Browser setting | Suppresses CSS-based animations | Not epilepsy-targeted; no luminance analysis |
| **PEAT (MS + Trace Center)** | Desktop tool | WCAG 2.3.1 compliant video analysis | Offline only; analyzes pre-recorded content |
| **Harding Flash & Pattern Analyser** | Commercial tool | Clinical-grade luminance + pattern analysis | Expensive; broadcast industry tool |

## Critical Gap: Video & Canvas

Every existing consumer tool **completely fails to protect against**:
- YouTube, TikTok, Instagram Reels autoplay
- WebGL and canvas-based animations
- Dynamically generated content

**Why**: Browser CORS security prevents JavaScript extensions from reading cross-origin video pixels. EpiHelper bypasses this via `Page.startScreencast` (CDP) — a native Electron-only capability.

## Open Source Landscape

- Scattered GitHub repos (GIF control, CSS injectors) — none maintained or polished
- W3C working group repos — spec-only
- **No maintained open source epilepsy browser exists** — EpiHelper fills this gap

## Detection Methods in the Wild

| Method | Used by | Coverage |
|---|---|---|
| CSS/DOM heuristics | All extensions | CSS animations, `<img>` GIFs only |
| URL blocklists | Some extensions | Known bad domains; misses new content |
| Pixel luminance sampling | PEAT, Harding FPA | Video files (offline only) |
| ML classifiers | Meta (internal, 2022) | Research/production at Meta; not open |

## User Reception (Community Feedback)

- **GIF blocking**: universally praised as most impactful single feature
- **Video exposure**: top unmet need — "extensions don't help with YouTube"
- **False positives**: common complaint — legitimate animations being blocked
- **Maintenance abandonment**: most extensions stop working after browser updates

---

## Implications for EpiHelper

1. **Priority 1**: GIF + CSS animation blocking (high user demand, well understood)
2. **Priority 2**: Real-time video frame analysis via CDP screencast (unique capability, high impact)
3. **Priority 3**: Pattern detection (spatial frequency) — no consumer tool does this
4. **Differentiator**: Full WCAG 2.3.1 Harding-class analysis in a free, open-source browser
