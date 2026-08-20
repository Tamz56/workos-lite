# ASTRO-CALC-001 — Calculation Authority and Immutable Calculation Snapshot Baseline

* **Document Date**: 2026-08-20
* **Work Type**: Docs-only (No code, UI, database, dependency, configuration, or asset changes)
* **Project Area**: Astro Strategy Lab
* **Document Class**: Current-lineage calculation-authority baseline (new)

---

## Status

```text
DOCUMENT_STATUS=CURRENT_LINEAGE_CALCULATION_AUTHORITY_BASELINE
WORK_TYPE=DOCS_ONLY
AUTHORITY_LAYER=CALCULATION_AUTHORITY_ONLY
ROADMAP_SEQUENCE_CHANGED=NO
```

This document is the **first current-lineage Calculation Authority baseline** for Astro Strategy Lab. It establishes how calculated facts are produced, recorded, and made immutable before any validation, interpretation, or strategic layer consumes them.

This document is:

- **not** implementation authorization;
- **not** a formula, ephemeris, house-system, zodiac-mode, or ayanamsha decision;
- **not** a dependency or license decision;
- **not** validation implementation;
- **not** interpretive rule or strategic recommendation authority.

---

## 1. Document Status and Authority

This baseline registers **Calculation Authority governance only**. It does not validate, interpret, rule-derive, or decide strategy.

- **What it authorizes**: the conceptual Calculation Request / Context model; the conceptual Immutable Calculation Snapshot; the immutability and recalculation rule; the calculated-fact boundary; the formula/policy reference boundary; determinism and reproducibility principles; time-state and location/observer discipline; error/incomplete/ambiguous calculation states; taxonomy-conflict interaction; the validation boundary; snapshot identity and versioning; provenance requirements; the AI/UI/user boundaries; and the downstream contract to `ASTRO-VALID-001`.
- **What it does not authorize**: any formula, any ephemeris or house-system selection, any zodiac/ayanamsha value, any dependency, any license path, any validation result, any interpretive meaning, or any strategic recommendation.

Any downstream document that consumes a Calculation Snapshot must cite this baseline and cannot weaken the immutability rules recorded here.

---

## 2. Purpose and Scope

Astro Strategy Lab is the **Personal Strategic Timing Advisor / Explainable Strategic Decision Workspace** (positioning recorded in `ASTRO-MARKET-001A`). For its guidance to remain explainable and safe, every calculated fact must be produced under explicit, reproducible calculation inputs, policy/version, and provenance, with deterministic reproduction expected where the calculation domain and selected execution conditions permit. Calculated facts are recorded in an immutable Calculation Snapshot and later validated before interpretation consumes them.

The governing principle:

```text
Calculation Authority
produces calculated facts.

It does not decide interpretive meaning,
validation acceptance,
knowledge truth,
rule truth,
strategic recommendation,
or human decision.
```

This baseline exists to:

1. define what Calculation Authority owns and what it must not impersonate;
2. define the conceptual Calculation Request / Context model;
3. define the conceptual Immutable Calculation Snapshot and its immutability rule;
4. separate **calculated fact** from validated fact, rule-derived finding, interpretation, and strategic guidance;
5. establish that future calculation execution uses an explicitly identified calculation policy/version, not hidden defaults;
6. carry forward time-state and location/observer discipline from `ASTRO-ARCH-001`;
7. define error, incomplete, and ambiguous calculation states so failures are never dressed up as authoritative facts;
8. carry forward taxonomy-conflict interaction from `ASTRO-TAXONOMY-001`;
9. define the validation boundary and the downstream contract to `ASTRO-VALID-001`;
10. state provenance, determinism, and reproducibility requirements.

This task does **not** select formulas, ephemeris, house systems, zodiac modes, ayanamsha, engines, or dependencies, and does **not** define the actual V1 calculation scope.

---

## 3. Authority Layer Boundary

### 3.1 Position in the authority hierarchy

`ASTRO-ARCH-001` establishes the following hierarchy; `ASTRO-CALC-001` operates **only within the Calculation Authority layer**:

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

### 3.2 What Calculation Authority owns

Calculation Authority conceptually owns:

- calculation request normalization;
- calculation input identity;
- explicit formula-policy reference (policy identity/version);
- astronomical/calendrical/time/location input handling;
- computation execution;
- calculated fact production;
- immutable Calculation Snapshot creation;
- calculation provenance;
- calculation version/policy identity;
- incomplete/error state reporting;
- reproducibility metadata.

### 3.3 What Calculation Authority must not impersonate

`ASTRO-CALC-001` must not impersonate:

- **Source Authority** — it does not decide source admissibility or evidence class;
- **Taxonomy Authority** — it does not mint canonical identities;
- **Validation Authority** — it does not decide validation acceptance;
- **Knowledge Authority** — it does not author interpretive knowledge;
- **Rule Authority** — it does not decide astrology rule truth;
- **Strategic Guidance** — it does not interpret confidence or give strategic advice;
- **Human Decision Authority** — it does not decide for the user.

Calculation Authority *produces* the facts those layers may consume; it does not act as them.

---

## 4. Evidence Classification and Inputs

### 4.1 Evidence discipline

`ASTRO-CALC-001` does not define or extend the evidence-class taxonomy. It consumes evidence classifications and lineage classifications established by `ASTRO-SOURCE-001` and their originating current-lineage authorities. No new evidence class is introduced here.

Historical runtime code and repository behavior are examined only as historical/compatibility evidence; existing implementation behavior is **not** promoted into Calculation Authority merely because it exists.

### 4.2 Inputs inspected for this baseline

| Input | Classification |
| :--- | :--- |
| `astro-arch-001-calculation-interpretation-time-state-and-authority-architecture-baseline.md` | Current-Lineage Authority |
| `qa-astro-arch-001-calculation-interpretation-time-state-and-authority-architecture-baseline.md` | Current-Lineage Authority |
| `astro-source-001-authoritative-source-register-and-admissibility-policy-baseline.md` | Current-Lineage Authority |
| `qa-astro-source-001-authoritative-source-register-and-admissibility-policy-baseline.md` | Current-Lineage Authority |
| `astro-taxonomy-001-canonical-identity-terminology-and-tradition-scope-taxonomy-baseline.md` | Current-Lineage Authority |
| `qa-astro-taxonomy-001-canonical-identity-terminology-and-tradition-scope-taxonomy-baseline.md` | Current-Lineage Authority |

`ASTRO-SKY-001` and `ASTRO-MARKET-001A` were inspected only for compatibility vocabulary where relevant.

---

## 5. Calculation Authority Ownership

Summarized:

```text
Calculation Authority
= the only producer of calculated facts
  and immutable Calculation Snapshots
```

It owns calculation execution and fact production. It does **not** own:

- source admissibility;
- canonical identity minting;
- validation acceptance;
- interpretive knowledge;
- astrology rule truth;
- confidence interpretation;
- strategic advice;
- human decision.

---

## 6. Upstream Input Contract

CALC must consume reviewed upstream authority.

Conceptual lineage:

```text
Source Authority
→ approved source/provenance context

Taxonomy Authority
→ canonical identities
→ tradition/school scope
→ taxonomy version
→ identity conflicts / constraints

Calculation Request
→ Calculation Authority
```

CALC must **not**:

- invent taxonomy independently;
- infer authoritative calculation policy from UI labels, model memory, screenshots, competitor software, historical repository behavior, vendor marketing, or unsupported online repetition.

Formula/policy sources must ultimately trace to Source Authority when future formula-selection work occurs.

---

## 7. Calculation Request / Context (Conceptual)

A **Calculation Request / Context** is the conceptual input unit of Calculation Authority. This is conceptual architecture only; no executable schema is created.

It should account for, where applicable:

| Field | Meaning |
| :--- | :--- |
| Request identity | A stable identity distinguishing this request from every other. |
| Subject / chart identity | Which subject or chart the calculation is about, where applicable. |
| Canonical input identities | Reviewed canonical identities from Taxonomy Authority for calculation-relevant concepts. |
| Tradition / school scope | The tradition/school scope under which the calculation is requested. |
| Taxonomy version | The taxonomy version in force for this request. |
| Selected calculation policy reference | The explicit calculation policy/version requested (Section 11). |
| Reference location / observer context | Location and observer context required for reproducibility (Section 14). |
| Timezone identity | The timezone identity attached to relevant time inputs. |
| Calendar / time-system context | The calendar/time-system context, where applicable. |
| `referenceNow` | The current system reference instant (ARCH time-state). |
| `selectedEventTime` | The intentionally selected event time, including timezone/location context. |
| `calculationTime` | The normalized effective instant actually supplied to Calculation Authority. |
| Request provenance | How the request and its inputs came to be, and their chain of custody. |
| Requested calculation scope | The bounded scope of the calculation (Section 23). |
| Caller / context identity | Who/what requested the calculation, where relevant. |
| Ambiguity / unresolved input | Recorded unresolved or ambiguous inputs. |
| Request version | The request's own version, where applicable. |

The ARCH time-state separation is preserved; `calculatedAt` belongs to result provenance and must not silently replace the requested calculation time.

---

## 8. Immutable Calculation Snapshot (Conceptual)

The **Immutable Calculation Snapshot** is the authoritative output artifact of Calculation Authority. This is conceptual architecture only; no executable JSON/database/TypeScript schema is created.

The snapshot should account conceptually for:

| Field | Meaning |
| :--- | :--- |
| Snapshot identity | The identity of one immutable calculation artifact. Once issued, this identity never changes; a new calculation produces a new snapshot identity. |
| Snapshot contract / format version | The version of the snapshot's contract/format, where versioned separately; distinct from snapshot identity, calculation-policy version, taxonomy version, and engine/version. |
| Calculation request identity | The request this snapshot answers. |
| Calculation policy / version identity | The explicit calculation policy/version used. |
| Taxonomy version | The taxonomy version in force for this snapshot. |
| Tradition / school scope | The tradition/school scope applied. |
| Canonical identities used | The reviewed canonical identities consumed from Taxonomy Authority. |
| Normalized calculation inputs | The inputs actually used after normalization. |
| Location / timezone / time-state inputs | Location, timezone, and time-state inputs (Section 14). |
| `referenceNow` | The reference instant used. |
| `selectedEventTime` | The selected event time used. |
| `calculationTime` | The effective instant actually calculated. |
| `calculatedAt` | The audit timestamp when the snapshot was produced. |
| Calculated facts | The calculated outputs actually produced, bounded by the recorded calculation scope. |
| Units / coordinate / reference-frame information | Units and reference-frame information where applicable. |
| Provenance | The provenance required to understand the snapshot (Section 19). |
| Engine / version identity | The calculation engine and data version used, where applicable. |
| Source-policy lineage | Link back to reviewed source/formula lineage where applicable. |
| Warnings | Non-fatal warnings recorded with the snapshot. |
| Incompleteness | Recorded partial/incomplete scope (Sections 15, 23). |
| Ambiguity | Recorded ambiguity in inputs or results. |
| Reproducibility metadata | Metadata enabling reproduction under the recorded policy/version and engine conditions (Section 12). |
| Checksum / content identity concept | A content-identity concept where appropriate; no hashing algorithm selected. |
| Creation status | The state of the issued snapshot: completed or explicitly bounded partial (Section 15). Exact names/enums remain deferred. |

No storage schema, serialization, or hashing algorithm is locked here. Snapshot identity is the identity of one immutable calculation artifact; it must not be confused with snapshot contract/format version, calculation-policy version, taxonomy version, or engine/version (Section 18).

---

## 9. Immutability Rule

Established strongly:

```text
Once issued,
a Calculation Snapshot is immutable immediately,
regardless of later validation state.
```

```text
Snapshot identity
= identity of one immutable calculation artifact.

Once issued,
that snapshot identity never changes.

Recalculation
= new calculation
→ new Calculation Snapshot identity
```

If calculation inputs, policy, taxonomy, formula, time, location, or engine change:

```text
old snapshot remains historical
→ new calculation
→ new snapshot identity
```

Rules:

- Do **not** mutate the old snapshot silently.
- No downstream layer may alter calculated facts inside an issued Calculation Snapshot.
- Interpretation, UI, Knowledge, Rule, Strategy, or user editing must not mutate snapshot facts.
- A user may request recalculation, but recalculation creates a new snapshot identity, not a revision of an issued snapshot.

```text
snapshot immutability
≠ validation acceptance
```

An issued snapshot is **not** revised in place:

```text
snapshot X
→ immutable historical artifact

new calculation
→ snapshot Y
```

---

## 10. Calculated Fact Boundary

```text
Calculated Fact
≠ Validated Fact
≠ Rule-Derived Finding
≠ Interpretation
≠ Strategic Guidance
```

- CALC produces calculated facts only.
- A Calculation Snapshot existing does **not** mean the facts are validated.
- Validation Authority is downstream and separate.
- This baseline avoids any wording implying CALC output is automatically correct, trusted, accepted, or validated.

---

## 11. Formula / Policy Reference Boundary

This baseline does **not** choose formulas. It establishes that future calculation execution uses an explicitly identified calculation policy/version rather than hidden defaults.

Conceptually:

```text
Calculation Snapshot
→ calculation policy identity/version
→ formula/source lineage
```

where applicable.

The exact formula-selection task remains deferred. Do **not** select here:

- ephemeris;
- house system;
- zodiac mode;
- ayanamsha;
- calendar conversion implementation;
- astronomical library;
- timezone library;
- coordinate library;
- numerical algorithms.

Hidden implementation defaults must not become authority.

---

## 12. Determinism and Reproducibility

Every calculated fact must be produced under explicit, reproducible calculation inputs, policy/version, and provenance, with deterministic reproduction expected where the calculation domain and selected execution conditions permit.

Identical authoritative inputs under the same calculation-policy/version and engine conditions should be reproducible where the underlying calculation domain permits deterministic reproduction.

A future reproduction process must be able to determine:

- exact input identities;
- taxonomy version;
- calculation-policy version;
- relevant source lineage;
- time/location context;
- engine/version where relevant;
- calculation scope.

Bit-for-bit identity is **not** promised where platform/library behavior has not yet been selected. Language is deliberately careful.

---

## 13. Time-State Discipline

Carried forward from `ASTRO-ARCH-001`:

```text
referenceNow
selectedEventTime
calculationTime
calculatedAt
```

Examples of prohibited collapse:

```text
selectedEventTime = calculatedAt
```

merely because calculation happened immediately, or:

```text
referenceNow = calculationTime
```

without an explicit request/policy establishing that equivalence.

Rules:

- Timezone and location identities must remain attached to relevant time-state inputs.
- No implicit local-machine timezone authority.
- `calculatedAt` records processing/audit time and must not replace `calculationTime`.

---

## 14. Location / Observer Context

Calculation inputs that depend on location/observer context must preserve the exact context required for reproducibility.

Conceptually account for:

- location identity;
- latitude/longitude where applicable;
- timezone identity;
- timezone offset/rule context where applicable;
- observer/reference location semantics;
- source/provenance of user-supplied location where relevant.

Do **not** define coordinate precision, geocoder, map provider, GPS behavior, or timezone library. A UI display name must **not** substitute for authoritative calculation coordinates/context where precise calculation requires more information.

---

## 15. Error / Incomplete / Ambiguous Calculation State

Do not force a snapshot to pretend success.

```text
failure / blocked outcome
≠ completed Calculation Snapshot
```

CALC must distinguish:

```text
successful calculation
or explicitly bounded partial calculation
→ may issue a Calculation Snapshot

pre-calculation block
invalid request
fatal calculation failure
→ must not masquerade as a completed Calculation Snapshot
```

A partial Calculation Snapshot is allowed only if:

- the partial scope is explicit;
- the calculated facts actually produced are clearly bounded;
- incompleteness is recorded;
- absence of facts is not treated as zero/false/not-applicable;
- it does not pretend full completion.

A blocked/invalid/fatal attempt with no valid calculated output must **not** produce an authoritative-looking completed snapshot.

CALC may conceptually support outcomes such as:

- completed calculation;
- bounded partial calculation;
- blocked by unresolved taxonomy;
- blocked by missing policy;
- invalid input;
- ambiguous input;
- unsupported calculation scope;
- calculation error;
- provenance incomplete.

A blocked, invalid, or failed attempt may conceptually be recorded as a calculation attempt / outcome record; the exact artifact name/schema is deferred, and no new executable artifact type is forced here.

---

## 16. Taxonomy Conflict Interaction

Carried forward from `ASTRO-TAXONOMY-001`:

```text
UNRESOLVED taxonomy conflict
→ may block or constrain calculation
```

CALC must **not**:

- resolve taxonomy conflicts itself;
- guess which same-named concept the caller intended.

---

## 17. Validation Boundary

CALC produces:

```text
Immutable Calculation Snapshot
```

VALID produces separately:

```text
Validation Record
```

- The Validation Record must reference the exact immutable snapshot identity being validated. The Validation Record may also retain the applicable snapshot contract/format version where relevant for provenance or compatibility.
- CALC must **not** write validation status into the snapshot as if CALC owned validation authority.
- If a UI wants to show validation state, that state comes from the Validation Record, not snapshot mutation.
- A snapshot's immutability holds regardless of whether VALID later records passed, failed, rejected, or inconclusive status:

```text
snapshot immutability
≠ validation acceptance
```

Preserved ARCH rule:

```text
Calculation Snapshot
is not admissible to Explanation / Strategy
until an accepted/passed Validation Record
exists for the exact immutable snapshot.
```

Exact VALID methodology is **not** defined here.

---

## 18. Snapshot Identity and Versioning

Conceptually distinguish:

```text
Snapshot identity
Snapshot contract/format version
Calculation-policy version
Taxonomy version
Engine/version
```

Do **not** conflate them.

```text
Snapshot identity
= identity of one immutable calculation artifact.

Snapshot contract/format version
= version of the snapshot's structure/format,
  where versioned separately.
```

Rules:

- A snapshot identity never changes once issued. It is **not** revised in place:

```text
snapshot X v1
→ edit/revise
→ snapshot X v2
```

is **not** the model. Instead:

```text
snapshot X
→ immutable historical artifact

new calculation
→ snapshot Y
```

- Snapshot identity immutability is independent of validation state (Section 9).
- Changes to taxonomy labels alone should not necessarily alter calculated meaning if canonical identity remains stable, but the historical snapshot must remain interpretable against the taxonomy version used.
- Material calculation-policy/input changes create a new snapshot identity.
- Any lineage/grouping/version-family semantics that may be useful later are deferred.
- No exact ID syntax is defined.

---

## 19. Provenance

Every calculation should preserve enough provenance to answer:

```text
What was calculated?
Using which canonical identities?
For what time/location context?
Using which calculation policy/version?
Using which source-authority lineage where applicable?
By which calculation engine/version where applicable?
When was the snapshot created?
```

Provenance must not be fabricated by AI. Unknown provenance must remain unknown/incomplete.

---

## 20. AI Boundary

AI may assist:

- request preparation;
- ambiguity detection;
- explaining missing inputs;
- comparing candidate policies for human review;
- explaining a completed validated result downstream.

AI may **not**:

- invent calculated facts;
- replace Calculation Authority;
- silently select formulas;
- silently alter inputs;
- silently resolve taxonomy conflicts;
- mark a calculation validated;
- mutate Calculation Snapshots;
- use model memory as numerical authority.

---

## 21. UI / Renderer Boundary

UI is not Calculation Authority.

```text
Rendered position
≠ calculated fact
```

unless it is explicitly derived from a referenced Calculation Snapshot.

- UI geometry cannot create planetary/house/time facts.
- Dragging a chart object must not mutate calculated facts unless it intentionally creates a new calculation request and new snapshot.

No runtime UI behavior is authorized here.

---

## 22. User / Human Boundary

Human Decision Authority remains final for decisions, but human interaction does not silently rewrite calculated facts.

A user may:

- choose among explicitly presented calculation policies once such policies are authorized;
- correct input information;
- request recalculation;
- reject/use/not-use results.

A user may **not** convert manual editing of calculated output into Calculation Authority without a new recorded calculation/provenance path.

---

## 23. Calculation Scope / Partial Calculation

A Calculation Snapshot may cover a bounded calculation scope.

Conceptual examples:

- astronomical positions only;
- time-state conversion only;
- chart geometry facts;
- house-placement facts;
- calendrical facts;
- other future bounded calculation packages.

Actual V1 scope is **not** defined here.

Rules:

- The snapshot must identify what it did and did not calculate.
- A partial snapshot is admissible only when its partial scope is explicit, its incompleteness is recorded, and it does not pretend full completion (Section 15).
- Absence of a calculated fact must **not** be interpreted as zero/false/not-applicable automatically.

---

## 24. Dependency / Engine Boundary

No implementation dependencies are chosen.

Future calculation engines/libraries must be independently reviewed for:

- formula behavior;
- precision;
- supported domains;
- version behavior;
- provenance;
- reproducibility;
- license constraints.

Dependency availability alone does **not** confer Calculation Authority. License admissibility remains separate from technical correctness.

---

## 25. Downstream Contract to ASTRO-VALID-001

For an issued Calculation Snapshot, CALC makes available the immutable information VALID needs to evaluate that exact snapshot. At minimum conceptually:

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

Blocked / invalid / fatal non-snapshot outcomes are outside the snapshot-validation handoff. Their future handling / artifact model is deferred.

VALID may produce a separate Validation Record. VALID must not need to infer critical inputs from UI text.

---

## 26. Roadmap Integrity

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

- `ASTRO-CALC-001` occupies the Calculation Authority stage only; it does not reorder, insert, or remove any stage.
- `ASTRO-SKY` remains lateral and deferred. Completing `ASTRO-CALC-001` does **not** authorize ASTRO-SKY implementation, because VALID is still required and SKY has its own authority constraints.

---

## 27. Open Questions / Deferred Decisions

Explicitly deferred, no decision made here:

- exact formula corpus;
- formula authority source selection;
- ephemeris;
- house systems;
- zodiac mode;
- ayanamsha;
- calendar algorithms;
- astronomical engine/library;
- timezone library/data source;
- geographic provider;
- numerical precision;
- rounding policy;
- coordinate reference conventions;
- snapshot serialization;
- database/storage;
- checksum/hash algorithm;
- snapshot ID syntax;
- executable schema;
- exact enums;
- runtime APIs;
- caching;
- performance;
- batch calculations;
- migration;
- actual V1 calculation scope;
- validation methodology;
- licensing approvals.

---

## 28. Required Non-Goals

No:

- runtime implementation;
- TypeScript schema;
- database schema;
- API design;
- UI implementation;
- formula selection;
- formula implementation;
- ephemeris selection;
- house-system selection;
- zodiac-mode selection;
- ayanamsha selection;
- dependency selection;
- license approval;
- validation implementation;
- interpretive rules;
- strategic recommendation logic;
- SKY implementation authorization.

---

## 29. Decision Summary

- **Calculation Authority ownership** established: the only producer of calculated facts and immutable Calculation Snapshots.
- **Upstream input contract** established: CALC consumes reviewed Source and Taxonomy authority; no hidden defaults.
- **Calculation Request / Context model** established (conceptual; no executable schema).
- **Immutable Calculation Snapshot model** established (conceptual; no executable schema).
- **Snapshot identity vs version** separated: snapshot identity (immutable artifact) is distinct from snapshot contract/format version, calculation-policy version, taxonomy version, and engine/version; an issued snapshot is never revised in place.
- **Immutability rule** established: an issued snapshot is immutable immediately regardless of later validation state; recalculation creates a new snapshot identity, not a revision of an issued snapshot.
- **Failure/blocked outcome boundary** established: a blocked/invalid/fatal attempt must not masquerade as a completed Calculation Snapshot; partial snapshots require explicit bounded scope and recorded incompleteness.
- **Calculated-fact boundary** established: calculated fact ≠ validated fact ≠ rule-derived finding ≠ interpretation ≠ strategic guidance.
- **Formula/policy reference boundary** established: explicit calculation-policy identity/version, not hidden defaults; no formula selected.
- **Determinism/reproducibility principle** established with bounded, internally consistent wording; no bit-for-bit guarantee before engine/platform/precision policy selection.
- **Time-state discipline** carried forward: `referenceNow` / `selectedEventTime` / `calculationTime` / `calculatedAt` remain distinct.
- **Location/observer discipline** established: exact context preserved; UI display names do not substitute.
- **Error/incomplete/ambiguous states** established: failures/blocked outcomes are not dressed up as completed snapshots; absence of facts is not zero/false/not-applicable.
- **Taxonomy-conflict interaction** established: unresolved conflicts may block/constrain; CALC does not resolve them.
- **Validation boundary** established: Validation Record is separate and references the exact immutable snapshot identity; snapshot immutability is independent of validation acceptance.
- **Provenance** established; **AI/UI/user boundaries** established.
- **Downstream VALID contract** established.
- **Roadmap unchanged**: `ASTRO-ARCH → … → ASTRO-STRATEGY`; ASTRO-SKY remains lateral and deferred.
- **No formula, ephemeris, house-system, zodiac, ayanamsha, dependency, or license choice** made.

```text
DOCUMENT_STATUS=CURRENT_LINEAGE_CALCULATION_AUTHORITY_BASELINE
WORK_TYPE=DOCS_ONLY
AUTHORITY_LAYER=CALCULATION_AUTHORITY_ONLY
ROADMAP_SEQUENCE_CHANGED=NO
```

---

*End of ASTRO-CALC-001. Docs-only calculation-authority baseline; no formulas, engines, dependencies, licenses, or runtime artifacts established.*
