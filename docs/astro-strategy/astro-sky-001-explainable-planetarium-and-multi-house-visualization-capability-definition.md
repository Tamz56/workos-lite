# ASTRO-SKY-001 — Explainable Planetarium and Multi-House Visualization Capability Definition

* **Document Date**: 2026-08-19
* **Work Type**: Docs-only (No code, UI, database, dependency, configuration, or asset changes)
* **Project Area**: Astro Strategy Lab
* **Document Class**: Current-lineage capability definition (new)

---

## Status Block

```text
CAPABILITY_STATUS=APPROVED_FOR_ROADMAP
IMPLEMENTATION_STATUS=DEFERRED
BLOCKED_BY=ASTRO-CALC-001, ASTRO-VALID-001
ROADMAP_SEQUENCE_CHANGED=NO
```

This document is **current authority only for capability registration and architectural boundaries**. It is:

- **not** Calculation Authority;
- **not** runtime implementation authority;
- **not** approval of a library, dependency, license, formula, house system, zodiac system, or ayanamsha.

---

## 1. Document Status and Authority

This document registers the **ASTRO-SKY-001 — Explainable Planetarium and Multi-House Visualization** capability and defines its architectural boundaries. Its authority is narrow and intentional:

- **What it authorizes**: the existence of the capability on the roadmap, its boundary invariants, its evidence classification, and its entry conditions for a future implementation gate.
- **What it does not authorize**: any runtime renderer, any calculation engine, any house-system or zodiac-mode policy, any ayanamsha value, any dependency, or any license decision.

`IMPLEMENTATION_STATUS=DEFERRED` means registration is accepted now, but no implementation may begin. Implementation cannot start until the blocking stages recorded in `BLOCKED_BY` are accepted and the entry conditions in Section 11 are met. This document is not runtime implementation authority and must not be cited to justify building, installing, or licensing anything.

---

## 2. Purpose and Product Positioning

ASTRO-SKY is an **explainable visualization capability** supporting the **Personal Strategic Timing Advisor / Explainable Strategic Decision Workspace** positioning recorded in ASTRO-MARKET-001A. ASTRO-STRATEGY-001 remains a planned downstream authority and is not treated as an already accepted specification by this document.

It provides a visual surface — a planetarium and multi-house chart view — for already-validated calculation results, so that explanations and strategic guidance can be anchored to a transparent, inspectable rendering rather than an opaque score.

ASTRO-SKY must **not** become:

- a fortune generator;
- a deterministic predictor;
- Calculation Authority;
- an image-derived calculation system;
- a replacement for strategic explanation or human decision authority.

The human remains the decision authority. The visualization supports explanation; it does not decide, predict, or compute.

---

## 3. Evidence Context and Classification

### 3.1 User-provided visualization evidence

```text
https://myhora.com/astronomy/planetarium/
```

Classification:

```text
User-Provided Product Evidence
User-Provided Visualization Evidence
```

The supplied page description and screenshot:

- demonstrate an **interaction and visualization pattern**;
- **do not** prove the underlying formula;
- are **not** independent calculation validation;
- are **not** authority for Thai house calculation;
- are **not** permission to copy source code, assets, UI, or visual identity;
- were **not** independently revalidated by this documentation task.

The screenshot file itself is **not** copied or included in the repository.

### 3.2 ASTRO-SKY proposal classification

```text
Product Hypothesis
Approved Roadmap Capability
```

The capability is registered as an approved roadmap capability whose concrete design remains a hypothesis until calculation, validation, source, and taxonomy authorities are available.

### 3.3 Repository source classification

Any relevant source discovered in the repository is described only as:

```text
Repository Search Finding — Runtime Not Revalidated
```

Repository source is **not** classified as vendor-described evidence. It records that matching implementation exists in the codebase; it does not establish runtime behavior, formula correctness, or architectural authority for this capability.

---

## 4. Architectural Boundary

### 4.1 Authority flow

```text
Time and Location Authority
→ Astronomical Ephemeris
→ Coordinate Transformation
→ Astrology Policy Engine
→ Versioned Calculation Snapshot
→ Planetarium Renderer
→ Explanation and Strategy Consumers
```

### 4.2 Required invariants

- The **renderer consumes authoritative values; it does not create them**.
- **Screen coordinates and rendered geometry cannot become calculated facts**.
- **User interaction may request recalculation but cannot silently mutate a validated calculation snapshot**.
- **Calculated facts, rule-derived findings, visualization state, AI interpretation, and strategic guidance remain distinct layers**.

These invariants preserve the Calculation/Interpretation Authority boundary recorded in ASTRO-MARKET-001A Section 9: no prompt-only path, versioned deterministic calculation, validation before interpretation, and AI receiving calculated facts and provenance only.

---

## 5. Roadmap Relationship

The authoritative roadmap sequence is preserved unchanged:

```text
ASTRO-ARCH
→ ASTRO-SOURCE
→ ASTRO-TAXONOMY
→ ASTRO-CALC
→ ASTRO-VALID
→ ASTRO-KNOW
→ ASTRO-RULE
→ ASTRO-EXPLAIN
→ ASTRO-STRATEGY
```

ASTRO-SKY is **not** inserted as a replacement stage.

ASTRO-SKY is a **lateral capability** whose foundation may begin only after CALC and VALID:

```text
ASTRO-CALC → ASTRO-VALID → ASTRO-KNOW → ASTRO-RULE
                         ↘ ASTRO-SKY foundation

ASTRO-RULE → ASTRO-EXPLAIN → ASTRO-STRATEGY
ASTRO-SKY may provide a visualization surface for validated calculations,
explanations, and strategic consumers without replacing KNOW or RULE.
```

Clarifications:

- `BLOCKED_BY` means implementation cannot start before **ASTRO-CALC-001** and **ASTRO-VALID-001** are accepted.
- **KNOW and RULE remain required authority stages**; they are not bypassed, reordered, or replaced.
- **Registration now does not authorize implementation now**; `IMPLEMENTATION_STATUS=DEFERRED` holds until Section 11 entry conditions are met.

---

## 6. Conceptual Data Contract

Conceptual fields (no executable schema is created in this task):

- `referenceNow` — the current system reference instant used only for explicit defaults, comparison, and "return to now" behavior.
- `selectedEventTime` — the date and time intentionally selected by the user, including its timezone/location context.
- `calculationTime` — the normalized effective instant actually supplied to the Calculation Authority for the requested chart or transit. It is derived from the user selection under an explicit timezone policy. It is not the timestamp when the result was generated.
- `calculatedAt` — the audit timestamp recording when the Calculation Authority produced the versioned result or snapshot.
- observer latitude, longitude, elevation, and timezone identity.
- coordinate-frame identity.
- zodiac mode.
- ayanamsha identity and version, when applicable.
- Ascendant.
- Descendant.
- MC.
- IC.
- house-system policy identity and version.
- twelve house cusps, where applicable.
- calculation engine and data version.
- validation status and validation reference.
- rendering configuration, kept separate from calculated values.

Required rules:

- **All four time fields have separate meanings**: `referenceNow`, `selectedEventTime`, `calculationTime`, and `calculatedAt` are distinct.
- **`selectedEventTime` cannot be overwritten** by a timer, remount, refresh, or background update.
- **`calculationTime` must correspond to the effective instant actually used by Calculation Authority**.
- **`calculatedAt` records processing/audit time and must not replace `calculationTime`**.
- **Only explicit user action may return the selection to now**.
- **PDF, history, provenance, and rendered output must reference the same calculation snapshot and effective calculation time**.
- **Angles and house cusps are separate fields**; one cannot be derived implicitly from the other.
- **MC must not automatically equal the 10th-house cusp**.
- **IC must not automatically equal the 4th-house cusp**.
- **Renderer settings cannot alter calculation provenance**; rendering configuration is stored separately from the versioned calculation snapshot.

---

## 7. Candidate Visualization Scope

Recorded as **future candidates** (not selections, not approvals):

- date, time, and location selection;
- planets and selected astronomical bodies;
- horizon, ecliptic, celestial-equator, and relevant reference lines;
- tropical and sidereal zodiac visualization;
- explicit ayanamsha display;
- Ascendant, Descendant, MC, and IC;
- pluggable house-system policies;
- Whole Sign, Thai house policy, and Placidus as initial evaluation candidates;
- comparison between house systems;
- calculation provenance and rule-version display;
- enable/disable visualization layers;
- accessibility and Thai-language labels.

Listing a candidate **does not select it as the canonical system or approve its interpretation rules**.

**Thai house policy** remains blocked by **ASTRO-SOURCE, ASTRO-TAXONOMY, ASTRO-CALC, and ASTRO-VALID** work. Its formula must **not** be inferred from the screenshot.

---

## 8. Licensing and Dependency Boundary

Candidate references requiring later review:

```text
Swiss Ephemeris:     https://www.astro.com/swisseph/swephinfo_e.htm
Stellarium Web Engine: https://github.com/Stellarium/stellarium-web-engine
Three.js:            https://github.com/mrdoob/three.js
```

- **No dependency is selected** in this task.
- **No license path is approved** in this task.
- **Swiss Ephemeris AGPL versus Professional License** requires an explicit later architecture and licensing decision.
- **Stellarium code must not be incorporated** without a separate licensing review.
- **Three.js may be evaluated separately** as a rendering candidate.
- This is **not legal advice**, and no implementation may rely on an unresolved license decision.

---

## 9. Validation Requirements Before Implementation

Future validation requirements (none are claimed as performed in this task):

- calculation test vectors independent of screen geometry;
- timezone and historical-offset cases;
- date/month/year transition cases;
- high-latitude and unsupported-house-system behavior;
- tropical/sidereal and ayanamsha comparison;
- angle versus cusp regression tests;
- house-policy version comparison;
- state-persistence tests for selected time;
- cross-reference against approved calculation authorities;
- human review of Thai terminology and house-policy interpretation.

These are recorded as required validation work for the implementation gate. This document does not claim any of them have been performed.

---

## 10. Explicit Non-Goals

- no runtime renderer;
- no planetarium implementation;
- no calculation engine;
- no house-system formula approval;
- no canonical zodiac-mode selection;
- no ayanamsha selection;
- no AI interpretation implementation;
- no dependency installation;
- no license approval;
- no copied competitor UI or assets;
- no roadmap reordering;
- no change to current application routes or components.

---

## 11. Handoff and Future Entry Conditions

Implementation entry requires, at minimum:

- **ASTRO-CALC-001** accepted;
- **ASTRO-VALID-001** accepted;
- calculation snapshot contract approved;
- source and taxonomy decisions available for affected policies;
- licensing decision completed for selected technology;
- scoped prototype and test-vector plan approved;
- explicit human authorization.

Until all conditions are met, `IMPLEMENTATION_STATUS` remains `DEFERRED`.

---

## 12. Source Register and Decision Summary

| Source name | URL / repository path | Evidence class | Supports | Does not support | Freshness / revalidation status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| myhora — Astronomy / Planetarium | `https://myhora.com/astronomy/planetarium/` | User-Provided Product Evidence; User-Provided Visualization Evidence | Demonstrates an interaction and visualization pattern | Does not prove the underlying formula; not independent validation; not authority for Thai house calculation; not permission to copy | Not independently revalidated by this task |
| Existing repository source — `astroRealAppThaiHouseMappingAdapter.ts` | `src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiHouseMappingAdapter.ts` | Repository Search Finding — Runtime Not Revalidated | Records that related implementation exists in the codebase | Does not establish runtime behavior, formula correctness, or architectural authority | Runtime not revalidated |
| Existing repository source — `astroRealAppTypes.ts` | `src/components/workspaces/astro-strategy/real-app/data/astroRealAppTypes.ts` | Repository Search Finding — Runtime Not Revalidated | Records that related implementation exists in the codebase | Does not establish runtime behavior, formula correctness, or architectural authority | Runtime not revalidated |
| Swiss Ephemeris | `https://www.astro.com/swisseph/swephinfo_e.htm` | Candidate Reference | Identified for later licensing review | No dependency selected; no license approved | Requires later review |
| Stellarium Web Engine | `https://github.com/Stellarium/stellarium-web-engine` | Candidate Reference | Identified for later licensing review | Not incorporated; no license approved | Requires later review |
| Three.js | `https://github.com/mrdoob/three.js` | Candidate Reference | May be evaluated separately as a rendering candidate | No dependency selected | Requires later review |

### Decision Summary

- **Capability registered** with narrow authority: registration and architectural boundaries only.
- **Implementation deferred**: blocked by `ASTRO-CALC-001` and `ASTRO-VALID-001`.
- **Roadmap sequence unchanged**: ASTRO-SKY is lateral, post-VALID, and does not replace KNOW or RULE.
- **No policy approved**: no house system, zodiac mode, ayanamsha, dependency, or license decision is made here.

```text
CAPABILITY_STATUS=APPROVED_FOR_ROADMAP
IMPLEMENTATION_STATUS=DEFERRED
BLOCKED_BY=ASTRO-CALC-001, ASTRO-VALID-001
ROADMAP_SEQUENCE_CHANGED=NO
```

---

*End of ASTRO-SKY-001. Docs-only capability definition; no downstream artifacts, routes, components, dependencies, or licenses modified.*
