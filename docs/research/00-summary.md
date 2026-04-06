# EpiHelper Research Summary

_For the team — April 2026_

---

## TL;DR — Why EpiHelper Matters

| Fact | Implication |
|---|---|
| 1 in 4,000 people are photosensitive | Large addressable population |
| 685 children hospitalized from one TV episode (1997) | Scale of harm is real |
| No consumer tool protects against video/canvas | EpiHelper fills a genuine gap |
| CORS blocks extensions from reading video pixels | Only native Electron can do this |
| TikTok, Reels, YouTube autoplay = highest-risk modern use case | Core protection target |
| Sleep-deprived users are 2–3× more sensitive | Protection should be always-on by default |

---

## Key Numbers

```
3 Hz          — WCAG flash threshold (danger at and above)
15–25 Hz      — peak danger zone (highest PPR probability)
341×256 px    — dangerous flash area at 1024×768 (25% of 10° visual field)
1 in 4,000    — photosensitive in general population
30–40%        — photosensitive among juvenile myoclonic epilepsy patients
2–3×          — extra risk when sleep-deprived
2–3×          — extra risk from saturated red vs other colors
685           — children hospitalized in 1997 Pokémon incident
```

---

## Market Gap (Competitive Analysis)

```
EXISTING TOOLS          COVERS                    MISSES
───────────────────────────────────────────────────────────
Browser extensions      CSS animations, GIFs       Video, Canvas, WebGL
PEAT (Microsoft)        Pre-recorded video         Real-time; offline only
OS reduced-motion       System animations          Web content entirely
Harding Analyser        Broadcast video (offline)  Web; too expensive ($)
Platform ML (Meta)      Some video (internal)      Not open; not cross-platform

EPIHELPER (target)      ALL of the above ✓         Nothing (full coverage)
```

---

## What to Build (Priority Order)

| Priority | Feature | Medical Basis |
|---|---|---|
| 1 | GIF blocking | Uncontrolled frequency; top user request |
| 2 | CSS `prefers-reduced-motion` injection | Covers most CSS animations |
| 3 | Video autopause | Autoplay = no chance to avert gaze |
| 4 | Real-time flash detection (CDP screencast) | Only tool in market; Harding-class |
| 5 | Red channel flash detection | 2–3× more dangerous than general flash |
| 6 | Pattern detection (spatial frequency) | Independent epileptogenic trigger |
| 7 | Brightness/contrast overlay | Individual threshold accommodation |

---

## Research Documents

- [01-existing-tools.md](./01-existing-tools.md) — Competitive analysis, market gaps
- [02-medical-research.md](./02-medical-research.md) — Full medical literature review
- [03-uiux-guidelines.md](./03-uiux-guidelines.md) — Design guidelines, component risk scorecard

---

## Key Design Decisions Supported by Research

| Decision | Research Support |
|---|---|
| Default all protections ON | Sleep deprivation & individual variation = unpredictable risk; safer to default safe |
| Amber (not red) for alert UI | Red itself is epileptogenic; never use red flash/strobe in UI chrome |
| Autopause video, require user click to play | Autoplay = no anticipation window; clinical recommendation |
| WCAG 2.3.1 exact thresholds in code | Derived from Harding/Wilkins/OFCOM — scientifically validated |
| Open source, free | Market gap: no accessible free tool; epileptics often have limited income |
| Show "page paused" not silent blocking | Users need to understand what happened to avoid panic |
