# QA Record — ASTRO-CALC-001 — Calculation Authority and Immutable Calculation Snapshot Baseline

* **QA Status**: Ready for Human Re-Review
* **Task Identity**: ASTRO-CALC-001 (Calculation Authority and Immutable Calculation Snapshot Baseline)
* **Date**: 2026-08-20
* **Scope**: Docs-only QA of two new files in `docs/astro-strategy/`

---

## 1. QA Scope and Authority

This QA record verifies that the ASTRO-CALC-001 calculation-authority baseline and its QA record are docs-only, internally consistent, and bounded correctly. It is **not**:

- runtime validation;
- calculation validation;
- formula/system selection;
- licensing approval;
- implementation approval.

The verdict `Ready for Human Re-Review` means the documentation is ready for human review, not that any calculation has been implemented, any formula selected, or any dependency/license approved.

---

## 2. Files Reviewed

1. `docs/astro-strategy/astro-calc-001-calculation-authority-and-immutable-calculation-snapshot-baseline.md` — main calculation-authority baseline.
2. `docs/astro-strategy/qa-astro-calc-001-calculation-authority-and-immutable-calculation-snapshot-baseline.md` — this QA record.

No other files were created, modified, staged, or reviewed for change.

---

## 3. Checklist Matrix

| Verification Point | Result | Evidence / Reference |
| :--- | :--- | :--- |
| Exactly two new documentation files | **Passed** | Only the two authorized ASTRO-CALC-001 files under `docs/astro-strategy/` exist as new |
| Docs-only scope | **Passed** | No `src/**`, tests, configs, routes, or dependencies touched |
| No runtime/config/dependency changes | **Passed** | Main Section 28 non-goals; no implementation artifacts |
| ARCH authority hierarchy preserved | **Passed** | Main Section 3.1 reproduces the ordered hierarchy unchanged |
| SOURCE remains upstream authority | **Passed** | Main Sections 3.3, 6: CALC consumes reviewed source provenance; Source Authority not impersonated |
| TAXONOMY remains upstream authority | **Passed** | Main Sections 3.3, 6: CALC consumes canonical identities; Taxonomy Authority not impersonated |
| CALC owns calculated facts only | **Passed** | Main Sections 2, 5, 10: the only producer of calculated facts and snapshots |
| No validation authority leakage | **Passed** | Main Sections 3.3, 17: validation acceptance is downstream and separate |
| No KNOW/RULE/STRATEGY leakage | **Passed** | Main Sections 3.3, 10: interpretation, rule truth, and strategy remain downstream |
| Calculation Request model is conceptual only | **Passed** | Main Section 7: no executable schema |
| Immutable Calculation Snapshot model is conceptual only | **Passed** | Main Section 8: no executable schema |
| Immutability rule established | **Passed** | Main Section 9: once issued, a snapshot is immutable immediately regardless of later validation state |
| Recalculation creates a new snapshot identity | **Passed** | Main Section 9: new calculation → new snapshot identity, not a revision of an issued snapshot |
| Snapshot identity distinct from contract/format, policy, taxonomy, engine versions | **Passed** | Main Sections 8, 18: identity ≠ contract/format version ≠ policy version ≠ taxonomy version ≠ engine/version |
| Blocked/invalid/fatal failure does not masquerade as completed snapshot | **Passed** | Main Section 15: failure/blocked outcome ≠ completed Calculation Snapshot |
| Partial snapshot requires explicit bounded scope and incompleteness | **Passed** | Main Sections 15, 23 |
| Absence of facts not interpreted as zero/false/not-applicable | **Passed** | Main Sections 15, 23 |
| Determinism wording bounded consistently | **Passed** | Main Sections 2, 12: explicit inputs + policy/version + provenance; bounded reproduction |
| No bit-for-bit guarantee before engine/platform/precision selection | **Passed** | Main Section 12 |
| Calculated fact ≠ validated fact | **Passed** | Main Section 10 |
| Time-state fields remain distinct | **Passed** | Main Section 13: `referenceNow` / `selectedEventTime` / `calculationTime` / `calculatedAt` |
| Location/timezone provenance preserved | **Passed** | Main Section 14: exact context preserved; no implicit local-machine timezone authority |
| Calculation-policy identity/version required conceptually | **Passed** | Main Section 11: explicit policy/version, not hidden defaults |
| No formula selected | **Passed** | Main Sections 11, 27, 28: formula selection deferred |
| Determinism/reproducibility bounded correctly | **Passed** | Main Section 12: careful language; no bit-for-bit promise without selected platform/library |
| Incomplete/error states supported | **Passed** | Main Section 15: incomplete/blocked/invalid/ambiguous/error outcomes |
| Unresolved taxonomy may block/constrain CALC | **Passed** | Main Section 16 |
| Validation Record remains separate | **Passed** | Main Section 17: VALID produces a separate Validation Record |
| Exact snapshot identity required for validation | **Passed** | Main Section 17: Validation Record references the exact immutable snapshot identity; contract/format version retained separately where relevant |
| Non-snapshot blocked/invalid/fatal outcomes outside snapshot contract | **Passed** | Main Sections 8, 15: failure/blocked outcome ≠ issued Calculation Snapshot |
| CALC → VALID snapshot handoff contains issued-snapshot info only | **Passed** | Main Section 25: blocked/invalid/fatal outcomes are outside the snapshot-validation handoff |
| Snapshot contract/format version separate from snapshot identity | **Passed** | Main Sections 8, 18, 25 |
| AI cannot invent facts/select hidden policy/validate | **Passed** | Main Section 20 |
| UI geometry not calculation authority | **Passed** | Main Section 21: rendered position ≠ calculated fact |
| User edits cannot silently mutate snapshot | **Passed** | Main Section 22: manual editing does not become Calculation Authority |
| Downstream VALID contract explicit | **Passed** | Main Section 25 |
| Roadmap unchanged | **Passed** | Main Section 26; `ROADMAP_SEQUENCE_CHANGED=NO` |
| SKY deferred/lateral | **Passed** | Main Section 26: CALC completion does not authorize ASTRO-SKY |
| No runtime/formula/dependency/license implementation | **Passed** | Main Sections 27, 28, 29 |
| Main and QA mutually consistent | **Passed** | Titles, status block, and scope agree across both documents |

---

## 4. Ownership-Discipline Review

- Calculation Authority is the only producer of calculated facts and immutable Calculation Snapshots (Main Sections 2, 5).
- It does not impersonate Source, Taxonomy, Validation, Knowledge, Rule, Strategic Guidance, or Human Decision Authority (Main Section 3.3).
- A snapshot existing does not imply the facts are validated; Validation Authority is downstream and separate (Main Section 10).
- An issued snapshot is immutable immediately regardless of later validation state; snapshot immutability ≠ validation acceptance (Main Sections 9, 17).
- A blocked/invalid/fatal calculation attempt must not masquerade as a completed Calculation Snapshot; partial snapshots require explicit bounded scope and recorded incompleteness (Main Section 15).

---

## 5. Input, Time and Location Review

- Upstream input contract: CALC consumes reviewed Source and Taxonomy authority; it must not invent taxonomy or infer policy from UI labels, model memory, screenshots, competitor software, historical behavior, vendor marketing, or unsupported repetition (Main Section 6).
- Time-state discipline carried forward from ARCH: the four time fields remain distinct; `calculatedAt` must not replace `calculationTime` (Main Section 13).
- Location/observer context preserved for reproducibility; UI display names do not substitute for authoritative coordinates/context (Main Section 14).

---

## 6. Artifact and Boundary Review

- Immutable Calculation Snapshot covers snapshot identity, snapshot contract/format version, request identity, policy/taxonomy versions, canonical identities, normalized inputs, time/location inputs, calculated facts, units/reference-frame info, provenance, engine/version, warnings, incompleteness, ambiguity, reproducibility metadata, and creation status (Main Section 8). Snapshot identity is distinct from contract/format version, calculation-policy version, taxonomy version, and engine/version (Main Section 18).
- Formula/policy boundary: no formula, ephemeris, house system, zodiac mode, ayanamsha, or library is selected; hidden defaults must not become authority (Main Section 11).
- Error/incomplete/ambiguous states are supported; a blocked/invalid/fatal outcome must not masquerade as a completed snapshot, and absence of facts is not zero/false/not-applicable (Main Section 15).
- Provenance must answer what/which identities/time-location/policy/source-lineage/engine/when; AI must not fabricate it (Main Section 19).

---

## 7. Verdict

**Ready for Human Re-Review**

This verdict reflects documentation readiness only. It must not be described as runtime validation, calculation validation, calculation implementation, formula/system selection, licensing approval, or implementation approval.

---

## 8. Final Status

```text
ASTRO_CALC_001_DOCUMENTATION_SCOPE=PASS
ASTRO_CALC_001_NO_RUNTIME_CHANGES=PASS
ASTRO_CALC_001_AUTHORITY_HIERARCHY_PRESERVED=PASS
ASTRO_CALC_001_SOURCE_UPSTREAM_PRESERVED=PASS
ASTRO_CALC_001_TAXONOMY_UPSTREAM_PRESERVED=PASS
ASTRO_CALC_001_CALC_OWNS_FACTS_ONLY=PASS
ASTRO_CALC_001_NO_VALIDATION_LEAKAGE=PASS
ASTRO_CALC_001_NO_KNOW_RULE_STRATEGY_LEAKAGE=PASS
ASTRO_CALC_001_REQUEST_MODEL_CONCEPTUAL=PASS
ASTRO_CALC_001_SNAPSHOT_MODEL_CONCEPTUAL=PASS
ASTRO_CALC_001_IMMUTABILITY_RULE=PASS
ASTRO_CALC_001_RECALC_NEW_SNAPSHOT=PASS
ASTRO_CALC_001_SNAPSHOT_IDENTITY_VS_VERSION=PASS
ASTRO_CALC_001_FAILURE_NOT_SNAPSHOT=PASS
ASTRO_CALC_001_PARTIAL_SNAPSHOT_BOUNDED=PASS
ASTRO_CALC_001_BOUNDED_DETERMINISM=PASS
ASTRO_CALC_001_FACT_VS_VALIDATED=PASS
ASTRO_CALC_001_TIME_STATE_DISTINCT=PASS
ASTRO_CALC_001_LOCATION_TIMEZONE_PROVENANCE=PASS
ASTRO_CALC_001_POLICY_VERSION_REQUIRED=PASS
ASTRO_CALC_001_NO_FORMULA_SELECTED=PASS
ASTRO_CALC_001_DETERMINISM_BOUNDED=PASS
ASTRO_CALC_001_ERROR_STATES_SUPPORTED=PASS
ASTRO_CALC_001_UNRESOLVED_TAXONOMY_BLOCKS=PASS
ASTRO_CALC_001_VALIDATION_RECORD_SEPARATE=PASS
ASTRO_CALC_001_EXACT_SNAPSHOT_FOR_VALIDATION=PASS
ASTRO_CALC_001_AI_BOUNDARY=PASS
ASTRO_CALC_001_UI_BOUNDARY=PASS
ASTRO_CALC_001_USER_BOUNDARY=PASS
ASTRO_CALC_001_VALID_CONTRACT=PASS
ASTRO_CALC_001_ROADMAP_UNCHANGED=PASS
ASTRO_CALC_001_SKY_REMAINS_DEFERRED=PASS
ASTRO_CALC_001_NO_IMPLEMENTATION=PASS
ASTRO_CALC_001_NON_SNAPSHOT_OUTCOME_RESIDUE=RESOLVED
ASTRO_CALC_001_IDENTITY_VERSION_WORDING_RESIDUE=RESOLVED
ASTRO_CALC_001_READY_FOR_HUMAN_REVIEW=YES
```

---

*QA record for ASTRO-CALC-001. No downstream artifacts modified.*
