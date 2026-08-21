# ASTRO-EXPLAIN-001 — Explanation AI Boundary and Evidence-Bound Explanation Baseline

* **Document Date**: 2026-08-21
* **Work Type**: Docs-only (No code, UI, database, prompt, model, dependency, configuration, or runtime changes)
* **Project Area**: Astro Strategy Lab
* **Document Class**: Current-lineage explanation-authority baseline (new)

---

## Status

```text
DOCUMENT_STATUS=CURRENT_LINEAGE_EXPLANATION_AUTHORITY_BASELINE
WORK_TYPE=DOCS_ONLY
AUTHORITY_LAYER=EXPLANATION_AI_BOUNDARY_ONLY
ROADMAP_SEQUENCE_CHANGED=NO
```

This document establishes the authority boundaries, evidence-binding rules, and auditability requirements for Explanation AI within Astro Strategy Lab. It defines how AI may explain and synthesize governed upstream artifacts without becoming an authority, without mutating upstream records, without silently broadening scope, and without issuing strategic guidance.

This document is:

- **not** an implementation of prompts, system prompts, prompt templates, or orchestration logic;
- **not** a selection of model providers, foundation models, weights, fine-tuning, or inference configurations;
- **not** a RAG, embedding, vector database, retrieval, or ranking implementation;
- **not** an interpretation-validation implementation or quality-scoring engine;
- **not** a strategic recommendation engine or decision scoring algorithm;
- **not** a runtime UI, API, or executable schema design.

---

## 1. Document Status and Authority

This baseline registers **Explanation AI boundary governance only**. It does not compute charts, validate calculations, author Knowledge Claims, issue Rule Definitions, derive authoritative findings, or decide strategy.

- **What it authorizes**: conceptual Explanation Output / Explanation Record definitions; evidence-binding invariants; upstream scope and qualification preservation; status semantics preservation; attribution and provenance requirements; multi-tradition conflict handling; unsupported assertion / hallucination boundaries; input immutability boundaries; downstream Strategic Guidance and Human Decision boundaries; and deferred-decision boundaries.
- **What it does not authorize**: prompt engineering, model selection, RAG pipelines, retrieval algorithms, context-window management policies, confidence scoring formulas, runtime hallucination detectors, executable schemas, runtime APIs, UI components, interpretation-validation implementation, or strategic recommendation algorithms.

Any downstream document that consumes, renders, or integrates Explanation AI outputs must cite this baseline and cannot weaken its evidence-binding, provenance, scope-preservation, or layer-separation requirements.

---

## 2. Upstream Authority Hierarchy and Scope

`ASTRO-ARCH-001` establishes the ordered authority hierarchy for Astro Strategy Lab; `ASTRO-EXPLAIN-001` operates exclusively at the Explanation AI boundary layer:

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

This baseline consumes, without redesigning or weakening:

- taxonomy definitions and canonical identities from `ASTRO-TAXONOMY-001`;
- immutable Calculation Snapshots from `ASTRO-CALC-001`;
- exact-snapshot validation requirements and Validation Records from `ASTRO-VALID-001`;
- issued Knowledge Claims and tradition-scope provenance from `ASTRO-KNOWLEDGE-001`;
- issued Rule Definitions, Rule-Derived Findings, and input validation requirements from `ASTRO-RULE-001`;
- layer separation, time-state consistency, and interpretation-accuracy obligations from `ASTRO-ARCH-001`.

Historical runtime behavior is not promoted into Explanation Authority. This document creates no source, taxonomy, calculation, validation, knowledge, or rule authority.

---

## 3. Layer Separation and Non-Impersonation Boundaries

```text
Validated Calculated Fact
!= Interpretive Knowledge Claim
!= Rule Definition
!= Rule-Derived Finding
!= Explanation Output
!= Strategic Guidance
```

Explanation AI is a downstream explanatory and synthesis layer. It receives governed upstream inputs and translates, annotates, or summarizes them for human understanding.

```text
AI Output
!= Source Authority
!= Calculation Authority
!= Validation Authority
!= Knowledge Authority
!= Rule Authority
!= Strategic Guidance Authority
!= Human Decision Authority
```

### 3.1 What Explanation AI Must Not Impersonate

Explanation AI must strictly avoid impersonating any other layer in the authority hierarchy:

| Impersonation Target | Boundary Violation | Governed Requirement |
| :--- | :--- | :--- |
| **Source Authority** | Generating citations from model memory or treating inadmissible material as source authority. | Consumes only sources admitted under approved Source Authority governance. |
| **Taxonomy Authority** | Inventing new astrological identities, redefining canonical terms, or creating competing glossaries. | Consumes canonical identities and terminology from `ASTRO-TAXONOMY-001` verbatim. |
| **Calculation Authority** | Computing planetary positions, house cusps, aspects, or time-state transitions in AI prose. | Calculated facts must come solely from immutable Calculation Snapshots. |
| **Validation Authority** | Declaring calculations valid/accurate, overriding validation failures, or bypassing validation gates. | Admissibility of calculated facts requires an accepted Validation Record with sufficient scope. |
| **Knowledge Authority** | Minting authoritative interpretive claims or presenting model hallucinations as traditional knowledge. | Interpretive claims must cite issued Knowledge Claim versions from `ASTRO-KNOWLEDGE-001`. |
| **Rule Authority** | Minting rules, evaluating unvalidated predicates, or issuing authoritative Rule-Derived Findings. | Rules and findings must reference issued Rule Definitions and findings from `ASTRO-RULE-001`. |
| **Strategic Guidance** | Recommending actions (do/wait/avoid/commit), issuing decision scores, or prioritizing choices. | Strategic recommendations remain solely the domain of `ASTRO-STRATEGY` / Human Authority. |
| **Human Decision Authority** | Preempting user choice, asserting universal truth, or deciding life actions for the user. | User retains sovereign Human Decision Authority; AI is inspectable advisory support only. |

---

## 4. Evidence-Bound Explanation and Upstream Scope Binding

An **Explanation Output** must be strictly attributable to the exact governed upstream artifacts used to generate it.

```text
Explanation Output
→ exact Calculation Snapshot(s) (where calculated facts are explained)
→ sufficient accepted Validation Record(s) (verifying fact validity)
→ exact issued Knowledge Claim version(s) (supporting interpretive statements)
→ exact issued Rule Definition version(s) (supporting rule logic)
→ exact Rule-Derived Finding(s) (supporting derived conclusions)
→ relevant tradition / school / applicability scope
→ material qualifications, exclusions, and known conflicts
```

### 4.1 Upstream Scope Preservation

```text
Upstream Governed Scope
>= bounds
Explanation Scope
```

Explanation AI must not silently broaden upstream scope:

1. **Tradition Scope**: A finding or claim scoped to Thai Solar/Lunar astrology must not be described as Vedic, Western, or universal astrology.
2. **Context Scope**: A claim scoped to natal interpretation must not be silently applied to mundane, horary, or electional contexts.
3. **Qualification Scope**: A rule qualified by specific exceptions, planetary dignity conditions, or orb limitations must preserve those qualifications in explanatory text.
4. **Terminology Scope**: Explanations must use canonical taxonomy terms without altering their semantic definitions.

If an upstream artifact has narrow support, the resulting explanation must reflect that narrow support. Model fluency must never be used to generalize narrow authority into broad claims.

---

## 5. Status Semantics and Truth Preservation

Explanation prose must accurately convey the exact state and governance level of all consumed inputs.

```text
Fluent Wording / Model Confidence
!= Authoritative Status
```

### 5.1 Status Mappings and Invariant Conversions

Explanation AI must never alter the semantics of upstream statuses:

| Upstream Status / State | Permitted Explanation Handling | Prohibited Conversion (Forbidden) |
| :--- | :--- | :--- |
| **Calculation Validation** | Distinguish accepted/passed from pending, unvalidated, failed, rejected, blocked, or inconclusive. | Converting `INCONCLUSIVE` / `PENDING` → `PASSED` or `FAILED`. |
| **Knowledge Claims** | Distinguish authoritative issued claims from candidate, draft, or disputed claims. | Converting `CANDIDATE` / `DRAFT` → `ISSUED_CLAIM`. |
| **Rule Definitions** | Distinguish issued rules from candidate rules or proposed heuristic mappings. | Converting unissued rule candidates into authoritative rules. |
| **Rule-Derived Findings** | Distinguish scoped findings from objective calculated facts or universal truths. | Converting `FINDING` → `CALCULATED_FACT` or `UNIVERSAL_TRUTH`. |
| **Disagreement / Conflict** | Present conflicting traditions or opposing findings as legitimate coexisting perspectives. | Converting `DISPUTED` / `CONFLICT` → `INVALID` or forcing single-truth consensus. |
| **Tradition Scope** | Explicitly label tradition-specific propositions (e.g., Thai Parichart, Jyotish, Hellenistic). | Converting tradition-specific knowledge into universal cosmological fact. |

---

## 6. Conceptual Explanation Output and Audit Provenance

An **Explanation Output** (or **Explanation Record**) is the conceptual artifact produced when Explanation AI explains governed inputs. No executable schema or serialization format is established here.

An Explanation Record should account for, where applicable:

| Field | Description |
| :--- | :--- |
| **Explanation identity** | Stable identity distinguishing this explanation artifact. |
| **Explanation version / timestamp** | Version and generation timestamp of the explanation. |
| **Exact Calculation Snapshot references** | Identity and version of Calculation Snapshots referenced. |
| **Validation Record references & scope** | Identity, version, and scope of Validation Records confirming input validity. |
| **Exact Knowledge Claim references** | Exact issued Knowledge Claim identities and versions cited. |
| **Exact Rule & Finding references** | Exact issued Rule Definition versions and Rule-Derived Finding identities cited. |
| **Tradition / school scope** | The tradition(s) or school(s) represented in the explanation. |
| **Context & time-state applied** | Explicit temporal, geographical, and situational context used during generation. |
| **Qualifications and conflicts preserved** | Material qualifications, limitations, or dissenting viewpoints explicitly captured. |
| **Generation provenance** | Metadata regarding how the explanation was generated (e.g., model identifier, configuration version, upstream input manifest). |
| **Publication / issuance state** | Lifecycle state (e.g., draft, generated, reviewed, presented) if tracked by downstream systems. |

Once generated, historical Explanation Records must remain auditable against the exact versions of the upstream artifacts from which they were produced.

---

## 7. Generation vs Authority

```text
Generated Explanation
!= Authoritative Upstream Truth
```

A generative AI model cannot create or confer authority through prose generation, rhetorical strength, or synthetic confidence.

Specifically, model generation cannot:

1. **Mint Calculated Facts**: The model cannot assert planetary coordinates, aspect angles, or house boundaries from internal parametric memory.
2. **Validate Calculations**: The model cannot declare a calculation accurate or verify numerical consistency.
3. **Issue Knowledge Claims**: The model cannot invent traditional meanings or issue authoritative claims without citing issued Knowledge Claims.
4. **Issue Rules or Findings**: The model cannot create authoritative rules or issue Rule-Derived Findings.
5. **Resolve Tradition Conflicts**: The model cannot declare one astrological tradition "correct" and another "incorrect" as universal truth.
6. **Erase Uncertainty**: The model cannot conceal missing data, inconclusive validation, or interpretive ambiguity.
7. **Create Strategic Guidance Authority**: The model cannot elevate explanatory narrative into binding strategic decisions.

---

## 8. Hallucination, Gap Handling, and Unsupported Claim Boundaries

Explanation AI must strictly avoid introducing material factual, interpretive, or causal assertions that lack support in permitted upstream artifacts.

```text
Unsupported Inference
!= Governed Explanation
```

### 8.1 Gap and Insufficiency Invariant

When upstream evidence is missing, incomplete, unvalidated, or ambiguous:

1. **Preserve Insufficiency**: Explanation AI must explicitly acknowledge data absence or validation incompleteness rather than inventing bridging facts or speculative interpretations.
2. **Fail-Closed on Unvalidated Inputs**: If required calculation facts lack an accepted Validation Record with sufficient scope, the explanation must not treat those facts as authoritative evidence.
3. **No Speculative Extrapolation**: The model must not extrapolate unrecorded astrological combinations, planetary strengths, or causal life predictions beyond what is explicitly authorized by issued Knowledge Claims and Rule-Derived Findings.

This document establishes the architectural requirement for evidence-boundedness; it does not design runtime hallucination detection algorithms or benchmark scoring systems.

---

## 9. Multi-Tradition, Conflict, and Agreement Preservation

Astro Strategy Lab recognizes that astrological traditions contain coexisting, differing, and sometimes mutually contradictory principles.

```text
Tradition A Finding
!= Tradition B Finding

Tradition Disagreement
!= System Error / Corruption
```

### 9.1 Multi-Tradition Invariants

1. **Attribution Preservation**: Every explanation drawing upon a specific tradition must clearly identify the school or tradition from which the interpretive claim originates.
2. **Disagreement Preservation**: When two valid traditions or rules produce differing findings for the same chart snapshot, Explanation AI must present both perspectives clearly rather than suppressing one.
3. **No Unilateral Consensus**: Explanation AI must not manufacture artificial harmony or synthesize a "hybrid consensus" unless such a synthesis is explicitly governed by an issued upstream Knowledge Claim.
4. **No Tradition Ranking**: Explanation AI must not rank traditions by "accuracy," "superiority," or "truth value" unless authorized by explicit future governance.

---

## 10. Input Immutability and Safety

Explanation AI operates strictly in a **read / interpret / synthesize** capacity relative to upstream artifacts.

```text
Explanation AI
cannot mutate
Upstream Artifacts
```

Explanation AI must never alter, overwrite, or mutate:

- an immutable Calculation Snapshot;
- a Validation Record or its validation status;
- an issued Knowledge Claim Record or its proposition text;
- an issued Rule Definition Record or its predicates;
- an issued Rule-Derived Finding Record or its lineage.

If an explanation identifies an apparent inconsistency, error, or gap in upstream artifacts, it cannot repair the artifact. Rectification must occur exclusively through the respective upstream authority layer issuing a new version.

---

## 11. Interpretation-Accuracy Validation Preservation

`ASTRO-ARCH-001` establishes that calculation consistency and interpretation accuracy must be evaluated separately:

```text
Calculation Validation (ASTRO-VALID-001)
!= Interpretation-Accuracy Validation (Deferred Dedicated Authority Task)
```

`ASTRO-EXPLAIN-001` establishes the boundary and evidence-binding requirements for Explanation AI. It does **not**:

- become the interpretation-accuracy validation execution layer;
- define the evaluation metric, test vectors, or oracle datasets for interpretation accuracy;
- issue validation records for AI prose;
- reopen or modify the deferred interpretation-validation mandate established in `ASTRO-ARCH-001` and preserved in `ASTRO-VALID-001`, `ASTRO-KNOWLEDGE-001`, and `ASTRO-RULE-001`.

Interpretation-accuracy validation remains a preserved, separate architectural obligation deferred to a later dedicated authority task.

---

## 12. Strategic Guidance and Human Decision Boundaries

Explanation AI provides clear, transparent, evidence-backed explanations to inform strategic deliberation. However:

```text
Explanation Output
!= Strategic Guidance
```

### 12.1 Strategic Guidance Boundary

Explanation AI must not issue action-oriented recommendations or strategic commitments:

1. **No Action Directives**: AI must not instruct the user to "act now," "postpone launch," "avoid investment," "sign contracts," or "execute strategy."
2. **No Decision Scoring**: AI must not generate risk-reward numerical ratings, decision confidence scores, or action rankings.
3. **No Timing Directives**: AI must not declare dates as "optimal" or "inauspicious" for action without explicit governance from `ASTRO-STRATEGY`.

Such capabilities belong strictly to the downstream `ASTRO-STRATEGY` layer.

### 12.2 Human Decision Sovereign Authority

```text
AI Explanation
→ Informs Human Decision Maker
→ Human Retains Sovereign Authority
```

Explanation AI must always maintain the posture of an inspectable, transparent advisory aid. It must never claim or imply that automated AI generation replaces human judgment, moral responsibility, or sovereign decision-making authority.

---

## 13. Deferred Decisions and Non-Authorizations

The following concerns are explicitly deferred; no design or selection is made in this baseline:

- model provider, foundation model family, parameter size, or hosting selection;
- system prompts, user prompt templates, few-shot examples, and metaprompt design;
- RAG architecture, chunking strategies, embeddings, and vector database selection;
- retrieval algorithms, re-ranking models, and context-window packing algorithms;
- confidence scoring formulas, calibration methods, and uncertainty quantification metrics;
- runtime hallucination detectors, grounding classifiers, and fact-checking pipelines;
- explanation quality scoring, readability metrics, and evaluation benchmarks;
- executable schema, JSON-LD, OpenAPI definitions, or serialization protocols for explanation records;
- runtime UI components, chat interfaces, planetarium overlays, or formatting themes;
- interpretation-validation implementation, test harnesses, and oracle datasets;
- strategic recommendation algorithms, decision trees, and guidance generation logic.

---

## 14. Roadmap Integrity and Decision Summary

The authoritative roadmap sequence remains preserved and unchanged:

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

- **Explanation AI Boundary** established: downstream explanatory layer bounded strictly by governed upstream evidence.
- **Layer Separation** maintained: Calculated Fact ≠ Validation Outcome ≠ Knowledge Claim ≠ Rule Definition ≠ Rule-Derived Finding ≠ Explanation Output ≠ Strategic Guidance.
- **AI Impersonation Prohibited**: AI != Source, Calculation, Validation, Knowledge, Rule, Strategic Guidance, or Human Decision Authority.
- **Evidence Binding & Scope Preservation**: explanations must cite exact snapshot, validation, claim, and rule versions, preserving all context and qualification scopes without silent broadening.
- **Status Semantics**: preserves all upstream statuses fail-closed; fluent text or synthetic confidence cannot confer authority.
- **Explanation Record**: conceptual audit structure defined covering exact references, context, tradition scope, qualifications, and generation provenance.
- **Generation vs Authority**: model generation cannot create truth, resolve tradition conflicts, or erase uncertainty.
- **Hallucination & Gap Handling**: material unsupported assertions prohibited; data absence or validation gaps preserved rather than filled.
- **Multi-Tradition Safety**: attribution and material disagreements preserved; no silent consensus or arbitrary tradition ranking.
- **Input Immutability**: Explanation AI is read-only regarding upstream artifacts; no silent mutation or repair.
- **Interpretation Validation**: separate deferred validation obligation from `ASTRO-ARCH-001` preserved and not reopened.
- **Strategic Guidance & Human Sovereignty**: action recommendations and decision scoring deferred to `ASTRO-STRATEGY`; Human Decision Authority remains sovereign.
- **Docs-Only Scope**: no runtime code, model, prompt, database, or UI artifacts authorized.

```text
DOCUMENT_STATUS=CURRENT_LINEAGE_EXPLANATION_AUTHORITY_BASELINE
WORK_TYPE=DOCS_ONLY
AUTHORITY_LAYER=EXPLANATION_AI_BOUNDARY_ONLY
ROADMAP_SEQUENCE_CHANGED=NO
```

---

*End of ASTRO-EXPLAIN-001. Docs-only explanation-authority baseline; no models, prompts, RAG pipelines, runtime schemas, or strategic logic established.*
