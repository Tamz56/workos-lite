# ASTRO-ARCH-001 — Calculation, Interpretation, Time-State and Authority Architecture Baseline

* **Document Date**: 2026-08-19
* **Work Type**: Docs-only (No code, UI, database, dependency, or configuration changes)
* **Project Area**: Astro Strategy Lab
* **Document Class**: Current-lineage architecture authority baseline (new)

---

## Status

```text
DOCUMENT_STATUS=CURRENT_LINEAGE_AUTHORITY_BASELINE
WORK_TYPE=DOCS_ONLY
ROADMAP_SEQUENCE_CHANGED=NO
```

This document is the **first current-lineage architecture authority baseline** for Astro Strategy Lab. It establishes the authority boundaries that `ASTRO-SOURCE-001`, `ASTRO-TAXONOMY-001`, `ASTRO-CALC-001`, and `ASTRO-VALID-001` must satisfy before they can proceed.

This document is:

- **not** implementation authorization;
- **not** runtime implementation authority;
- **not** a formula, ephemeris, house-system, zodiac-mode, or ayanamsha decision;
- **not** a dependency or license decision.

---

## 1. Document Status and Authority

This baseline registers architectural authority boundaries only. It does not compute, render, validate, interpret, or decide.

- **What it authorizes**: the authority hierarchy, layer separation, time-state contract, calculation snapshot contract, authority invariants, prohibited paths, and downstream entry conditions.
- **What it does not authorize**: any runtime component, any formula, any ephemeris or house-system selection, any zodiac/ayanamsha value, any dependency, or any license path.

Any downstream document (`ASTRO-SOURCE-001`, `ASTRO-TAXONOMY-001`, `ASTRO-CALC-001`, `ASTRO-VALID-001`) must cite this baseline and satisfy its contracts. A downstream document cannot weaken an invariant recorded here.

---

## 2. Purpose and Scope

Astro Strategy Lab is the **Personal Strategic Timing Advisor / Explainable Strategic Decision Workspace**. To keep its guidance explainable and safe, the system must separate who may create facts from who may interpret them, and must keep time unambiguous.

This baseline exists to:

1. define the authority hierarchy that governs every calculation-to-explanation flow;
2. separate fact layers from interpretation and decision layers;
3. fix the time-state contract so the system never conflates "what the user selected", "what was actually calculated", and "when the result was produced";
4. define the calculation snapshot and validation record contracts so downstream consumers read one immutable, versioned Calculation Snapshot plus its separate Validation Record;
5. state the authority invariants and the prohibited paths that must never be introduced.

---

## 3. Evidence Classification and Inputs

### 3.1 Evidence classes

Every material claim in the Astro authority lineage carries exactly one of the following classes:

| Evidence Class | Meaning |
| :--- | :--- |
| **Current-Lineage Authority** | A current-lineage document accepted as authority for its stated scope. |
| **Historical Repository Finding** | Something found in the repository or historical documents; recorded as a compatibility constraint, not as architecture authority. |
| **User-Provided Evidence** | Detail observed in screenshots or usage reported by the user; high signal, not proof. |
| **Vendor-Described Evidence** | Capability or behavior described by a vendor; may be accurate, not independently verified. |
| **Architecture Decision** | A decision made in this document for the Astro architecture. |
| **Open Question** | A question deliberately deferred; no decision is made. |

Product observations and existing runtime behavior must not be upgraded into architecture authority without justification. Runtime implementation is authority only when a current-lineage authority document explicitly establishes it.

### 3.2 Input classification

| Input document | Classification | Role in this baseline |
| :--- | :--- | :--- |
| `astro-market-001a-thai-astrology-competitor-evidence-and-positioning-addendum.md` | Current-Lineage Authority | Evidence classification framework; Calculation/Interpretation Authority; roadmap sequence |
| `qa-astro-market-001a-...addendum.md` | Current-Lineage Authority | QA verification of the above |
| `astro-sky-001-explainable-planetarium-and-multi-house-visualization-capability-definition.md` | Current-Lineage Authority | Authority flow, four time fields, lateral post-validation placement |
| `qa-astro-sky-001-...capability-definition.md` | Current-Lineage Authority | QA verification of the above |
| `astro-real-app-121-strategic-timing-auspicious-window-definition-and-integration-plan.md` | Historical Repository Finding | Compatibility constraints: layer separation, confidence vocabulary, source layers |
| `astro-real-app-122-strategic-timing-decision-resolution-and-ui-data-contract-plan.md` | Historical Repository Finding | Compatibility constraints: timezone preservation, ISO 8601, no auto-pruning, recovery flow |
| Existing repository source (e.g., `astroRealAppThaiHouseMappingAdapter.ts`, `astroRealAppTypes.ts`) | Historical Repository Finding | Compatibility constraints only; not architecture authority |

---

## 4. Authority Hierarchy

The authority hierarchy is ordered so that each layer may consume the outputs of the layers above it, and may never impersonate them.

```text
1. Source Authority          — which inputs are admissible and what they are allowed to prove
2. Taxonomy Authority        — canonical identities and controlled vocabulary
3. Calculation Authority     — the only producer of calculated facts
4. Validation Authority      — validates calculated facts before interpretation
5. Knowledge Authority       — curated reference knowledge
6. Rule Authority            — rule systems that derive findings under a stated rule system
7. Explanation AI            — interprets validated facts and provenance
8. Strategic Guidance layer  — scenario comparison, decision history, human approval
9. Human Decision Authority  — the final decision authority
```

Definitions:

- **Source Authority**: establishes the admissible source register and the evidence class of each source. A source that is only vendor-described or user-provided must not be treated as a formula authority.
- **Taxonomy Authority**: establishes canonical identities and versioned vocabulary (strategic states, evidence classes, time/location concepts, house and zodiac terminology). It prevents the same concept from carrying conflicting names or being collapsed into one score.
- **Calculation Authority**: the only layer allowed to produce calculated facts. It produces a versioned deterministic calculation snapshot. There is no prompt-only path and no renderer-derived path.
- **Validation Authority**: validates calculated facts before any interpretation consumes them. It evaluates calculation consistency and interpretation accuracy separately.
- **Knowledge Authority**: curated reference knowledge; it may be cited in explanation but does not compute.
- **Rule Authority**: rule systems that transform facts into rule-derived findings under an explicitly stated rule system and version.
- **Explanation AI**: receives validated calculated facts, authorized rule-derived findings, permitted knowledge context, and provenance. It interprets these inputs; it does not compute charts or transits and cannot create calculated facts. The exact context-selection mechanism is downstream implementation work; not all knowledge or all rules are automatically injected into every request.
- **Strategic Guidance layer**: combines validated facts, explanation, personal context, scenario comparison, and decision history; it always defers to human approval for high-impact recommendations.
- **Human Decision Authority**: the final authority. The system never decides for the user.

---

## 5. Layer Separation

The following layers must remain distinct and must not be conflated:

1. **source evidence** — the raw admissible inputs and their evidence classes;
2. **taxonomy / canonical identities** — controlled vocabulary and identity versions;
3. **calculated facts** — deterministic outputs of the Calculation Authority;
4. **validated calculated facts** — calculated facts that passed Validation Authority;
5. **rule-derived findings** — findings derived from facts under a stated rule system;
6. **interpretation** — explanation of validated facts and findings with reasoning and uncertainty;
7. **strategic guidance** — scenario comparison and behavioral suggestions;
8. **user decision / outcome** — the user's own decision and recorded outcome.

Required separation rules:

- A calculated fact is not an interpretation, and an interpretation is not a calculated fact.
- A rule-derived finding is not a calculated fact; it depends on a stated rule system.
- Interpretation may consume validated calculated facts, authorized rule-derived findings, and permitted knowledge context, but it never computes or creates calculated facts.
- Strategic guidance is not a decision; the user makes the decision.
- No single numeric score may collapse source, fact, rule, interpretation, and guidance into one hidden number.
- Confidence is qualitative (`Higher context`, `Moderate context`, `Limited context`) and never equals a success probability or a guarantee.

---

## 6. Time-State Contract

### 6.1 Time values

Four time values have separate meanings:

| Field | Meaning |
| :--- | :--- |
| `referenceNow` | The current system reference instant, used only for explicit defaults, comparison, and "return to now" behavior. |
| `selectedEventTime` | The date and time intentionally selected by the user, including its timezone/location context. |
| `calculationTime` | The normalized effective instant actually supplied to the Calculation Authority for the requested chart or transit. It is derived from the user selection under an explicit timezone policy. It is not the timestamp when the result was generated. |
| `calculatedAt` | The audit timestamp recording when the Calculation Authority produced the versioned result or snapshot. |

### 6.2 Timezone / location identity

- The timezone identity must be stored with the selected time and preserved without distortion (ISO 8601 serialization).
- Observer location (latitude, longitude, elevation) and coordinate-frame identity are separate conceptual fields and must be recorded when a location-dependent calculation is requested.

### 6.3 Persistence boundaries

- All four time values are distinct; no timer, remount, refresh, or background update may silently overwrite `selectedEventTime`.
- Only an explicit user action may return the selection to now.
- `calculationTime` must correspond to the effective instant actually used by Calculation Authority.
- `calculatedAt` records processing/audit time and must not replace `calculationTime`.
- The persistence policy must state where each time value is stored and how it survives reload.
- PDF, history, provenance, and rendered output must reference the same calculation snapshot and effective calculation time.

---

## 7. Calculation Snapshot and Validation Record Contracts

The Calculation Authority produces a **Calculation Snapshot**; the Validation Authority produces a separate **Validation Record**. These two artifacts must not be conflated.

### 7.1 Calculation Snapshot

The **Calculation Snapshot** is the immutable output of the Calculation Authority. It is the single source of truth for calculated facts consumed downstream.

Conceptual contents:

| Concept | Meaning |
| :--- | :--- |
| Snapshot identity | A stable identity distinguishing this snapshot from every other snapshot. |
| Snapshot version | Each immutable revision carries a version; any change produces a new version. |
| Request identity | Each calculation carries a request ID linking the request, the snapshot, and downstream consumers. |
| Calculation time | The effective instant actually calculated (`calculationTime`). |
| `calculatedAt` | The audit timestamp recording when the snapshot was produced. |
| Calculation engine and data version | The engine identity and the data version used are recorded. |
| Calculation-policy identities/versions | House-system policy, zodiac mode, and ayanamsha identity/version (when applicable) are recorded. |
| Calculated facts | The deterministic calculated outputs of the Calculation Authority. |
| Calculation provenance | The sources, rules, and versions that contributed to the snapshot are recorded. |

Once created, the Calculation Snapshot is immutable. The Validation Authority must not modify it.

### 7.2 Validation Record

The **Validation Record** is a separate immutable artifact owned by the Validation Authority. It records the outcome of validating an exact Calculation Snapshot.

Conceptual contents:

| Concept | Meaning |
| :--- | :--- |
| Validation record identity | A stable identity for this validation record. |
| Exact snapshot identity/version | The identity/version of the exact immutable Calculation Snapshot being validated. |
| Validation policy/version | The validation policy and its version (when applicable). |
| Validation state | The outcome state of validation (the exact vocabulary/schema is deferred downstream). |
| Validation evidence/reference | The evidence or reference supporting the validation outcome. |
| Validation audit timestamp | When the validation outcome was recorded. |
| Validation provenance | The provenance required to understand the validation result. |

The Validation Authority must not mutate the Calculation Snapshot; it records its outcome in the Validation Record instead.

### 7.3 Relationship and identity binding

```text
Calculation Snapshot
← referenced by —
Validation Record
```

The Validation Record must identify the exact Calculation Snapshot identity/version it validates. A Validation Record produced for one snapshot/version must not authorize a different snapshot/version. A digest/hash may later strengthen this identity binding, but ARCH-001 does not require a cryptographic hash, select a hashing algorithm, or define an implementation schema; the mandatory architectural requirement is exact artifact identity/version binding.

Rules:

- Downstream layers (renderer, explanation, strategy) read the snapshot; they do not recompute it.
- Rendering configuration is kept separate from calculated values and cannot alter calculation provenance.
- Interpretation cannot mutate the snapshot; it may only annotate it.
- A Calculation Snapshot is admissible to Explanation or Strategic Guidance only when an accepted/passed Validation Record exists for that exact immutable snapshot.
- Validation-record existence alone is insufficient: pending, failed, rejected, or inconclusive states remain inadmissible.
- Strategic guidance cannot override validation.
- The exact validation-state vocabulary/schema is downstream work; ASTRO-ARCH-001 defines the semantic requirement only (a non-accepted state is not admissible).

---

## 8. Authority Invariants

The following invariants are mandatory for every current and future Astro component:

1. **AI is not Calculation Authority** — the AI model never computes a chart or transit and cannot create calculated facts. Explanation AI must not bypass Validation Authority, Knowledge Authority, or Rule Authority.
2. **Renderer / UI geometry is not Calculation Authority** — screen coordinates and rendered geometry cannot become calculated facts.
3. **Prompt text cannot create calculated facts** — there is no prompt-only path to a chart result.
4. **Interpretation cannot mutate validated facts** — explanation annotates; it does not rewrite the snapshot.
5. **User interaction may request recalculation but cannot silently mutate a validated snapshot** — a new request produces a new version; it never edits the accepted one.
6. **Validation occurs before interpretation and does not mutate the snapshot** — Calculation Authority owns calculated facts and immutable Calculation Snapshots; Validation Authority owns validation outcomes/records, evaluates the immutable snapshot, and records its outcome in a separate Validation Record; no explanation or strategy output may consume an unvalidated snapshot.
7. **Human remains final decision authority** — the system may suggest, explain, and compare, but it never decides for the user.

---

## 9. Prohibited Paths / Failure Boundaries

The following authority flows are invalid and must never be introduced:

- Source evidence → AI interpretation without a calculation snapshot (bypasses Calculation and Validation).
- AI generating a chart from model memory instead of from a validated snapshot (prompt-only path).
- Explanation AI bypassing Validation, Knowledge, or Rule Authority by consuming raw sources or unauthorized rule outputs without provenance.
- Explanation AI creating calculated facts or presenting rule-derived findings as if they were calculated facts.
- Renderer geometry → calculated fact (screen output promoted to authoritative value).
- Interpretation layer mutating the validated snapshot.
- Validation Authority mutating an existing Calculation Snapshot to attach its result.
- Calculation Authority manufacturing its own accepted validation result.
- A Validation Record for one snapshot/version being reused to authorize a different snapshot/version.
- Strategic guidance overriding validation or presenting a non-accepted validation state as accepted.
- A timer, remount, refresh, or background update silently resetting `selectedEventTime` to now.
- A UI-derived instant silently becoming `calculationTime` without an explicit timezone policy.
- A house system, zodiac mode, or ayanamsha being inferred from a user-provided screenshot.
- Any dependency or license decision being treated as approved without an explicit later review.

---

## 10. Downstream Contracts

The following stages must establish the listed contracts next:

### ASTRO-SOURCE-001
- Authoritative source register with, for each source: name, URL or path, evidence class, what it supports, what it does not support, and freshness/revalidation status.
- Admissibility rules: which sources may enter the calculation lineage and under what evidence class.
- A rule that vendor-described or user-provided evidence is never treated as formula authority or independent validation.

### ASTRO-TAXONOMY-001
- Canonical identities and a versioned vocabulary covering strategic states, evidence classes, time/location concepts, and house/zodiac terminology.
- A rule that strategic states must not be collapsed into a single "good day percentage".
- Identity/version discipline so each canonical term has a stable, versioned definition.

### ASTRO-CALC-001
- Versioned deterministic calculation implementing the Calculation Snapshot Contract (Section 7).
- Produces the immutable versioned Calculation Snapshot with request identity, engine/data version, policy version, calculation provenance, and calculated facts.
- No prompt-only path; no renderer-derived path; no UI-derived time path without an explicit timezone policy.
- Does not create validation results or references; validation is owned by Validation Authority.

### ASTRO-VALID-001
- Validation before interpretation; calculation consistency and interpretation accuracy evaluated separately.
- Test vectors independent of screen geometry; timezone and historical-offset cases; transition cases; angle-versus-cusp regression; house-policy version comparison.
- Produces a separate Validation Record that references the exact Calculation Snapshot identity/version, records validation state, validation evidence/reference, and validation policy/version (as applicable), and enables downstream admissibility checking. Exact executable schema remains deferred.

---

## 11. Roadmap Integrity

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

ASTRO-SKY remains a **lateral post-validation capability**:

```text
ASTRO-CALC → ASTRO-VALID → ASTRO-KNOW → ASTRO-RULE
                         ↘ ASTRO-SKY foundation

ASTRO-RULE → ASTRO-EXPLAIN → ASTRO-STRATEGY
```

- ASTRO-SKY does not replace or bypass KNOW or RULE.
- ASTRO-SKY remains deferred (`IMPLEMENTATION_STATUS=DEFERRED`), blocked by ASTRO-CALC-001 and ASTRO-VALID-001.
- `ASTRO-CALC-001` and `ASTRO-VALID-001` are **necessary blocking prerequisites, not sufficient implementation authorization**. Their completion alone does not authorize ASTRO-SKY implementation.
- All entry conditions defined by ASTRO-SKY-001 remain applicable, including relevant source/taxonomy decisions, calculation snapshot contract readiness, licensing decisions, scoped prototype/test-vector planning, and explicit human authorization.
- This baseline does not reorder, insert, or remove any stage of the roadmap.

---

## 12. Open Questions (Deferred)

The following are deliberately deferred; no decision is made in this baseline:

- Canonical confidence vocabulary and its exact wording (candidate vocabulary from historical artifacts: `Higher context` / `Moderate context` / `Limited context`).
- The exact persistence key/envelope/hydration contract for local-first storage.
- Which source layers are admissible in V1 and under which evidence class.
- The exact Thai terminology and its human review workflow.
- Whether location-dependent calculation is required in V1 and at what precision.
- Any ephemeris, house-system, zodiac-mode, or ayanamsha selection.
- Any dependency or license selection (Swiss Ephemeris, Stellarium Web Engine, Three.js remain candidate references).

---

## 13. Non-Goals

- no code changes;
- no UI changes;
- no database changes;
- no dependencies;
- no calculation formulas;
- no ephemeris selection;
- no house-system selection;
- no zodiac/ayanamsha decision;
- no Thai astrology formula inference;
- no implementation authorization.

---

## 14. Decision Summary

- **Authority hierarchy** established: Source → Taxonomy → Calculation → Validation → Knowledge → Rule → Explanation AI → Strategic Guidance → Human Decision.
- **Layer separation** established: source evidence, taxonomy identities, calculated facts, validated facts, rule findings, interpretation, strategic guidance, user decision.
- **Time-state contract** established: `referenceNow`, `selectedEventTime`, `calculationTime`, `calculatedAt` are distinct; timezone/location identity is preserved.
- **Calculation snapshot contract** established: immutable, versioned, request-identified, provenanced Calculation Snapshot owned by Calculation Authority.
- **Validation record contract** established: a separate immutable Validation Record owned by Validation Authority, bound to the exact snapshot identity/version.
- **Seven authority invariants** established, including: AI is not Calculation Authority and human remains final decision authority.
- **Prohibited paths** documented; no downstream document may weaken them.
- **Roadmap unchanged**: ASTRO-ARCH → … → ASTRO-STRATEGY; ASTRO-SKY remains lateral and deferred.

```text
DOCUMENT_STATUS=CURRENT_LINEAGE_AUTHORITY_BASELINE
WORK_TYPE=DOCS_ONLY
ROADMAP_SEQUENCE_CHANGED=NO
```

---

*End of ASTRO-ARCH-001. Docs-only architecture baseline; no runtime artifacts, formulas, dependencies, or licenses established.*
