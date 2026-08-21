# ASTRO-KNOWLEDGE-001 — Interpretive Knowledge Authority, Tradition-Scope Provenance, and Knowledge Claim Baseline

* **Document Date**: 2026-08-20
* **Work Type**: Docs-only (No code, UI, database, dependency, configuration, or asset changes)
* **Project Area**: Astro Strategy Lab
* **Document Class**: Current-lineage knowledge-authority baseline (new)

---

## Status

```text
DOCUMENT_STATUS=CURRENT_LINEAGE_KNOWLEDGE_AUTHORITY_BASELINE
WORK_TYPE=DOCS_ONLY
AUTHORITY_LAYER=KNOWLEDGE_AUTHORITY_ONLY
ROADMAP_SEQUENCE_CHANGED=NO
```

This document is the **first current-lineage Knowledge Authority baseline** for Astro Strategy Lab. It establishes how authoritative interpretive knowledge claims are governed, how tradition/school scope and provenance are preserved, and how knowledge claims become referenceable by downstream layers.

This document is:

- **not** implementation authorization;
- **not** an executable astrology rule system;
- **not** a claim that any astrology tradition is universally correct;
- **not** a formula, ephemeris, house-system, zodiac-mode, or ayanamsha decision;
- **not** a dependency or license decision.

---

## 1. Document Status and Authority

This baseline registers **Knowledge Authority governance only**. It does not compute, validate, rule-derive, explain, or decide strategy.

- **What it authorizes**: the conceptual Knowledge Claim Record; knowledge-claim identity and version lineage; tradition/school-scope governance; agreement/disagreement preservation; the source-vs-knowledge distinction; the taxonomy boundary; the downstream Rule Authority contract; the validation/interpretation-accuracy boundary; the AI/UI boundaries; and provenance/auditability requirements.
- **What it does not authorize**: any calculated fact, any validation outcome, any executable rule, any AI-generated interpretation, any strategic recommendation, any formula, or any claim of universal astrological truth.

Any downstream document that consumes a Knowledge Claim must cite this baseline and cannot weaken the tradition-scope and provenance rules recorded here.

---

## 2. Purpose and Scope

Astro Strategy Lab is the **Personal Strategic Timing Advisor / Explainable Strategic Decision Workspace** (positioning recorded in `ASTRO-MARKET-001A`). For its guidance to remain explainable and safe, interpretive knowledge must be governed so that no tradition is collapsed into universal truth and every claim remains traceable to reviewed, qualified, tradition-scoped provenance.

This baseline exists to:

1. define what Knowledge Authority owns and what it must not impersonate;
2. define the conceptual Knowledge Claim Record;
3. preserve tradition/school scope so cross-tradition material is never silently merged into a universal claim;
4. separate source admissibility from knowledge-claim truth;
5. preserve agreement/disagreement instead of silently resolving it;
6. make claim versions immutable and auditable;
7. consume canonical identity from Taxonomy Authority without minting competing definitions;
8. define the downstream Rule Authority contract;
9. preserve the interpretation-accuracy obligation from `ASTRO-ARCH-001`;
10. define the AI and UI boundaries;
11. state deferred decisions.

This task does **not** create executable rules, does **not** select a tradition, does **not** implement scoring/consensus algorithms, and does **not** enumerate the full V1 knowledge corpus.

---

## 3. Authority Layer Boundary

### 3.1 Position in the authority hierarchy

`ASTRO-ARCH-001` establishes the following hierarchy; `ASTRO-KNOWLEDGE-001` operates **only within the Knowledge Authority layer**:

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

### 3.2 What Knowledge Authority owns

Knowledge Authority conceptually owns governance of authoritative interpretive knowledge claims, including:

- knowledge-claim identity and version lineage;
- normalized proposition and canonical subject/object references;
- tradition/school and applicability/context scope;
- originating source references and exact provenance;
- language/translation provenance where relevant;
- qualification, limitation, and known-disagreement references;
- claim status under Knowledge Authority policy;
- claim creation/issuance provenance.

### 3.3 What Knowledge Authority must not impersonate

`ASTRO-KNOWLEDGE-001` must not impersonate:

- **Source Authority** — it does not decide source admissibility;
- **Taxonomy Authority** — it does not mint canonical identity definitions;
- **Calculation Authority** — it does not compute calculated facts;
- **Validation Authority** — it does not issue validation outcomes;
- **Rule Authority** — it does not create executable rules or derive rule findings;
- **Explanation AI** — it does not generate explanations;
- **Strategic Guidance** — it does not issue strategic recommendations;
- **Human Decision Authority** — it does not decide for the user.

Knowledge Authority *governs reference knowledge*; it does not act as any other layer.

---

## 4. Evidence Classification and Inputs

### 4.1 Evidence discipline

`ASTRO-KNOWLEDGE-001` does not define or extend the evidence-class taxonomy. It consumes evidence classifications and lineage classifications established by `ASTRO-SOURCE-001` and their originating current-lineage authorities. No new evidence class is introduced here.

Historical repository material is inspected only as historical/compatibility evidence and is **not** promoted into current-lineage knowledge authority.

### 4.2 Inputs inspected for this baseline

| Input | Classification |
| :--- | :--- |
| `astro-arch-001-calculation-interpretation-time-state-and-authority-architecture-baseline.md` | Current-Lineage Authority |
| `astro-source-001-authoritative-source-register-and-admissibility-policy-baseline.md` | Current-Lineage Authority |
| `astro-taxonomy-001-canonical-identity-terminology-and-tradition-scope-taxonomy-baseline.md` | Current-Lineage Authority |
| `astro-calc-001-calculation-authority-and-immutable-calculation-snapshot-baseline.md` | Current-Lineage Authority |
| `astro-valid-001-validation-authority-and-exact-snapshot-validation-record-baseline.md` | Current-Lineage Authority |

QA counterparts were inspected only where needed to confirm invariants.

---

## 5. Layer Distinction

```text
Calculated Fact
!= Validated Calculated Fact
!= Interpretive Knowledge Claim
!= Rule-Derived Finding
!= Explanation
!= Strategic Guidance
```

Explicitly preserved:

```text
Knowledge Claim != Calculated Fact
Knowledge Claim != Validation Outcome
Knowledge Claim != Executable Rule
Knowledge Claim != AI-generated interpretation
Knowledge Claim != Strategic Recommendation
```

- CALC produces calculated facts.
- VALID records validation acceptance/outcome.
- KNOW governs interpretive knowledge claims.
- RULE derives rule findings under a stated rule system.
- EXPLAIN interprets validated facts, permitted knowledge, and provenance.
- STRATEGY produces strategic guidance; the human decides.

---

## A. Authority Boundary

Knowledge Authority owns governance of authoritative interpretive knowledge claims. It must **not** impersonate Source, Taxonomy, Calculation, Validation, Rule, Explanation, Strategic Guidance, or Human Decision Authority (Section 3.3).

```text
AI != Knowledge Authority
```

AI must **not** independently mint, promote, alter, or confer authoritative status on a Knowledge Claim.

---

## B. Source / Knowledge Distinction

```text
Source admissibility
!=
Knowledge-claim truth
```

An admissible source may contain:

- tradition-specific assertions;
- historical interpretations;
- disputed interpretations;
- contextual qualifications;
- disagreements with other admissible sources.

Knowledge Authority must **not** convert source admissibility into universal truth. A source being admissible to Source Authority does not mean every assertion in it is a canonical knowledge claim.

---

## C. Knowledge Claim Identity

A **Knowledge Claim Record** is the conceptual unit of Knowledge Authority. This is conceptual architecture only; no executable schema is created.

It should account for, where applicable:

| Field | Meaning |
| :--- | :--- |
| Knowledge Claim identity | A stable identity distinguishing this claim from every other. |
| Claim version / revision identity | The version lineage of this claim (Section F). |
| Normalized proposition | The reviewed, normalized statement of the claim. |
| Canonical subject/object identities | Reviewed canonical identities from Taxonomy Authority. |
| Tradition / school scope | Which tradition(s)/school(s) the claim speaks to. |
| Applicability / context scope | The context within which the claim applies. |
| Originating source reference(s) | The reviewed Source Record(s) supporting the claim. |
| Exact provenance | The provenance chain of the claim. |
| Source location / passage reference | Exact locator/passage where available. |
| Terminology / taxonomy version | The taxonomy version in force. |
| Language / translation provenance | Translation provenance and uncertainty where relevant. |
| Qualification / limitation | Stated limits and qualifications of the claim. |
| Known disagreement / contradiction references | References to conflicting admissible claims. |
| Status under Knowledge Authority policy | The claim's status under governance. |
| Creation / issuance provenance | How and when the claim was issued. |

No executable JSON/database/TypeScript schema is defined here.

### C.1 Claim Scope Bounded by Evidence

An authoritative Knowledge Claim must not state, imply, or inherit a proposition, tradition scope, applicability scope, or qualification broader than the supporting evidence and applicable authority lineage justify.

```text
Supporting Evidence Scope
>= bounds
Knowledge Claim Scope
```

or equivalently:

```text
Knowledge Claim Scope
must remain within
the supportable evidence scope.
```

This applies to:

- normalized proposition;
- tradition/school scope;
- applicability/context scope;
- qualifications/limitations.

Required invariants:

```text
Evidence supports proposition A
under Tradition T
and Context C
```

does **not** authorize:

```text
A across all contexts in T
```

and does **not** authorize:

```text
A across all traditions.
```

```text
Narrow evidence
!= broad authoritative claim
```

- Absence of an explicit qualification must **not** silently expand scope.
- Any material expansion of proposition or scope requires a new candidate/new version as appropriate, with supporting evidence and approved Knowledge Authority governance.
- No scoring algorithms or evidence-weight formulas are defined here.

### C.2 Translation / Normalized Proposition Lineage

Conceptually distinguish:

```text
Original-language source wording

!=

Translated rendering

!=

Normalized Knowledge Proposition
```

These must remain traceable as distinct conceptual representations when translation/normalization exists.

Rules:

- Original wording remains traceable.
- Translation provenance must remain explicit.
- Normalized proposition must remain traceable to the original wording and any translation used.
- Semantic equivalence between original, translation, and normalized proposition must **not** be silently assumed where material uncertainty exists; translation uncertainty must remain inspectable.
- Qualifications and limitations must remain inspectable.
- A translation must **not** silently override original source meaning.
- A material translation correction or materially changed normalized proposition requires explicit version/successor lineage as appropriate.

The upstream Source Authority distinction between source artifact and translation artifact is preserved where applicable. No translation engine or implementation method is chosen here.

---

## D. Tradition-Scope Governance

```text
Tradition A interpretation
!=
Tradition B interpretation
```

Thai astrology, Chinese metaphysics, Western astrology, or any other tradition/school must **not** be silently collapsed into one universal claim.

- Cross-tradition agreement may be recorded as comparison evidence, but does **not** automatically establish universal astrological truth.
- Cross-tradition disagreement must remain inspectable.
- Each claim records its tradition/school scope explicitly.

---

## E. Agreement / Disagreement

```text
Multiple-source agreement
!=
universal truth

Source disagreement
!=
system error

Tradition disagreement
!=
invalid knowledge
```

Knowledge Authority must **preserve** material disagreement, scope, provenance, and qualification rather than silently resolve it.

---

## F. Claim Versioning / Immutability

Once an authoritative Knowledge Claim Record/version is issued, its historical meaning and provenance must remain auditable.

- A later correction, refinement, translation correction, or scope change must **not** silently rewrite historical authority.
- Use explicit successor/version lineage.
- Implementation details are not prescribed here.

### F.1 Authoritative Issuance Boundary

A clear conceptual lifecycle distinction is maintained:

```text
extracted/candidate knowledge
draft/preparation/curation record
authoritative issued Knowledge Claim version
```

These are not a runtime state machine.

```text
Record existence
!= authoritative issuance

Source ingestion
!= authoritative issuance

Candidate extraction
!= authoritative issuance

AI-generated candidate
!= authoritative issuance

Curation/preparation
!= authoritative issuance
```

Authority arises only when an exact Knowledge Claim version is issued under approved Knowledge Authority governance.

- An issued authoritative version must retain immutable/auditable historical meaning, scope, provenance, and issuance identity.
- Later correction/refinement/scope change must **not** silently mutate the issued version; use successor/version lineage where material.

```text
creation/preparation provenance
≠
authoritative issuance provenance
```

These are separated, not combined into one lifecycle event. Authoritative status is authoritative status **within the recorded scope**; it is not a claim of absolute astrological truth. This baseline does **not** require manual human approval for every future issuance unless upstream architecture requires it.

### F.2 Downstream Issued-Status Safety

A future Rule Authority consumer must not rely merely on:

- claim identity;
- claim existence;
- source reference;
- candidate status.

It must conceptually verify:

1. exact Knowledge Claim identity/version;
2. authoritative issued status under approved governance;
3. tradition/school scope;
4. applicability/context scope sufficient for intended use;
5. relevant provenance lineage.

```text
Exact claim reference
without issued authoritative status
is insufficient for authoritative downstream consumption.
```

Candidate/draft claims must **not** silently become Rule Authority inputs. Knowledge Authority still does **not** create executable rules.

---

## G. Taxonomy Boundary

Knowledge Authority consumes canonical identity and terminology from `ASTRO-TAXONOMY`.

- It must **not** mint competing canonical identity definitions.
- If a source uses historical/variant terminology, preserve source wording/provenance while linking it to canonical taxonomy where legitimately mapped.
- Do **not** silently equate unresolved terms.

---

## H. Downstream Rule Authority Contract

Rule Authority must **not** consume vague prose as if it were an unscoped universal truth.

A downstream Rule should be able to reference, conceptually:

- exact Knowledge Claim identity/version;
- tradition/school scope;
- applicable context;
- provenance lineage.

Knowledge Authority itself does **not** create executable rules.

```text
Knowledge Claim
!=
Rule-Derived Finding
```

---

## I. Validation / Interpretation-Accuracy Boundary

This baseline does **not** reopen `ASTRO-VALID-001`.

Preserved: the `ASTRO-ARCH-001` obligation that interpretation accuracy must be evaluated separately.

- `ASTRO-KNOWLEDGE-001` may provide authoritative reference knowledge that later interpretation-validation can cite.
- Knowledge Authority itself must **not** silently become the interpretation-validation execution layer.

---

## J. AI Boundary

AI may conceptually assist future workflows with:

- retrieval;
- indexing;
- comparison;
- summarization;
- candidate extraction;
- contradiction discovery;
- provenance navigation.

But:

```text
AI output
!= authoritative Knowledge Claim
```

unless and until it passes the future approved Knowledge Authority issuance/governance process.

- This baseline does **not** require human manual approval for every future claim unless upstream architecture explicitly requires it.
- Authority must come from approved Knowledge Authority governance, not merely model generation.

---

## K. UI / Explainability Boundary

Future UI must be able to distinguish:

- calculated fact;
- validation state;
- knowledge claim;
- rule-derived finding;
- AI explanation;
- strategic guidance.

UI must **not** infer authoritative knowledge status from:

- AI wording;
- visual prominence;
- source popularity;
- number of agreeing sources;
- historical usage;
- formatting.

---

## L. Deferred Decisions

Explicitly deferred, no decision made here:

- executable Knowledge Claim schema;
- concrete storage/database design;
- embedding/vector design;
- RAG implementation;
- claim extraction implementation;
- ontology implementation beyond approved taxonomy;
- scoring/confidence formulas;
- source weighting formulas;
- consensus algorithms;
- conflict-resolution algorithms;
- tradition-selection policy;
- actual interpretive rule implementation;
- runtime UI implementation.

These require future dedicated tasks.

---

## M. Roadmap Integrity

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

- `ASTRO-KNOWLEDGE-001` occupies the Knowledge Authority stage only; it does not reorder, insert, or remove any stage.
- `ASTRO-SKY` remains lateral and deferred; `ASTRO-KNOWLEDGE-001` does **not** authorize ASTRO-SKY implementation.

---

## N. Decision Summary

- **Knowledge Authority ownership** established: governance of authoritative interpretive knowledge claims.
- **Layer distinction** established: calculated fact ≠ validated fact ≠ interpretive knowledge claim ≠ rule-derived finding ≠ explanation ≠ strategic guidance.
- **Source/knowledge distinction** established: source admissibility ≠ knowledge-claim truth.
- **Knowledge Claim Record** established (conceptual; no executable schema).
- **Claim scope bound to evidence** established: supporting evidence bounds claim scope; narrow evidence ≠ broad authoritative claim.
- **Authoritative issuance boundary** established: candidate/draft/record existence ≠ authoritative issuance; only issued versions under approved governance carry authority.
- **Translation/proposition lineage** established: original wording, translation, and normalized proposition remain distinct, traceable, and not silently equivalent.
- **Tradition-scope governance** established: no silent cross-tradition collapse; disagreement preserved and inspectable.
- **Agreement/disagreement** preserved: agreement ≠ universal truth; disagreement ≠ error/invalid.
- **Claim versioning/immutability** established: no silent rewrite of historical authority.
- **Taxonomy boundary** established: consume canonical identity; do not mint competing definitions.
- **Downstream Rule contract** established: Rules reference exact claim identity/version, scope, context, and provenance.
- **Interpretation-accuracy obligation** preserved and not reopened.
- **AI/UI boundaries** established: `AI != Knowledge Authority`.
- **Roadmap unchanged**; ASTRO-SKY remains lateral and deferred.
- **No formula, rule, tradition, dependency, or license choice** made.

```text
DOCUMENT_STATUS=CURRENT_LINEAGE_KNOWLEDGE_AUTHORITY_BASELINE
WORK_TYPE=DOCS_ONLY
AUTHORITY_LAYER=KNOWLEDGE_AUTHORITY_ONLY
ROADMAP_SEQUENCE_CHANGED=NO
```

---

*End of ASTRO-KNOWLEDGE-001. Docs-only knowledge-authority baseline; no executable rules, formulas, tradition selections, dependencies, licenses, or runtime artifacts established.*
