# ASTRO-RULE-001 — Interpretive Rule Authority and Rule-Derived Finding Baseline

* **Document Date**: 2026-08-21
* **Work Type**: Docs-only (No code, UI, database, dependency, configuration, or asset changes)
* **Project Area**: Astro Strategy Lab
* **Document Class**: Current-lineage rule-authority baseline (new)

---

## Status

```text
DOCUMENT_STATUS=CURRENT_LINEAGE_RULE_AUTHORITY_BASELINE
WORK_TYPE=DOCS_ONLY
AUTHORITY_LAYER=RULE_AUTHORITY_ONLY
ROADMAP_SEQUENCE_CHANGED=NO
```

This document establishes how approved interpretive Knowledge Claims and validated calculation inputs may support exact, provenance-backed Rule-Derived Findings. It does not select, implement, or execute any actual astrological rule.

This document is:

- **not** implementation authorization;
- **not** an executable rule system, DSL, engine, schema, or database design;
- **not** a selection of any astrological rule, tradition, formula, ephemeris, house system, zodiac mode, or ayanamsha;
- **not** an interpretation-validation implementation;
- **not** a claim of universal astrological truth or a strategic recommendation.

---

## 1. Document Status and Authority

This baseline registers **Rule Authority governance only**. It does not calculate, validate, author Knowledge Claims, generate explanations, or decide strategy.

- **What it authorizes**: conceptual Rule Definition and Rule-Derived Finding records; exact rule/claim/input lineage; rule issuance and version lineage; scope, tradition, conflict, AI, UI, downstream, and interpretation-validation boundaries; and provenance/auditability requirements.
- **What it does not authorize**: executable rules, actual predicates, evaluation algorithms, rule priority, confidence or scoring, source/claim weighting, conflict resolution, or strategic recommendation logic.

Any downstream document that consumes a Rule Definition or Rule-Derived Finding must cite this baseline and cannot weaken its exact-version, scope, provenance, or input-safety requirements.

---

## 2. Upstream Contract and Scope

`ASTRO-ARCH-001` establishes this ordered authority hierarchy; `ASTRO-RULE-001` operates only at the Rule Authority layer:

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

This baseline consumes, without redesigning:

- issued Knowledge Claim versions and their scope/provenance contract from `ASTRO-KNOWLEDGE-001`;
- exact immutable Calculation Snapshot and accepted Validation Record/scope requirements from `ASTRO-VALID-001`;
- layer separation and interpretation-accuracy obligation from `ASTRO-ARCH-001`.

Historical runtime behavior is not promoted into Rule Authority. This document creates no source, taxonomy, calculation, validation, or knowledge authority.

---

## 3. Layer Separation

```text
Validated Calculated Fact
!= Interpretive Knowledge Claim
!= Rule Definition
!= Rule-Derived Finding
!= Explanation
!= Strategic Guidance
```

Preserved rules:

```text
Rule-Derived Finding
!= validated calculated fact
!= universal astrological truth
!= AI explanation
!= strategic recommendation
```

- CALC produces calculated facts.
- VALID records validation acceptance/outcome for those facts within a recorded scope.
- KNOW governs issued interpretive Knowledge Claims.
- RULE governs issued rule definitions and derives scoped findings under an exact rule version.
- EXPLAIN may explain permitted findings and provenance; it does not create them.
- STRATEGY remains a later authority layer; Human Decision Authority remains final.

### 3.1 What Rule Authority must not impersonate

Rule Authority must not impersonate:

- **Source Authority** — it does not decide source admissibility;
- **Taxonomy Authority** — it does not mint canonical identities;
- **Calculation Authority** — it does not compute or alter calculated facts;
- **Validation Authority** — it does not issue validation outcomes or make unvalidated facts admissible;
- **Knowledge Authority** — it does not author or issue Knowledge Claims;
- **Explanation AI** — it does not generate explanatory prose as a finding;
- **Strategic Guidance** — it does not issue recommendations;
- **Human Decision Authority** — it does not decide for the user.

---

## 4. Rule Definition Identity and Issuance Boundary

A **Rule Definition** is the conceptual governed unit of Rule Authority. No executable schema, syntax, DSL, or runtime representation is defined here.

A Rule Definition should account for, where applicable:

| Field | Meaning |
| :--- | :--- |
| Rule identity | Stable identity distinguishing one conceptual rule from another. |
| Rule version | The exact version being referenced or evaluated. |
| Tradition / school scope | The tradition(s)/school(s) in which the rule is meaningful. |
| Applicability / context scope | The conditions and context within which the rule may apply. |
| Required input identities/types | The kinds of facts, snapshots, canonical identities, and context required conceptually. |
| Conditions / predicates | Conceptual conditions only; not executable rule syntax. |
| Exclusions / limitations | Conditions where the rule must not be applied or must be qualified. |
| Supporting Knowledge Claim versions | Exact issued Knowledge Claim identity/version(s) that justify the rule. |
| Taxonomy / version references | Canonical identities and taxonomy versions consumed where applicable. |
| Issuance provenance | Governance provenance for authoritative issuance of this exact version. |
| Successor / supersession lineage | Historical relationship to later material changes. |

```text
candidate/draft rule
!= authoritative issued rule

rule existence
!= authoritative issuance

AI-generated rule candidate
!= authoritative issued rule
```

Authority arises only when an exact Rule Definition version is issued under approved Rule Authority governance. This baseline does not prescribe whether every future issuance requires manual human approval, unless an upstream authority later requires it.

Once issued, a Rule Definition version must retain immutable/auditable historical meaning, scope, supporting-claim references, and issuance provenance. A material semantic, scope, predicate, exclusion, or supporting-claim change requires explicit successor/new-version lineage; it must not silently mutate the issued version.

---

## 5. Knowledge Claim Binding and Rule Scope

An authoritative Rule Definition must reference the exact **issued** Knowledge Claim identity/version(s) supporting it. Claim existence, source ingestion, candidate status, or a generic claim topic is insufficient.

```text
Knowledge Claim scope
>= bounds
Rule scope
```

or equivalently:

```text
Rule scope
must remain within
the supportable scope of every required Knowledge Claim.
```

This applies to:

- proposition/meaning carried into the rule;
- tradition/school scope;
- applicability/context scope;
- canonical terminology and taxonomy version;
- qualifications, limitations, and exclusions.

No silent expansion is authorized across traditions, contexts, terminology, or qualifications. If a rule needs broader support, it requires a new supported rule candidate/version and approved Rule Authority governance; it must not infer broader authority from a narrower Knowledge Claim.

---

## 6. Input Safety and Calculation/Validation Boundary

Rule evaluation must conceptually bind to the exact required inputs. Where a rule depends on calculation facts, authoritative downstream use requires:

- the exact immutable Calculation Snapshot identity;
- an accepted/passed Validation Record for that exact snapshot;
- validation scope sufficient for every fact/claim consumed by the rule;
- required canonical identities and taxonomy/version context;
- applicable calculation, time-state, location/observer, and other recorded context.

```text
exact snapshot identity
without sufficient accepted validation scope
!= admissible authoritative rule input
```

Missing, not-yet-validated, rejected, blocked, error, inconclusive, failed, or insufficiently scoped inputs must not silently produce an authoritative Rule-Derived Finding. This is fail-closed for authoritative finding consumption, without collapsing those Validation Authority outcomes into one semantic state.

Rule Authority must not repair, replace, recalculate, or mutate a Calculation Snapshot. If different calculation output is needed, Calculation Authority must create a new snapshot with its own validation lineage.

No runtime evaluation outcome algorithm, executable status enum, or remediation flow is selected here.

---

## 7. Rule-Derived Finding Lineage

A **Rule-Derived Finding** is the conceptual output attributable to one exact issued Rule Definition version under explicit scope and inputs. No executable schema is created.

It should account for, where applicable:

| Field | Meaning |
| :--- | :--- |
| Finding identity | Stable identity for this finding artifact. |
| Exact Rule identity/version | The issued Rule Definition version evaluated. |
| Exact Knowledge Claim identities/versions | The issued claims supporting that rule version. |
| Exact Calculation Snapshot identity | The snapshot used, where calculation facts are required. |
| Validation Record identity/scope | Evidence that required consumed facts were accepted within sufficient validation scope. |
| Tradition / applicability scope | Scope under which the finding is attributable. |
| Relevant context / time-state | Recorded context actually used for the evaluation. |
| Evaluation provenance | How the finding was derived under the rule and inputs. |
| Qualifications / limitations / conflicts | Constraints that remain attached to the finding. |

```text
Rule-Derived Finding
→ exact issued Rule version
→ exact issued Knowledge Claim version(s)
→ exact Calculation Snapshot where used
→ sufficient Validation Record(s)/scope
→ relevant context/time-state
→ evaluation provenance
```

Re-evaluation with a new rule version, a new snapshot, a different accepted validation scope, or materially different context creates a new finding lineage. It must not silently rewrite a historical finding.

---

## 8. Tradition, Agreement, and Conflict Safety

```text
Rule from Tradition A
!= Rule from Tradition B

Rule disagreement
!= system error

Finding disagreement
!= automatic invalidity
```

Different valid rules or findings may coexist when their tradition/school, scope, provenance, or input context differs. Rule Authority must preserve material disagreement, qualifications, and exact lineage rather than silently merge them.

This baseline does not authorize majority voting, hidden precedence, confidence scoring, tradition ranking, automatic conflict resolution, source/claim weighting, or a rule-priority policy.

---

## 9. AI Boundary

AI may conceptually assist future workflows with:

- rule candidate extraction;
- mapping and comparison;
- documentation;
- provenance navigation;
- contradiction discovery.

```text
AI
!= Rule Authority
```

AI must not independently:

- issue authoritative rules or Rule-Derived Findings;
- change rule versions, supporting-claim bindings, or scope;
- resolve conflicting traditions as truth;
- convert prose, confidence, or formatting into authoritative finding status;
- invent provenance or make unvalidated inputs authoritative.

Authority must arise from approved Rule Authority governance, not model generation.

---

## 10. Interpretation-Accuracy and Downstream Boundaries

`ASTRO-RULE-001` preserves the `ASTRO-ARCH-001` obligation that interpretation accuracy is evaluated separately. It does not become the interpretation-validation layer or design that future authority/artifact model.

Rule provenance and Rule-Derived Findings may later become inputs to dedicated interpretation-validation work, subject to its future authority contract.

Explanation AI may consume Rule-Derived Findings only as scoped, provenance-backed findings. It must not silently broaden them into universal claims, overwrite their scope/qualifications, or represent them as calculated facts, validation outcomes, or strategic recommendations.

Strategic Guidance remains a later authority layer and cannot override validation, rule scope, or Human Decision Authority.

### 10.1 UI Boundary

Future UI must distinguish calculated facts, validation state, Knowledge Claims, Rule Definitions, Rule-Derived Findings, AI explanation, and strategic guidance. UI must not infer rule authority or finding status from AI prose, visual prominence, source popularity, number of agreeing sources, historical usage, or formatting.

---

## 11. Deferred Decisions and Non-Authorizations

Explicitly deferred, no decision made here:

- executable rule schema, DSL, or predicate syntax;
- rule engine and runtime evaluation algorithm;
- database/storage model;
- conflict-resolution policy, rule priority, and precedence;
- confidence/scoring and source/claim-weighting formulas;
- actual astrological rules or tradition selection;
- RAG/vector design;
- runtime UI;
- interpretation-validation implementation;
- strategic recommendation logic;
- dependency, license, formula, ephemeris, house-system, zodiac-mode, or ayanamsha selection.

---

## 12. Roadmap Integrity and Decision Summary

The roadmap remains unchanged:

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

- Rule Authority governance is established conceptually only.
- Exact issued Knowledge Claim versions bound rule authority and rule scope.
- Exact validated calculation inputs bound finding lineage where required.
- Rules and findings remain distinct from facts, explanation, strategic guidance, and universal truth.
- Historical issued rules/findings remain auditable through explicit successor lineage.
- No executable rules, implementation, formula, dependency, or tradition choice is authorized.

```text
DOCUMENT_STATUS=CURRENT_LINEAGE_RULE_AUTHORITY_BASELINE
WORK_TYPE=DOCS_ONLY
AUTHORITY_LAYER=RULE_AUTHORITY_ONLY
ROADMAP_SEQUENCE_CHANGED=NO
```

---

*End of ASTRO-RULE-001. Docs-only Rule Authority baseline; no executable rules, actual rule selection, runtime evaluation, dependencies, or implementation artifacts established.*
