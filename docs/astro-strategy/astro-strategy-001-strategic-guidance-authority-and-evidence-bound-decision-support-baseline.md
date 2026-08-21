# ASTRO-STRATEGY-001 — Strategic Guidance Authority and Evidence-Bound Decision-Support Baseline

* **Document Date**: 2026-08-21
* **Work Type**: Docs-only (No code, UI, database, recommendation engine, scoring algorithm, dependency, configuration, or runtime changes)
* **Project Area**: Astro Strategy Lab
* **Document Class**: Current-lineage strategy-authority baseline (new)

---

## Status

```text
DOCUMENT_STATUS=CURRENT_LINEAGE_STRATEGY_AUTHORITY_BASELINE
WORK_TYPE=DOCS_ONLY
AUTHORITY_LAYER=STRATEGIC_GUIDANCE_AUTHORITY_ONLY
ROADMAP_SEQUENCE_CHANGED=NO
```

This document establishes the authority boundaries, evidence-binding rules, risk/opportunity semantics, and human sovereignty invariants for Strategic Guidance within Astro Strategy Lab. It defines how governed astrological evidence, explanatory synthesis, and user-provided real-world decision context may combine to support human strategic deliberation without converting interpretive guidance into deterministic fate, without hiding uncertainty, and without displacing Human Decision Authority.

This document is:

- **not** an implementation of a runtime recommendation engine, decision tree, or optimization algorithm;
- **not** a scoring, ranking, confidence, probability, or "good day percentage" calculation formula;
- **not** a selection of actual astrological timing rules, predictive techniques, or tradition preferences;
- **not** an authorization for autonomous execution of any real-world transaction or commitment;
- **not** an interpretation-validation implementation or prediction-accuracy validation record;
- **not** a runtime UI, API, database, or executable schema design.

---

## 1. Document Status and Authority

This baseline registers **Strategic Guidance governance only**. It does not compute charts, validate calculations, author Knowledge Claims, issue Rule Definitions, derive authoritative findings, generate base AI explanations, or make human decisions.

- **What it authorizes**: conceptual Strategic Guidance Record / Decision Support models; human sovereignty invariants; evidence-binding and provenance requirements for strategic options; upstream scope preservation; status semantics and uncertainty preservation; real-world user context separation; multi-tradition conflict handling; behavioral timing framing boundaries; risk/opportunity signal semantics; autonomy and non-execution boundaries; anti-deterministic fate invariants; and deferred-decision boundaries.
- **What it does not authorize**: recommendation algorithms, decision scoring formulas, confidence calibration models, tradition ranking policies, autonomous execution agents, runtime APIs, UI components, interpretation-validation implementation, or deterministic prediction rules.

Any downstream document that consumes, renders, or integrates Strategic Guidance must cite this baseline and cannot weaken its human sovereignty, evidence-binding, provenance, or non-execution requirements.

---

## 2. Upstream Authority Hierarchy and Scope

`ASTRO-ARCH-001` establishes the ordered authority hierarchy for Astro Strategy Lab; `ASTRO-STRATEGY-001` operates at the Strategic Guidance layer immediately preceding sovereign Human Decision Authority:

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

- canonical identities and taxonomy definitions from `ASTRO-TAXONOMY-001`;
- immutable Calculation Snapshots from `ASTRO-CALC-001`;
- exact-snapshot validation outcomes and records from `ASTRO-VALID-001`;
- issued Knowledge Claims and tradition provenance from `ASTRO-KNOWLEDGE-001`;
- issued Rule Definitions, Rule-Derived Findings, and input safety rules from `ASTRO-RULE-001`;
- explanation boundary, evidence binding, and provenance requirements from `ASTRO-EXPLAIN-001`;
- layer separation, time-state consistency, and interpretation-accuracy obligations from `ASTRO-ARCH-001`.

Historical runtime behavior is not promoted into Strategy Authority. This document creates no source, taxonomy, calculation, validation, knowledge, rule, or explanation authority.

---

## 3. Layer Separation and Authority Non-Impersonation

```text
Validated Calculated Fact
!= Interpretive Knowledge Claim
!= Rule Definition
!= Rule-Derived Finding
!= Explanation Output
!= Strategic Guidance
!= Human Decision
```

Strategic Guidance is a downstream decision-support and advisory layer. It synthesizes governed astrological findings, explanations, and user-provided decision context to illuminate trade-offs and options for human consideration.

```text
Strategic Guidance
!= Calculation Authority
!= Validation Authority
!= Knowledge Authority
!= Rule Authority
!= Explanation AI
!= Human Decision Authority
```

### 3.1 What Strategic Guidance Must Not Impersonate

Strategic Guidance must strictly avoid impersonating any other layer in the authority hierarchy:

| Layer | Boundary Violation (Forbidden) | Governed Requirement |
| :--- | :--- | :--- |
| **Source Authority** | Fabricating source citations or establishing historical source admissibility. | Consumes only sources admitted under approved Source Authority governance. |
| **Taxonomy Authority** | Minting new astrological or strategic entity identities outside taxonomy governance. | Consumes canonical terminology and identities from `ASTRO-TAXONOMY-001`. |
| **Calculation Authority** | Calculating or recalculating planetary positions, house cusps, or transit timings. | Consumes calculated facts solely from immutable Calculation Snapshots. |
| **Validation Authority** | Overriding validation failures, certifying calculation accuracy, or using unvalidated facts. | Admissibility of facts requires an accepted Validation Record with sufficient scope. |
| **Knowledge Authority** | Authoring or issuing new traditional knowledge claims. | Interpretive claims must cite issued Knowledge Claims from `ASTRO-KNOWLEDGE-001`. |
| **Rule Authority** | Minting interpretive rules or deriving authoritative rule findings. | Rules and findings must reference issued Rule Definitions from `ASTRO-RULE-001`. |
| **Explanation AI** | Treating strategic framing as base descriptive explanation without explicit guidance rationale. | Distinguishes base explanation from strategic framing and decision synthesis. |
| **Human Decision Authority** | Making binding decisions, committing user resources, or claiming sovereign authority. | Human Decision Authority remains sovereign, final, and irreplaceable. |

---

## 4. Sovereign Human Decision Authority and Recommendation Non-Coercion

Astro Strategy Lab is designed as an **Explainable Strategic Decision Workspace** and **Personal Strategic Timing Advisor** (recorded in `ASTRO-MARKET-001A`). Its core philosophy centers on human agency:

```text
Strategic Guidance
→ Informs and Frames Options
→ User Deliberates
→ Human Makes Sovereign Decision
```

### 4.1 Recommendation Invariants

Strategic Guidance may:

1. **Frame Scenarios and Options**: Present viable paths, trade-offs, and considerations based on astrological signals and user context.
2. **Highlight Timing Windows**: Surface periods that may be favorable for specific behavioral modes (e.g., preparing, testing, negotiating, observing, reviewing, or preserving strength).
3. **Surface Opportunities and Risks**: Highlight supportive factors and friction points for human evaluation.
4. **Explain Underlying Rationale**: Provide transparent, inspectable evidence tracing every suggestion back to governed sources.

Strategic Guidance must **never**:

```text
Recommendation
!= Command
!= Compulsion
!= Guaranteed Outcome
!= Destiny
!= Irreversible Authority
```

1. **No Coercive Directives**: Guidance must not use language implying the user is compelled or obligated to act (e.g., "You must execute this trade now," "You are destined to fail unless you sign today").
2. **No Claim of Irreversible Authority**: Guidance cannot bind the user or override human dissent. The user may always ignore, modify, or reject any strategic suggestion without system penalty.

---

## 5. Evidence-Bound Strategic Guidance and Upstream Traceability

Every material strategic recommendation or advisory framing must remain strictly attributable to the exact governed upstream artifacts actually used.

```text
Strategic Guidance Record
→ exact Calculation Snapshot(s) (where calculations inform timing or charts)
→ sufficient accepted Validation Record(s) (verifying calculation integrity)
→ exact issued Knowledge Claim version(s) (supporting interpretive rationale)
→ exact issued Rule Definition version(s) (supporting rule logic)
→ exact Rule-Derived Finding(s) (supporting derived conclusions)
→ Explanation Output reference (where explanatory synthesis is consumed)
→ User Decision Context reference (identifying real-world user parameters)
→ tradition / school / applicability scope
→ material qualifications, counter-signals, and known conflicts
```

An Explanation Output alone must not erase or obscure upstream provenance. If Strategic Guidance consumes an Explanation Output, the underlying Calculation Snapshot, Validation Record, Knowledge Claims, and Rule-Derived Findings must remain traceable through the lineage graph.

---

## 6. Scope Preservation and Non-Expansion

Strategic Guidance must never exceed the boundary or applicability of its supporting evidence:

```text
Upstream Governed Scope
>= bounds
Strategic Guidance Scope
```

### 6.1 Prohibited Scope Expansions

The following silent scope expansions are strictly forbidden:

1. **Tradition Scope Expansion**: Expanding a tradition-specific finding (e.g., Thai Parichart or Vedic transit) into a universal life prescription.
2. **Conditionality Erasure**: Converting a conditional finding (qualified by planetary strength, aspect orbs, or exceptions) into an unconditional strategic mandate.
3. **Validation Incompleteness Smoothing**: Treating partially validated or scoped inputs as comprehensive, universally valid baselines.
4. **Temporal Horizon Inflation**: Projecting a short-term planetary transit window into a lifelong destiny or multi-decade certainty.
5. **Ontological Category Leaping**: Converting an astrological symbolic signal into an authoritative, empirical factual assertion about external real-world events (e.g., asserting "A contract will be breached on Tuesday" rather than "A period of negotiation friction is indicated").

---

## 7. Status Semantics, Uncertainty, and Fail-Closed Invariants

Strategic Guidance must preserve the exact semantic status and uncertainty of all consumed upstream inputs.

```text
Model Fluency / Persuasive Phrasing
!= Decision Certainty
```

### 7.1 Status Invariants

Strategic Guidance must never alter or obscure upstream statuses:

| Upstream Status / State | Permitted Strategic Handling | Prohibited Conversion (Forbidden) |
| :--- | :--- | :--- |
| **Validation Inconclusive / Pending** | Highlight validation incompleteness; fail closed on dependent strategic recommendations. | Converting `INCONCLUSIVE` / `PENDING` into actionable decision certainty. |
| **Validation Blocked / Failed** | Suppress dependent strategic recommendations; report upstream validation block. | Converting `BLOCKED` / `FAILED` into a negative real-world prediction. |
| **Unissued Candidates** | Treat candidate claims or draft rules as non-authoritative. | Using candidate claims/rules to generate authoritative strategic guidance. |
| **Rule-Derived Findings** | Present findings as scoped astrological insights. | Converting a `FINDING` into a guaranteed real-world outcome. |
| **Disputed / Conflicting Findings** | Present contrasting perspectives, counter-signals, and scenario trade-offs. | Resolving conflicts into a single synthesized certainty without governance. |
| **Explanation Confidence** | Present explanation as one perspective among options. | Translating AI model confidence into high strategic decision confidence. |

---

## 8. Real-World Decision Context vs Astrological Authority

Strategic Guidance operates at the intersection of astrological signals and the user's real-world circumstances (as framed in `ASTRO-MARKET-001A` Personal Context Model).

```text
User Decision Context
!= Calculated Fact
!= Interpretive Knowledge Claim
!= Rule-Derived Finding
!= Astrological Authority
```

### 8.1 Context Separation Invariants

1. **Distinct Provenance**: User-provided goals, constraints, timing boundaries, capacity limits, and decision histories must remain distinctly identified from astrological inputs.
2. **No Hallucinated User Facts**: The system must not invent, assume, or hallucinate real-world user constraints, financial conditions, or personal relationships.
3. **No Unearned Real-World Authority**: Model inferences or guesses about the user's situation must not be treated as authoritative context.
4. **User Ownership**: Decision context and decision history records are user-owned, append-only, and auditable.

---

## 9. Conceptual Strategic Guidance Record and Audit Provenance

A **Strategic Guidance Record** is the conceptual artifact produced when Strategic Guidance is generated. No executable schema or serialization format is established here.

A Strategic Guidance Record should account for, where applicable:

| Field | Description |
| :--- | :--- |
| **Guidance identity & version** | Stable identity and version/timestamp of the guidance artifact. |
| **Decision context reference** | Reference to the user's decision context, question, or strategic baseline. |
| **Exact evidence lineage** | Full audit graph linking to Calculation Snapshots, Validation Records, Knowledge Claims, Rule Definitions, Findings, and Explanations. |
| **Options framed** | Explicit scenarios, behavioral modes, or pathways presented for deliberation. |
| **Supportive signals** | Astrological and contextual factors supporting specific options. |
| **Counter-signals & conflicts** | Countervailing astrological indicators, conflicting tradition findings, or real-world risks. |
| **Uncertainty & limitations** | Explicit statement of validation boundaries, missing context, and interpretive limits. |
| **Temporal applicability** | Applicable time window (with referenceNow, selectedEventTime, or timeframe). |
| **Generation provenance** | Metadata regarding how guidance was framed (guidance policy version, system version). |
| **Human decision boundary** | Explicit affirmation that human review and sovereign approval are required. |

---

## 10. Multi-Tradition Coexistence and Conflict Handling

Astro Strategy Lab explicitly supports multi-tradition inquiry. Where different traditions or rules yield divergent findings for the same time-state:

```text
Tradition A Guidance Signal
!= Tradition B Guidance Signal

Tradition Disagreement
!= Decision Engine Failure
```

### 10.1 Multi-Tradition Invariants

1. **Preserve Competing Perspectives**: Strategic Guidance must present multi-tradition viewpoints side-by-side (e.g., Thai Solar vs Western transit) where relevant to the decision context.
2. **No Silent Winner Selection**: The system must not silently select a "winning" tradition or discard a dissenting tradition.
3. **No Synthetic Averaging**: Incompatible tradition indicators must not be blended into an arbitrary numerical average.
4. **No Tradition Hierarchy**: Traditions must not be ranked as inherently superior or more "truthful" unless explicitly authorized by future governance.

---

## 11. Timing Guidance Boundary and Behavioral Framing

Strategic Guidance supports temporal awareness by framing behavioral modes aligned with astrological windows.

### 11.1 Behavioral Timing Modes

Strategic Guidance may characterize timing windows using domain-specific behavioral modes (recorded in `ASTRO-MARKET-001A`):

- **Act / Execute** (ลงมือ): Favorable conditions for decisive action or initiative launch.
- **Experiment / Test** (ทดลอง): Conditions suited for low-stakes testing, probing, or piloting.
- **Prepare / Plan** (เตรียม): Conditions suited for laying groundwork, organizing resources, and structuring.
- **Negotiate / Align** (เจรจา): Conditions suited for dialogue, consensus building, and contract discussions.
- **Wait / Observe** (รอจังหวะ / สังเกตการณ์): Conditions where clarity is emerging; patience is indicated.
- **Review / Reassess** (ทบทวน): Conditions suited for auditing, retrospective analysis, and course correction.
- **Preserve Strength / Protect** (รักษากำลัง / ป้องกัน): Conditions suggesting risk mitigation, caution, and resource preservation.
- **Open to Opportunity** (เปิดรับโอกาส): Conditions indicating receptive, flexible posture.
- **Avoid High Risk** (หลีกเลี่ยงความเสี่ยงสูง): Conditions indicating elevated volatility or friction.

### 11.2 Timing Boundaries

1. **No Predictive Astrology Algorithms Authorized Here**: `ASTRO-STRATEGY-001` defines the architectural boundaries of behavioral timing modes; it does **not** author astrological timing formulas, dasha systems, transit orbs, or electional calculation algorithms.
2. **Traceable Time-State**: All timing guidance must bind strictly to unambiguous, timezone-preserved time-state records (e.g., `referenceNow`, `selectedEventTime`).

---

## 12. Risk, Opportunity, and Anti-Score Invariants

Strategic Guidance structures risk and opportunity considerations for human deliberation. However:

```text
Astrological Signal
!= Probability
!= Deterministic Risk Score
!= Future Certainty
```

### 12.1 Prohibited Scoring Practices

To prevent deceptive precision and pseudo-scientific determinism, the following are strictly prohibited:

1. **No Universal "Good Day Percentage"**: Strategic states and time windows must never be collapsed into a single numerical score (e.g., "Today is an 87% good day").
2. **No Pseudo-Probabilities**: The system must not assign fabricated probabilities to external real-world events (e.g., "73% probability of market increase").
3. **No Automated Action Priority Scores**: Numerical decision scoring algorithms that mandate action priority are forbidden.
4. **Multi-Dimensional Framing Required**: Risks, opportunities, supportive signals, and friction points must be presented as separate, qualitative dimensions with clear rationale.

---

## 13. Explanation AI vs Strategic Guidance Boundary

While Explanation AI and Strategic Guidance both operate downstream of Rule Authority, their responsibilities and outputs remain strictly separated:

```text
Explanation Output (ASTRO-EXPLAIN-001)
!= Strategic Guidance (ASTRO-STRATEGY-001)
```

| Dimension | Explanation AI (`ASTRO-EXPLAIN-001`) | Strategic Guidance (`ASTRO-STRATEGY-001`) |
| :--- | :--- | :--- |
| **Core Function** | Describes, explains, and translates governed findings and claims for comprehension. | Frames decision scenarios, trade-offs, and behavioral timing options for action deliberation. |
| **Scope of Input** | Validated facts, Knowledge Claims, Rules, and Findings. | Governed astrological evidence + User Decision Context (goals, constraints, capacity). |
| **Behavioral Framing** | Explains *what* the astrological indicators mean within their traditions. | Suggests *how* one might approach timing (e.g., act, prepare, wait, review) relative to user goals. |
| **Output Type** | Descriptive explanatory narrative / Explanation Record. | Actionable scenario comparison / Strategic Guidance Record. |

Any strategic guidance that builds upon an Explanation Output must make its additional decision-framing transformations explicit and auditable.

---

## 14. Interpretation-Accuracy Validation Preservation

`ASTRO-ARCH-001` establishes that calculation consistency and interpretation accuracy must be evaluated separately:

```text
Calculation Validation (ASTRO-VALID-001)
!= Interpretation-Accuracy Validation (Deferred Dedicated Authority Task)
```

`ASTRO-STRATEGY-001` operates downstream of interpretation and explanation. It does **not**:

- become the interpretation-accuracy validation execution layer;
- validate the predictive validity, efficacy, or truth of astrological guidance;
- represent the absence of future interpretation validation as a validation pass;
- alter the deferred interpretation-validation mandate established in `ASTRO-ARCH-001` and preserved across `ASTRO-VALID-001`, `ASTRO-KNOWLEDGE-001`, `ASTRO-RULE-001`, and `ASTRO-EXPLAIN-001`.

Interpretation-accuracy validation remains a preserved, separate architectural obligation deferred to a later dedicated authority task.

---

## 15. Autonomy Boundary and Non-Execution Policy

Strategic Guidance is strictly an **advisory decision-support system**. It possesses zero operational authority to execute actions autonomously.

```text
Strategic Guidance Existence
!= Execution Authorization
```

### 15.1 Prohibited Autonomous Operations

No strategic guidance output may directly or autonomously execute, trigger, or commit:

1. **Financial / Commercial Transactions**: Purchases, investments, trades, transfers, or contracts.
2. **Communications**: Sending emails, messages, public announcements, or social posts.
3. **Schedule / Calendar Mutations**: Automatically rescheduling meetings, flights, or life events without explicit human confirmation.
4. **Operational / Production Actions**: Deployments, data deletions, system configuration changes, or irreversible operations.

Every action arising from Strategic Guidance requires explicit, out-of-band or in-band human approval and execution.

---

## 16. Anti-Deterministic Fate and No-Destiny Invariant

Astro Strategy Lab firmly rejects deterministic fatalism in its architecture:

```text
Astrological Strategic Guidance
= Structured Context for Human Agency
!= Inescapable Destiny
```

### 16.1 Anti-Fatalism Requirements

1. **Agency Preservation**: All guidance must empower human autonomy, reflection, and strategic agility.
2. **No Inevitability Claims**: The system must never claim that an event, outcome, success, or catastrophe is unavoidable, predetermined, or fated.
3. **No Fear-Based Urgency**: Guidance must avoid sensationalist, coercive, or fear-inducing rhetoric designed to force user decisions.
4. **Reflective Learning**: The system encourages user reflection on decisions and outcomes to improve strategic awareness over time, without treating outcomes as validations of astrological infallibility.

---

## 17. Deferred Decisions and Non-Authorizations

The following concerns are explicitly deferred; no design, algorithm, or selection is authorized in this baseline:

- actual strategic recommendation rules, heuristic policies, and decision logic;
- actual astrological timing rules, electional formulas, or planetary transit algorithms;
- decision scoring formulas, risk-reward indices, or confidence calibration algorithms;
- probability models and predictive statistical algorithms;
- multi-tradition conflict resolution algorithms and tradition precedence policies;
- automated strategy optimization engines and constraint satisfaction solvers;
- autonomous planning, goal-seeking agents, or automated action pipelines;
- runtime schemas, JSON-LD, OpenAPI definitions, or database models for guidance records;
- RAG pipelines, prompts, models, embeddings, or vector databases for strategy synthesis;
- UI components, dashboard widgets, timing calendars, or interactive scenario comparison views;
- interpretation-validation implementation, efficacy benchmarks, and oracle datasets.

---

## 18. Roadmap Integrity and Decision Summary

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

- **Strategic Guidance Authority Boundary** established: downstream decision-support and advisory layer bounded by governed evidence and user context.
- **Human Sovereignty**: Human Decision Authority is absolute; recommendations are inspectable options, not commands, guarantees, or fate.
- **Evidence Binding**: all strategic guidance traces strictly to exact Calculation Snapshots, Validation Records, Knowledge Claims, Rules, Findings, Explanations, and User Context.
- **Scope Preservation**: no broadening from tradition-specific to universal, conditional to unconditional, or short-term transit to lifelong destiny.
- **Status & Uncertainty**: fail-closed on unvalidated or inconclusive inputs; preserves all upstream uncertainties and conflicts.
- **Real-World Context Separation**: user context (goals, constraints, history) remains distinctly identified from astrological authority without hallucinated facts.
- **Strategic Guidance Record**: conceptual audit structure defined covering evidence lineage, options framed, supportive/counter signals, uncertainty, and human decision boundary.
- **Multi-Tradition Safety**: preserves divergent tradition perspectives without forced consensus, averaging, or unearned ranking.
- **Behavioral Timing Framing**: defines behavioral modes (act, prepare, wait, review, test, preserve strength) without authoring deterministic prediction algorithms.
- **Anti-Score Invariant**: prohibits universal "good day percentage", pseudo-probabilities, and automated decision scoring.
- **Layer Separation**: cleanly separates Base Explanation (`ASTRO-EXPLAIN-001`) from Decision Support (`ASTRO-STRATEGY-001`).
- **Interpretation Validation**: preserves the separate deferred validation obligation from `ASTRO-ARCH-001`.
- **Autonomy Boundary**: strictly prohibits autonomous execution of transactions, communications, scheduling, or irreversible operations.
- **No Destiny Invariant**: explicitly rejects deterministic fatalism and unavoidable fate claims in favor of human agency.
- **Docs-Only Scope**: no runtime code, recommendation engine, scoring algorithm, UI, or database models authorized.

```text
DOCUMENT_STATUS=CURRENT_LINEAGE_STRATEGY_AUTHORITY_BASELINE
WORK_TYPE=DOCS_ONLY
AUTHORITY_LAYER=STRATEGIC_GUIDANCE_AUTHORITY_ONLY
ROADMAP_SEQUENCE_CHANGED=NO
```

---

*End of ASTRO-STRATEGY-001. Docs-only strategy-authority baseline; no recommendation engines, scoring algorithms, autonomous execution, or deterministic fate models established.*
