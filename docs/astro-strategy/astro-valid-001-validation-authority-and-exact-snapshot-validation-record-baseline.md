# ASTRO-VALID-001 — Validation Authority and Exact-Snapshot Validation Record Baseline

* **Document Date**: 2026-08-20
* **Work Type**: Docs-only (No code, UI, database, dependency, configuration, or asset changes)
* **Project Area**: Astro Strategy Lab
* **Document Class**: Current-lineage validation-authority baseline (new)

---

## Status

```text
DOCUMENT_STATUS=CURRENT_LINEAGE_VALIDATION_AUTHORITY_BASELINE
WORK_TYPE=DOCS_ONLY
AUTHORITY_LAYER=VALIDATION_AUTHORITY_ONLY
ROADMAP_SEQUENCE_CHANGED=NO
```

This document is the **first current-lineage Validation Authority baseline** for Astro Strategy Lab. It establishes how calculated facts are validated against an exact Calculation Snapshot and how validation outcomes are recorded before any interpretation or strategic layer consumes them.

This document is:

- **not** implementation authorization;
- **not** a formula, ephemeris, house-system, zodiac-mode, or ayanamsha decision;
- **not** a tolerance, precision, oracle, or reference-dataset selection;
- **not** a dependency or license decision;
- **not** interpretive rule or strategic recommendation authority.

---

## 1. Document Status and Authority

This baseline registers **Validation Authority governance only**. It does not calculate, interpret, rule-derive, or decide strategy.

- **What it authorizes**: the conceptual Validation Request / Context model; the conceptual Exact-Snapshot Validation Record; the exact-snapshot binding rule; validation-record identity and immutability; the revalidation rule; the validation-policy identity/version boundary; conceptual validation outcome/status semantics; the structural, provenance, taxonomy, calculation-policy, reproducibility, reference, and tolerance validation boundaries; discrepancy recording; error/incomplete/inconclusive/rejected handling; fail-closed behavior; the no-repair rule; time-state and location/observer consistency checks; validation provenance and auditability; identity/version separation; the AI/UI/human boundaries; and the downstream consumption contract.
- **What it does not authorize**: any formula, any calculated fact production, any calculation-policy selection, any tolerance or precision value, any reference/oracle dataset, any validation implementation, any interpretive meaning, or any strategic recommendation.

**Scope note — interpretation-accuracy validation.** This baseline covers authoritative validation of Calculation Authority outputs / Calculation Snapshots only. It does not supersede, remove, or narrow the separate interpretation-accuracy validation obligation established by `ASTRO-ARCH-001`. Interpretation-accuracy validation remains preserved as current-lineage architecture responsibility, but its artifact model, policy, record structure, and execution contract are outside `ASTRO-VALID-001` and deferred to a later dedicated authority task.

Any downstream document that consumes a Validation Record must cite this baseline and cannot weaken the exact-snapshot binding rules recorded here.

---

## 2. Purpose and Scope

Astro Strategy Lab is the **Personal Strategic Timing Advisor / Explainable Strategic Decision Workspace** (positioning recorded in `ASTRO-MARKET-001A`). For its guidance to remain explainable and safe, calculated facts must be validated before interpretation consumes them, and every validation outcome must bind to the exact Calculation Snapshot it evaluates.

The governing rule:

```text
Calculation Snapshot X
→ immutable forever

Validation run under Validation Policy V1
→ Validation Record A
→ references exact Snapshot X

Later revalidation under Validation Policy V2
→ Validation Record B
→ also references exact Snapshot X

Validation Record A is not overwritten.
Snapshot X is not modified.

If recalculation occurs:
→ new Calculation Snapshot Y
→ requires its own validation lineage.
```

This baseline exists to:

1. define what Validation Authority owns and what it must not impersonate;
2. carry forward the exact-snapshot binding contract from `ASTRO-ARCH-001` and `ASTRO-CALC-001`;
3. define the conceptual Validation Request / Context and Exact-Snapshot Validation Record;
4. separate **validated calculated fact** from calculated fact, rule-derived finding, interpretation, and strategic guidance;
5. define the structural, provenance, taxonomy, calculation-policy, reproducibility, reference, and tolerance validation boundaries;
6. define outcome semantics, discrepancy recording, and fail-closed behavior;
7. preserve snapshot immutability: validation does not repair or mutate calculation output;
8. define the downstream consumption contract;
9. state deferred decisions and non-authorizations.

This task does **not** select formulas, tolerances, precision policies, oracles, reference datasets, engines, or dependencies, and does **not** define actual validation methodology or executable schema.

---

## 3. Authority Layer Boundary

### 3.1 Position in the authority hierarchy

`ASTRO-ARCH-001` establishes the following hierarchy; `ASTRO-VALID-001` operates **only within the Validation Authority layer**:

```text
Source Authority
→ Taxonomy Authority
→ Calculation Authority
→ Validation Authority
→ Knowledge Authority
→ Rule Authority
→ Explanation AI
→ Strategic Guidance
→ Human Decision Authority
```

### 3.2 What Validation Authority owns

Validation Authority conceptually owns:

- validation request/context handling for an exact Calculation Snapshot;
- evaluation of an exact immutable Calculation Snapshot;
- validation outcome/status determination at the conceptual level;
- exact-snapshot binding and identity reference;
- validation-record creation, identity, and immutability;
- validation provenance and auditability;
- discrepancy recording;
- revalidation lineage under explicit validation-policy identity/version;
- fail-closed behavior where authoritative validation cannot be completed.

### 3.3 What Validation Authority must not impersonate

`ASTRO-VALID-001` must not impersonate:

- **Source Authority** — it does not select source authority or admissibility;
- **Taxonomy Authority** — it does not mint canonical taxonomy;
- **Calculation Authority** — it does not calculate new facts;
- **Knowledge Authority** — it does not author interpretive knowledge;
- **Rule Authority** — it does not decide astrology rule truth;
- **Explanation AI / Strategic Guidance** — it does not interpret astrological meaning or issue strategic advice;
- **Human Decision Authority** — it does not decide for the user.

Validation Authority *records* whether an exact snapshot is acceptable; it does not act as any other layer.

---

## 4. Evidence Classification and Inputs

### 4.1 Evidence discipline

`ASTRO-VALID-001` does not define or extend the evidence-class taxonomy. It consumes evidence classifications and lineage classifications established by `ASTRO-SOURCE-001` and their originating current-lineage authorities. No new evidence class is introduced here.

Historical runtime behavior is inspected only as historical/compatibility evidence and is **not** promoted into current-lineage validation authority.

### 4.2 Inputs inspected for this baseline

| Input | Classification |
| :--- | :--- |
| `astro-arch-001-calculation-interpretation-time-state-and-authority-architecture-baseline.md` | Current-Lineage Authority |
| `qa-astro-arch-001-calculation-interpretation-time-state-and-authority-architecture-baseline.md` | Current-Lineage Authority |
| `astro-source-001-authoritative-source-register-and-admissibility-policy-baseline.md` | Current-Lineage Authority |
| `qa-astro-source-001-authoritative-source-register-and-admissibility-policy-baseline.md` | Current-Lineage Authority |
| `astro-taxonomy-001-canonical-identity-terminology-and-tradition-scope-taxonomy-baseline.md` | Current-Lineage Authority |
| `qa-astro-taxonomy-001-canonical-identity-terminology-and-tradition-scope-taxonomy-baseline.md` | Current-Lineage Authority |
| `astro-calc-001-calculation-authority-and-immutable-calculation-snapshot-baseline.md` | Current-Lineage Authority |
| `qa-astro-calc-001-calculation-authority-and-immutable-calculation-snapshot-baseline.md` | Current-Lineage Authority |

---

## 5. Upstream Contract from Calculation Authority

`ASTRO-CALC-001` provides, for an issued Calculation Snapshot:

- snapshot identity;
- applicable snapshot contract/format version where relevant;
- calculation request identity;
- normalized inputs;
- canonical identities;
- taxonomy version;
- tradition/school scope;
- calculation-policy identity/version;
- time/location context;
- calculated facts;
- provenance;
- engine/version where applicable;
- warnings/incompleteness;
- completed or explicitly bounded-partial state/scope;
- creation timestamp (`calculatedAt`);
- exact calculation scope.

Blocked / invalid / fatal non-snapshot outcomes are outside the snapshot-validation handoff; their future handling is deferred. Validation Authority consumes **issued Calculation Snapshot information only**.

---

## 6. Exact Calculation Snapshot Binding Rule

```text
Validation Record
must reference the exact immutable snapshot identity
being validated.
```

Rules:

- A Validation Record produced for one snapshot identity must **not** authorize a different snapshot identity.
- A Validation Record for one snapshot must **not** be reused to validate a different snapshot.
- The Validation Record may also retain the applicable snapshot contract/format version where relevant for provenance or compatibility, but must not collapse contract/format version into snapshot identity.
- Revalidation creates a **new** Validation Record referencing the same exact snapshot identity under a new validation-policy identity/version.

---

## 7. Validation Request / Context (Conceptual)

A **Validation Request / Context** is the conceptual input unit of Validation Authority. This is conceptual architecture only; no executable schema is created.

It should account for, where applicable:

| Field | Meaning |
| :--- | :--- |
| Validation request identity | A stable identity distinguishing this validation request. |
| Exact Calculation Snapshot identity | The exact immutable snapshot being validated. |
| Validation policy identity/version | The explicit validation policy/version in force (Section 11). |
| Calculation-policy identity/version | The calculation policy/version recorded in the snapshot under review. |
| Taxonomy version | The taxonomy version recorded in the snapshot under review. |
| Validation scope | The bounded validation scope being applied. |
| Request provenance | How the validation request and its context came to be. |
| Caller / context identity | Who/what requested validation, where relevant. |
| Ambiguity / unresolved input | Recorded unresolved or ambiguous validation inputs. |

The exact-snapshot binding is mandatory; a validation request without an exact snapshot identity is incomplete.

---

## 8. Exact-Snapshot Validation Record (Conceptual)

The **Exact-Snapshot Validation Record** is the authoritative output artifact of Validation Authority. This is conceptual architecture only; no executable JSON/database/TypeScript schema is created.

The record should account conceptually for:

| Field | Meaning |
| :--- | :--- |
| Validation record identity | A stable identity distinguishing this record from every other. |
| Exact Calculation Snapshot identity | The exact immutable snapshot being validated. |
| Snapshot contract / format version (where relevant) | Retained for provenance/compatibility; separate from snapshot identity. |
| Validation policy identity/version | The explicit validation policy/version applied. |
| Validation outcome/status | The conceptual outcome of validation (Section 12); exact vocabulary/schema deferred. |
| Validation scope | The bounded validation scope and covered validation dimensions/claims for this record (Section 12). |
| Excluded / incomplete coverage | Any explicitly excluded or incomplete coverage, where applicable. |
| Validation evidence / reference | The evidence or reference supporting the outcome. |
| Discrepancies | Recorded discrepancies (Section 21). |
| Warnings / incompleteness | Non-fatal warnings and incompleteness recorded with the record. |
| Validation provenance | The provenance required to understand the result. |
| Validation audit timestamp | When the validation outcome was recorded. |

Once issued, the Validation Record is immutable. The Calculation Authority must not modify it, and Validation Authority must not modify the Calculation Snapshot it references.

---

## 9. Validation Record Identity and Immutability

- A Validation Record has its own stable identity, distinct from snapshot identity, snapshot contract/format version, calculation-policy version, taxonomy version, validation-policy version, and engine/version (Section 27).
- Record preparation/creation is distinct from authoritative record issuance; only issued authoritative records receive the final immutability semantics.
- Once issued, a Validation Record is immutable.
- A revalidation creates a new Validation Record; it does not edit an earlier record.
- Snapshot immutability is independent of validation acceptance; a record's existence does not mutate the snapshot.

---

## 10. Revalidation Rule

Revalidation is a new validation run under an explicit validation-policy identity/version, referencing the same exact snapshot identity:

```text
Validation Policy V1 → Validation Record A → references Snapshot X
Validation Policy V2 → Validation Record B → also references Snapshot X
```

- Validation Record A is **not** overwritten by Validation Record B.
- Snapshot X is **not** modified by either record.
- If recalculation occurs, the new Calculation Snapshot Y requires its own validation lineage; existing records for Snapshot X do not authorize Snapshot Y.

---

## 11. Validation Policy Identity/Version Boundary

- Validation outcomes are recorded under an explicit validation-policy identity/version.
- Validation-policy version is **distinct** from calculation-policy version, taxonomy version, snapshot identity, snapshot contract/format version, and engine/version.
- No hidden validation policy/default is authorized.
- This baseline does **not** select the concrete validation policy, its values, or its versioning scheme.

---

## 12. Validation Outcome/Status Semantics (Conceptual)

Conceptual outcome semantics are established at the architecture level only; the exact vocabulary/schema is deferred. No executable enum is created here.

```text
PASS
FAIL
REJECTED
INCONCLUSIVE
BLOCKED
ERROR
NOT_VALIDATED / NOT_YET_VALIDATED
```

Conceptual definitions:

- **PASS** — validation completed under an identified Validation Policy and recorded criteria were satisfied for the recorded bounded validation scope.
- **FAIL** — validation completed and one or more applicable validation criteria were not satisfied within the recorded scope.
- **REJECTED** — the validation subject/request cannot be accepted under applicable validation policy/preconditions/admissibility; it is not automatically equivalent to a failed calculation.
- **INCONCLUSIVE** — validation cannot establish PASS or FAIL from the available authoritative evidence/checks.
- **BLOCKED** — validation cannot proceed or complete because an upstream dependency, authority condition, required input, or validation prerequisite is unavailable/unresolved.
- **ERROR** — validation execution/process encountered an error and no authoritative PASS/FAIL may be inferred from that error alone.
- **NOT_VALIDATED / NOT_YET_VALIDATED** — no applicable authoritative completed validation result exists.

Preserved rules:

```text
INCONCLUSIVE ≠ FAIL
NOT_VALIDATED ≠ INVALID
BLOCKED ≠ FAIL
ERROR ≠ FAIL
validation absence ≠ negative validation result
```

A non-PASS state may be fail-closed for downstream consumption, but fail-closed consumption must **not** erase the semantic distinction between these states.

Validation PASS applies only to the exact snapshot AND the recorded validation scope. Exact snapshot identity alone does **not** imply all facts in that snapshot were validated. A structural-only PASS must never silently become full-snapshot correctness.

---

## 13. Layer Distinction

```text
Calculated Fact
≠ Validated Calculated Fact / accepted snapshot result
≠ Rule-Derived Finding
≠ Interpretation
≠ Strategic Guidance
```

- CALC produces calculated facts.
- VALID records validation acceptance/outcome for calculated facts via an Exact-Snapshot Validation Record.
- KNOW, RULE, EXPLAIN, and STRATEGY layers consume validated facts downstream; they do not produce them.

Preserved rules:

```text
validation pass
≠ interpretive truth
≠ astrology-rule truth
≠ strategic recommendation
```

---

## 14. Structural / Integrity Validation Boundary

Validation may evaluate the structural and integrity consistency of an issued Calculation Snapshot, conceptually including:

- completeness and coherence of required fields;
- consistency of request identity and snapshot identity references;
- internal consistency of normalized inputs;
- consistency of calculated facts with the recorded calculation scope;
- absence of silent mutation or unauthorized modification.

This baseline does **not** define the concrete structural checks, executable schema, or integrity algorithms.

---

## 15. Provenance and Source-Lineage Validation Boundary

Validation may evaluate provenance and source-lineage consistency, conceptually including:

- provenance records present and not fabricated;
- source-policy lineage traceable per `ASTRO-SOURCE-001` and `ASTRO-CALC-001`;
- unknown provenance remains recorded as unknown/incomplete;
- no AI-fabricated provenance is accepted as authoritative.

---

## 16. Taxonomy / Version Consistency Validation Boundary

Validation may evaluate taxonomy/version consistency, conceptually including:

- the taxonomy version recorded in the snapshot;
- canonical identities used are consistent with that taxonomy version;
- unresolved taxonomy conflicts that must block or constrain validation per `ASTRO-TAXONOMY-001`;
- no silent re-interpretation of taxonomy meaning.

---

## 17. Calculation-Policy / Version Consistency Validation Boundary

Validation may evaluate calculation-policy/version consistency, conceptually including:

- the calculation-policy identity/version recorded in the snapshot;
- the snapshot's calculated facts are consistent with that policy/version;
- no hidden default policy is inferred.

---

## 18. Reproducibility Validation Boundary

Validation may evaluate reproducibility, conceptually including:

- exact input identities;
- taxonomy version;
- calculation-policy version;
- relevant source lineage;
- time/location context;
- engine/version where relevant;
- calculation scope.

Reproducibility is evaluated with the bounded determinism language carried forward from `ASTRO-CALC-001`; no bit-for-bit guarantee is made before engine/platform/precision selection.

---

## 19. Reference / Oracle / Comparison Validation Boundary

Validation may use reference datasets, comparison engines, test vectors, or accepted formula behavior as comparison evidence.

Carried forward from `ASTRO-SOURCE-001` validation-independence discipline:

```text
normative conformance reference
≠ automatically independent validation

an implementation
≠ its own sole authoritative proof

self-validation
≠ independent establishment of correctness

agreement between two implementations/engines
= comparison evidence
≠ automatic authoritative correctness
```

- Validation independence is claim-specific and purpose-specific.
- Reference/oracle/test-vector provenance must trace to appropriate current-lineage authority.

Where future validation depends on a reference dataset, oracle, comparison engine, normative dataset, test vector, or external calculation artifact, require explicit conceptual identity/version/provenance.

Those reference identities remain **distinct** from: snapshot identity, snapshot contract/format version, validation-record identity, validation-record contract version, validation-policy version, calculation-policy version, taxonomy version, and calculation engine/version.

This baseline does **not** select any concrete reference dataset, oracle, comparison engine, or test vector. A reference may not be invented silently, and AI may not fabricate a reference.

---

## 20. Tolerance / Precision Boundary

Validation may involve tolerances and precision policies.

Boundaries:

- Concrete tolerances, precision policies, and rounding policies are **not** selected here.
- Any tolerance/precision policy used must eventually have explicit identity/version/provenance and appropriate lineage.
- No hidden tolerance/default policy is authorized.

---

## 21. Discrepancy Recording

- Discrepancies observed during validation are recorded in the Validation Record.
- Discrepancy recording must include enough context to understand what differed and against what.
- Discrepancies do **not** authorize mutation of the Calculation Snapshot.

---

## 22. Error / Incomplete / Inconclusive / Rejected Validation Handling

- Failed, rejected, incomplete, inconclusive, blocked, or error outcomes are supported conceptually.
- A non-accepted outcome must **not** be presented as accepted.
- Each such outcome is recorded in its own Validation Record (or deferred non-snapshot handling) with provenance.
- Deferred/non-snapshot validation handling cannot become an authoritative snapshot-validation result without exact Calculation Snapshot binding.
- No executable status enum is defined here.

---

## 23. Fail-Closed Behavior

Where authoritative validation cannot be completed:

- the outcome must fail closed: it must not be treated as accepted/passed;
- downstream Explanation/Strategy must not consume the snapshot as validated;
- `not-yet-validated` is not automatically invalid, but it is also not automatically valid.

---

## 24. No Silent Correction or Repair of an Issued Calculation Snapshot

```text
validation failure
≠ permission to mutate calculation output
```

- Validation Authority must **not** calculate new facts in order to hide or repair an upstream defect.
- Validation Authority must **not** mutate calculated facts.
- If the calculation is defective, a new calculation (new snapshot) with its own validation lineage is the only repair path; the issued snapshot remains historical.

---

## 25. Time-State and Location/Observer Consistency Checks

Validation may evaluate time-state and location/observer consistency, conceptually including:

- `referenceNow` / `selectedEventTime` / `calculationTime` / `calculatedAt` remain distinct and non-collapsed;
- `calculatedAt` is audit/creation time, not target calculation time;
- timezone and location identities are consistent with the snapshot's recorded inputs;
- no implicit local-machine timezone authority.

---

## 26. Validation Provenance and Auditability

Every Validation Record must preserve enough provenance to answer:

- Which exact snapshot was validated?
- Under which validation policy/version?
- Under which calculation-policy/version and taxonomy version?
- What evidence/reference supported the outcome?
- What discrepancies were recorded?
- Who/what requested and recorded the validation?
- When was the record created?

Validation provenance must not be fabricated by AI. Unknown provenance must remain unknown/incomplete.

---

## 27. Identity / Version Separation

Conceptually separate, and do **not** conflate:

```text
Snapshot identity
Snapshot contract/format version
Validation-record identity
Validation-record contract version
Validation-policy version
Calculation-policy version
Taxonomy version
Engine/version
Reference / oracle / test-vector identity (where applicable)
```

- The Validation Record references the **exact snapshot identity** being validated.
- Contract/format versions are retained separately where relevant for provenance or compatibility.
- No executable ID/version syntax is defined.

---

## 28. AI Boundary

AI may assist:

- preparing validation requests;
- detecting ambiguity or missing information;
- explaining validation results;
- summarizing discrepancies;
- presenting evidence;
- organizing review information;
- comparing candidate validation references for human review.

```text
AI ≠ Validation Authority
```

AI may **not**:

- independently confer ANY authoritative validation outcome (PASS, FAIL, REJECTED, INCONCLUSIVE, BLOCKED, or another authoritative validation outcome);
- issue authoritative Validation Records independently;
- mutate authoritative Validation Records;
- change validation outcomes;
- convert narrative confidence into validation authority;
- fabricate validation evidence/reference;
- invent tolerances or reference policies;
- mutate Calculation Snapshots;
- resolve taxonomy conflicts;
- interpret astrological meaning;
- issue strategic advice.

Authoritative validation outcome issuance must originate from Validation Authority operating under an approved Validation Policy and applicable governance. This baseline does **not** require manual human approval for every future automated deterministic validation unless upstream authority already requires it.

---

## 29. UI Boundary

UI is not Validation Authority.

```text
UI display of validation state
≠ validation record
```

- A UI may render validation state from the Validation Record; it must not fabricate it.
- UI geometry or labels must not create validation facts.
- UI must **not** infer validation authority from: existence of a snapshot, display formatting, AI prose, or historical runtime behavior.
- UI validation state must derive from applicable Validation Records and their recorded scope.

---

## 30. User / Human Decision Authority Boundary

Human Decision Authority remains final for decisions.

- Users may reject/use/not-use results and request revalidation or recalculation.
- User interaction does **not** convert manual editing of validation outcome into Validation Authority without a recorded path.
- Validation Authority never decides for the user.

---

## 31. Downstream Consumption Contract

Downstream layers (Explanation, Strategic Guidance) may consume a validated calculated fact only when:

- an accepted/passed Validation Record exists;
- for the **exact** Calculation Snapshot identity being consumed;
- the Validation Record's recorded validation scope covers the facts/claims being consumed;
- under a recorded validation-policy identity/version;
- with validation provenance and discrepancies available.

A Validation Record alone is insufficient when its outcome is non-accepted; and a Validation Record for one snapshot must not authorize a different snapshot. Downstream consumers requiring validated calculated facts must verify both (1) the exact Calculation Snapshot identity and (2) sufficient accepted validation scope for the facts/claims they intend to consume.

---

## 32. Deferred Decisions and Non-Authorizations

Explicitly deferred, no decision made here:

- validation methodology and concrete checks;
- validation outcome/status vocabulary and enums;
- Validation Record schema/serialization/storage;
- reference datasets, oracles, comparison engines, and test vectors;
- tolerances, precision policies, and rounding policies;
- validation-policy identity/version scheme;
- snapshot/record ID syntax;
- executable schema;
- formula, ephemeris, house-system, zodiac-mode, ayanamsha, engine, library, or dependency selection;
- license approvals;
- validation implementation;
- interpretation-accuracy validation (separate obligation established by `ASTRO-ARCH-001`; deferred to a later dedicated authority task);
- SKY implementation authorization.

---

## 33. Acceptance Criteria for This Docs-Only Baseline

This baseline is acceptable as a current-lineage validation-authority baseline only if it:

- is docs-only;
- establishes the exact-snapshot binding rule explicitly;
- keeps Validation Record separate from Calculation Snapshot;
- preserves snapshot immutability and the no-repair rule;
- separates validation-policy version from calculation-policy, taxonomy, and engine versions;
- does not select tolerances, references, oracles, formulas, or dependencies;
- does not authorize executable schema or implementation;
- preserves AI/UI/human boundaries;
- does not change the roadmap sequence;
- does not promote historical runtime behavior into current authority.

```text
DOCUMENT_STATUS=CURRENT_LINEAGE_VALIDATION_AUTHORITY_BASELINE
WORK_TYPE=DOCS_ONLY
AUTHORITY_LAYER=VALIDATION_AUTHORITY_ONLY
ROADMAP_SEQUENCE_CHANGED=NO
```

---

*End of ASTRO-VALID-001. Docs-only validation-authority baseline; no tolerances, references, oracles, formulas, dependencies, licenses, or runtime artifacts established.*
