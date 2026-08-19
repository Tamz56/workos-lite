# QA Record — ASTRO-ARCH-001 — Calculation, Interpretation, Time-State and Authority Architecture Baseline

* **QA Status**: Ready for Human Re-Review
* **Task Identity**: ASTRO-ARCH-001 (Calculation, Interpretation, Time-State and Authority Architecture Baseline)
* **Date**: 2026-08-19
* **Scope**: Docs-only QA of two new files in `docs/astro-strategy/`

---

## 1. QA Scope and Authority

This QA record verifies that the ASTRO-ARCH-001 architecture baseline and its QA record are docs-only, internally consistent, and bounded correctly. It is **not**:

- runtime validation;
- calculation validation;
- implementation approval;
- licensing approval.

The verdict `Ready for Human Re-Review` means the documentation is ready for human review, not that any architecture decision has been executed in code.

---

## 2. Files Reviewed

1. `docs/astro-strategy/astro-arch-001-calculation-interpretation-time-state-and-authority-architecture-baseline.md` — main architecture baseline.
2. `docs/astro-strategy/qa-astro-arch-001-calculation-interpretation-time-state-and-authority-architecture-baseline.md` — this QA record.

No other files were created, modified, staged, or reviewed for change.

---

## 3. Checklist Matrix

| Verification Point | Result | Evidence / Reference |
| :--- | :--- | :--- |
| Exactly two new documentation files | **Passed** | Only the two authorized files under `docs/astro-strategy/` exist as new |
| No runtime modifications | **Passed** | Docs-only; no `src/**`, tests, configs, routes, or dependencies touched |
| Authority hierarchy internally consistent | **Passed** | Main Section 4: ordered Source → Taxonomy → Calculation → Validation → Knowledge → Rule → Explanation AI → Strategic Guidance → Human Decision |
| All four time values distinct | **Passed** | Main Section 6: `referenceNow`, `selectedEventTime`, `calculationTime`, `calculatedAt` have separate meanings |
| No Calculation/Interpretation boundary leakage | **Passed** | Main Sections 5, 8, 9: AI and renderer are not Calculation Authority; interpretation cannot mutate validated facts |
| Explanation input boundary correct | **Passed** | Main Section 4: validated facts + authorized rule findings + permitted knowledge context + provenance; AI cannot create facts or bypass authorities |
| Validation admissibility requires accepted/passed state | **Passed** | Main Section 7: accepted/passed Validation Record for the exact snapshot required; record-existence alone insufficient |
| Calculation Snapshot immutable and not mutated by validation | **Passed** | Main Sections 7.1, 8, 9: snapshot is an immutable Calculation Authority output; Validation Authority records its outcome separately |
| Validation Authority owns validation outcomes/records | **Passed** | Main Sections 7.2, 8: Validation Record owned by Validation Authority; Calculation Authority does not manufacture validation acceptance |
| Validation Record bound to exact snapshot identity/version | **Passed** | Main Section 7.3: Validation Record references exact snapshot identity/version; cross-version reuse prohibited |
| Downstream use requires accepted/passed Validation Record for exact snapshot | **Passed** | Main Section 7: record-existence alone insufficient; pending/failed/rejected/inconclusive inadmissible; enum/schema deferred |
| ASTRO-SKY CALC+VALID necessary not sufficient | **Passed** | Main Section 11: necessary blocking prerequisites, not sufficient implementation authorization |
| Roadmap sequence unchanged | **Passed** | Main Section 11; `ROADMAP_SEQUENCE_CHANGED=NO` |
| ASTRO-SKY remains deferred/lateral | **Passed** | Main Section 11: lateral post-validation, `IMPLEMENTATION_STATUS=DEFERRED` |
| Downstream entry conditions explicit | **Passed** | Main Section 10: SOURCE-001, TAXONOMY-001, CALC-001, VALID-001 contracts |
| No formula/dependency/license decision made | **Passed** | Main Sections 12, 13: no formula, ephemeris, house-system, zodiac, ayanamsha, dependency, or license decision |
| Main and QA mutually consistent | **Passed** | Titles, status block, and scope agree across both documents |

---

## 4. Authority-Hierarchy Review

- The hierarchy is ordered so each layer consumes the outputs of upstream layers and cannot impersonate them.
- Calculation Authority is the only producer of calculated facts; Validation Authority precedes interpretation.
- Explanation AI receives validated calculated facts, authorized rule-derived findings, permitted knowledge context, and provenance; it cannot create calculated facts or bypass upstream authorities. Strategic Guidance defers to Human Decision Authority.
- No layer is granted authority it does not hold, and no downstream document may weaken an invariant.

---

## 5. Layer-Separation Review

- The eight layers (source evidence, taxonomy identities, calculated facts, validated facts, rule findings, interpretation, strategic guidance, user decision) are explicitly separated.
- A calculated fact is not an interpretation; a rule finding is not a calculated fact; guidance is not a decision.
- No single numeric score may collapse layers; confidence is qualitative and is not a guarantee.

---

## 6. Time-State Contract Review

- `referenceNow`, `selectedEventTime`, `calculationTime`, and `calculatedAt` are distinct.
- `calculationTime` is the normalized effective instant used by Calculation Authority, not result-generation time.
- `calculatedAt` is the audit timestamp and must not replace `calculationTime`.
- Timezone/location identity is preserved; only explicit user action returns the selection to now.
- PDF, history, provenance, and rendered output reference the same snapshot and effective calculation time.

---

## 7. Calculation Snapshot and Validation Record Review

- The Calculation Snapshot is an immutable output of the Calculation Authority; a change produces a new version. Validation does not mutate it.
- The snapshot records request identity, engine/data version, policy version, calculation provenance, and calculated facts.
- The Validation Record is a separate immutable artifact owned by the Validation Authority; it records validation state, validation evidence/reference, and validation policy/version (as applicable).
- The Validation Record references the exact Calculation Snapshot identity/version it validates; a validation result for one snapshot/version cannot authorize another.
- Downstream layers read the snapshot and do not recompute it; rendering configuration cannot alter provenance.
- A snapshot is admissible to Explanation or Strategic Guidance only when an accepted/passed Validation Record exists for that exact snapshot; record existence alone is insufficient, and pending/failed/rejected/inconclusive states remain inadmissible. The exact validation-state enum/schema remains deferred.

---

## 8. Prohibited-Paths Review

- No source-to-AI path without a calculation snapshot.
- No prompt-only path and no renderer-derived path to calculated facts.
- No interpretation mutation of the snapshot; no guidance overriding validation.
- No Validation Authority mutation of an existing Calculation Snapshot; validation outcomes are recorded in a separate Validation Record.
- No Calculation Authority manufacturing its own accepted validation result.
- No Validation Record reuse across different snapshot identities/versions.
- No silent reset of `selectedEventTime`; no UI-derived instant becoming `calculationTime` without a timezone policy.

---

## 9. Downstream-Contract Review

- `ASTRO-SOURCE-001`: source register, admissibility rules, no vendor/user evidence as formula authority.
- `ASTRO-TAXONOMY-001`: canonical identities, versioned vocabulary, no single-score collapse.
- `ASTRO-CALC-001`: versioned deterministic calculation producing the immutable versioned Calculation Snapshot (request identity, engine/data version, policy version, calculation provenance, calculated facts); no prompt-only or renderer path; does not create validation results/references.
- `ASTRO-VALID-001`: validation before interpretation; consistency vs accuracy separated; test vectors independent of screen geometry; produces a separate Validation Record referencing the exact snapshot identity/version with validation state, evidence/reference, and policy/version; schema deferred.

---

## 10. Roadmap-Integrity Review

- Sequence `ASTRO-ARCH → ASTRO-SOURCE → ASTRO-TAXONOMY → ASTRO-CALC → ASTRO-VALID → ASTRO-KNOW → ASTRO-RULE → ASTRO-EXPLAIN → ASTRO-STRATEGY` preserved.
- ASTRO-SKY is lateral and post-validation; it does not replace or bypass KNOW or RULE and remains deferred.
- `ASTRO-CALC-001` and `ASTRO-VALID-001` are necessary blocking prerequisites, not sufficient implementation authorization; all ASTRO-SKY-001 entry conditions remain applicable and `IMPLEMENTATION_STATUS=DEFERRED` remains unchanged.
- This baseline does not reorder, insert, or remove any stage.

---

## 11. Evidence-Discipline Review

- Inputs are classified as Current-Lineage Authority, Historical Repository Finding, or as prescribed.
- `astro-real-app-121` and `astro-real-app-122` are treated as Historical Repository Findings (compatibility constraints), not architecture authority.
- Existing repository source is classified as Historical Repository Finding only.
- No product observation or runtime behavior is upgraded into architecture authority without justification.

---

## 12. Verdict

**Ready for Human Re-Review**

This verdict reflects documentation readiness only. It must not be described as runtime validation, calculation validation, implementation approval, or licensing approval.

---

## 13. Final Status

```text
ASTRO_ARCH_001_DOCUMENTATION_SCOPE=PASS
ASTRO_ARCH_001_AUTHORITY_HIERARCHY=PASS
ASTRO_ARCH_001_LAYER_SEPARATION=PASS
ASTRO_ARCH_001_TIME_STATE_CONTRACT=PASS
ASTRO_ARCH_001_SNAPSHOT_CONTRACT=PASS
ASTRO_ARCH_001_VALIDATION_RECORD_SEPARATION=PASS
ASTRO_ARCH_001_INVARIANTS=PASS
ASTRO_ARCH_001_ROADMAP_PRESERVATION=PASS
ASTRO_ARCH_001_EVIDENCE_DISCIPLINE=PASS
ASTRO_ARCH_001_RUNTIME_REVALIDATION=NOT_PERFORMED
ASTRO_ARCH_001_READY_FOR_HUMAN_REVIEW=YES
```

---

*QA record for ASTRO-ARCH-001. No downstream artifacts modified.*
