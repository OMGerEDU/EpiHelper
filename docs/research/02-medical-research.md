# Photosensitive Epilepsy — Medical Research Summary

_Research compiled for EpiHelper project — April 2026_
_Sources: Harding & Jeavons (1994), Wilkins (1995/2005), Kasteleijn-Nolst Trenité (1989/2012), ILAE, WCAG Working Group_

---

## 1. Prevalence

| Population | PSE Rate |
|---|---|
| General population | ~1 in 4,000 (0.025%) |
| All epilepsy patients | 2–3% purely photosensitive; 5% show EEG PPR |
| Juvenile myoclonic epilepsy (JME) | **30–40%** — highest risk syndrome |
| Childhood absence epilepsy | 10–20% |

**Demographics:**
- Peak onset: **ages 7–19** (highest at 12–14)
- Sensitivity usually decreases after age 25–30
- Females overrepresented in youth (60%); sex ratio equalizes in adulthood
- Strong genetic component — 10–18% prevalence in first-degree relatives

---

## 2. Neurological Mechanism

1. Repetitive visual stimulation → synchronized oscillation in V1 via thalamocortical relay
2. In PSE: GABAergic inhibition is insufficient → oscillation amplifies (photoparoxysmal response / PPR)
3. PPR propagates via corpus callosum → generalized ictal discharge → seizure

**EEG PPR Grades (Waltz 1992):**
- Grade 1–2: Occipital spikes only (subclinical)
- Grade 3: Generalized, no clinical signs
- Grade 4: Generalized + clinical symptoms ← clinically relevant

---

## 3. Seizure Trigger Parameters

### Flash Frequency (most critical)

```
DANGER ZONE:     3–30 Hz
PEAK DANGER:     15–25 Hz  ← highest PPR probability
WCAG THRESHOLD:  3 Hz      ← conservative lower bound
ABOVE 30 Hz:     Risk diminishes substantially
```

> **Important**: 3 Hz is a *regulatory* threshold, not a biological safety guarantee.
> Highly sensitive individuals can seize below 3 Hz.

### Luminance Contrast

- Michelson contrast **>20%** = lower bound of risk
- Dark room = higher risk (dilated pupils → more retinal illuminance)
- Always recommend well-lit environments

### Color — The Red Problem

- **Saturated red flickering** is 2–3× more epileptogenic than other colors at same frequency/contrast
- Mechanism: L-cone photoreceptors (fovea-dense) + magnocellular pathway → thalamocortical loop
- Red-blue alternation is especially dangerous (Pokémon incident: ~12 Hz red/blue)
- Red flashes flagged at risk as low as **3 Hz** (lower than general flash threshold)

### Visual Field Size

- Stimuli subtending **>10° of visual angle** significantly increase risk
- Full-screen flash at normal viewing distance covers **30–50°** — extremely dangerous
- Doubling screen distance quarters the subtended angle

### Spatial Patterns (independent of flicker)

- High-contrast gratings at **3–8 cycles/degree** are epileptogenic even when static
- Radial patterns, spirals, checkerboards are particularly potent
- Risk is **multiplicative** across all dimensions

---

## 4. WCAG 2.3.1 — Scientific Origins

The 3-flash/second rule comes from:
1. **ITC Guidelines (UK, 1993/1994)** — Harding & Jeavons, first broadcast standard
2. **Harding & Binnie (2002)** — formal analysis for UK broadcast regulators
3. **OFCOM Broadcasting Code (2005)** → adapted by W3C WAI for WCAG 2.0 (2008)

**WCAG 2.3.1 thresholds:**
```
General flash:  ≤3 flashes/sec, area < 25% of 10° visual field
                = 341×256px at 1024×768 reference resolution
Red flash:      Same frequency limit, separately prohibited
```

---

## 5. Documented Seizure Incidents

### Pokémon Incident — Japan, Dec 16, 1997
- **685 children hospitalized**; ~5,000 with symptoms
- Cause: red/blue alternating flashes at ~**12 Hz** for ~4 seconds
- Many had no prior epilepsy diagnosis
- Led to Japanese broadcast standards + international awareness

### Twitter Strobe Attack — Dec 2016
- Animated strobing GIF sent to journalist Kurt Eichenwald (disclosed epileptic)
- Triggered grand mal seizure requiring hospitalization
- Perpetrator arrested 2019, **pleaded guilty 2020** under ADA harassment provisions
- First criminal prosecution for web-content-triggered seizure attack

### Epilepsy Foundation Twitter Attack — Nov 2019
- Coordinated attack: hundreds of flashing GIFs sent to @EpilepsyFdn followers
- FBI complaint filed; Twitter criticized for lack of automated detection

---

## 6. Newer Triggers (2018–2025)

| Trigger Type | Risk Level | Notes |
|---|---|---|
| Scroll-parallax effects | Moderate | Relative motion across visual field |
| CSS infinite-loop animations | Moderate–High | May not be caught by PEAT (not purely luminance) |
| Video autoplay (TikTok/Reels/Stories) | **High** | No chance to avert gaze before exposure |
| Shaky-cam / first-person video | Moderate | Vestibular-linked reflex epilepsies |
| VR/AR head-mounted displays | **Unknown/High** | Full visual field + motion-to-photon latency |

---

## 7. Individual Variation Factors

| Factor | Effect on PSE Risk |
|---|---|
| Sleep deprivation (1 night) | **2–3× increase** in PPR likelihood |
| Valproate (medication) | Substantially reduces PPR |
| Levetiracetam (Keppra) | Also reduces photosensitivity |
| Carbamazepine | Minimal effect on photosensitivity |
| Perimenstrual phase (females) | Increased sensitivity |
| Blue-blocking lenses (Zeiss Z1) | Clinical evidence of PPR reduction |
| Covering one eye | **Dramatic risk reduction** (emergency measure) |

---

## 8. Clinical Recommendations (Neurologist Guidance)

**Physical:**
1. Minimum viewing distance: **arm's length (60cm)**; larger screens need more distance
2. **Well-lit rooms always** — never use screens in darkness
3. Monocular viewing (one eye covered) = emergency measure when exposed to danger

**Behavioral:**
4. Avert gaze immediately when flashing begins — don't try to watch through it
5. Disable video autoplay on all platforms
6. No extended gaming in dark rooms without breaks
7. Prioritize sleep hygiene and medication adherence (highest-leverage interventions)

---

## 9. Threshold Reference Card for EpiHelper

```typescript
// From constants.ts — DO NOT CHANGE without WCAG review
MAX_FLASHES_PER_SECOND  = 3      // Hz — WCAG 2.3.1 lower bound
MIN_LUMINANCE_DELTA     = 0.10   // Michelson contrast floor
DANGER_AREA_FRACTION    = 0.25   // 25% of 10° visual field
// At 1024×768 reference: 341×256px

RED_RATIO_THRESHOLD     = 0.8    // R/(R+G+B) — red flash detection
// Red flashes are dangerous at ANY frequency ≥3 Hz
// Peak danger zone: 15–25 Hz
```

---

## 10. Key Research Gaps (Active as of 2025)

1. No validated **real-time browser protection** with clinical evidence — EpiHelper targets this
2. UGC platforms (TikTok, Twitter) largely **unregulated** for PSE content
3. Non-luminance triggers (patterns, motion) **undercounted** in current tooling
4. No tool for **individual threshold mapping** — all guidance is population-based
5. **VR/AR risk** is emerging and unstudied in clinical settings
