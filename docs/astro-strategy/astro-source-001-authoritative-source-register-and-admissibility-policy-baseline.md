# ASTRO-SOURCE-001 — Authoritative Source Register and Admissibility Policy Baseline

* **Document Date**: 2026-08-20
* **Work Type**: Docs-only (No code, UI, database, dependency, configuration, or asset changes)
* **Project Area**: Astro Strategy Lab
* **Document Class**: Current-lineage source-governance authority baseline (new)

---

## Status

```text
DOCUMENT_STATUS=CURRENT_LINEAGE_SOURCE_AUTHORITY_BASELINE
WORK_TYPE=DOCS_ONLY
AUTHORITY_LAYER=SOURCE_AUTHORITY_ONLY
ROADMAP_SEQUENCE_CHANGED=NO
```

This document is the **first current-lineage Source Authority baseline** for Astro Strategy Lab. It establishes the governance framework within which later formula, taxonomy, calculation, and validation decisions must be made.

This document is:

- **not** implementation authorization;
- **not** a formula, ephemeris, house-system, zodiac-mode, or ayanamsha decision;
- **not** a dependency or license decision;
- **not** a claim that any astrology school or tradition is objectively correct.

---

## 1. Document Status and Authority

This baseline registers **Source Authority governance only**. It does not compute, validate, interpret, or decide.

- **What it authorizes**: the conceptual Source Record model; the evidence-class taxonomy for sources; the authority-role model; admissibility rules for the calculation, validation, knowledge, and rule lineages; conflict policy; tradition/school separation; translation and edition discipline; freshness handling; provenance requirements; the AI boundary; the user-provided source library; the licensing separation; and the downstream contracts for `ASTRO-TAXONOMY-001`, `ASTRO-CALC-001`, and `ASTRO-VALID-001`.
- **What it does not authorize**: any formula, any ephemeris or house-system selection, any zodiac/ayanamsha value, any dependency, any license path, any runtime component, or any claim that a specific tradition is correct.

Any downstream document that consumes a source must cite this baseline and cannot weaken the admissibility rules recorded here.

---

## 2. Purpose and Scope

Astro Strategy Lab is the **Personal Strategic Timing Advisor / Explainable Strategic Decision Workspace** (positioning recorded in `ASTRO-MARKET-001A`). For its guidance to remain explainable and safe, every calculated fact, taxonomy entry, and rule-derived finding must ultimately trace to an admissible, reviewed source with recorded provenance.

This baseline exists to:

1. define what qualifies as a source and what a Source Record must capture;
2. separate **evidence class** (what kind of evidence a source is) from **authority role** (what a source may be used to prove);
3. state admissibility rules so that vendor, user, competitor, AI, and historical material cannot silently become formula authority;
4. define conflict handling so that reputable disagreement is preserved, not averaged away;
5. preserve tradition/school identity so no false universal astrology rule is created;
6. establish provenance, freshness, translation, and licensing boundaries;
7. state the downstream contracts that `ASTRO-TAXONOMY-001`, `ASTRO-CALC-001`, and `ASTRO-VALID-001` must satisfy.

This task does **not** select formulas and does **not** decide which astrology tradition is correct.

---

## 3. Authority Layer Boundary

### 3.1 Position in the authority hierarchy

`ASTRO-ARCH-001` establishes the following hierarchy; `ASTRO-SOURCE-001` operates **only within the Source Authority layer**:

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

### 3.2 What Source Authority owns

Source Authority:

- decides which inputs are admissible and what each input is allowed to prove;
- classifies each source by evidence class and assigns (or withholds) an authority role after review;
- records provenance, edition/version, locator, freshness, and review status;
- preserves conflicts and tradition/school identity;
- publishes reviewed source records for downstream consumption.

### 3.3 What Source Authority must not impersonate

`ASTRO-SOURCE-001` must not impersonate:

- **Taxonomy Authority** — it does not mint canonical terminology or identity mappings;
- **Calculation Authority** — it does not compute any chart, table, or formula output;
- **Validation Authority** — it does not validate calculated outputs;
- **Knowledge Authority** — it does not author curated interpretive knowledge;
- **Rule Authority** — it does not derive rule findings.

Source Authority *prepares* the material those layers may consume; it does not act as them.

---

## 4. Source Record Model (Conceptual)

A **Source Record** is the conceptual unit of the Source Register. This is conceptual architecture only; no executable JSON/database schema is created here.

| Field | Meaning |
| :--- | :--- |
| Source identity / source ID | A stable identifier distinguishing this source record from every other. |
| Source title / name | The name or title by which the source is cited. |
| Source type / class | The form of the source (e.g., classical text, scholarly article, vendor page, screenshot, software documentation, repository file). |
| Author / institution / publisher / vendor | Who produced or published it, where applicable. |
| Edition / version | The specific edition or version, where applicable. |
| Publication / release date | When it was published or released, where known. |
| Access / retrieval date | When it was accessed or retrieved, where applicable. |
| URL / path / reference locator | The exact locator: URL, repository path, or bibliographic reference. |
| Language | The language of the source (and of any translation used). |
| Tradition / school / domain scope | Which tradition(s), school(s), or domain(s) the source speaks to, where known. |
| Provenance | How the source came into the register and its chain of custody. |
| Evidence classification | The primary evidence class assigned, with any additional lineage/evidence qualifiers recorded (Section 6). |
| Supported claims | What the source may legitimately be used to support. |
| Unsupported claims / prohibited uses | What the source must not be used to prove. |
| Authority role | The authority role(s) assigned or withheld after review (Section 7). |
| Freshness / revalidation status | Whether the source is stable/historical or time-sensitive, and its revalidation state (Section 12). |
| Review status | Where the source sits in the register status model (Section 13). |
| Notes / ambiguity | Open questions, translation uncertainty, partial-scan caveats, or other ambiguity. |

A Source Record may be admitted for one role and rejected for another; the role assignment is per-claim, not per-document as a single blanket verdict.

---

## 5. Evidence Class vs Authority Role

These are two **distinct** concepts and must never be conflated.

- **Evidence class** describes *what kind of evidence* a source is — how it was obtained and how trustworthy it is as a record (e.g., a vendor page, a screenshot, an original text).
- **Authority role** describes *what the source may be used to prove* after review (e.g., a formula authority candidate, a validation reference).

A source can be credible evidence without being formula authority. For example:

```text
Vendor documentation
= evidence class: Vendor-Described Evidence

but

≠ authority role: Formula Authority
```

The evidence class is assigned at recording time; the authority role is assigned only through explicit review and recorded provenance.

Consistency rule:

```text
Primary / Original Source
= evidence classification

Formula Authority Candidate
= authority role
```

These must not be collapsed: being a primary/original source does **not** automatically grant Formula Authority, Taxonomy Authority, or Validation Reference status; each role still requires explicit role-specific review.

---

## 6. Evidence / Source Classification

Source classification is separated into two clearly distinct groups:

- **Source Record evidence classes** classify actual source artifacts or evidence records — what kind of evidence a source is.
- **Lineage claim / decision classifications** classify claims, decisions, hypotheses, and lineage statements — not source artifacts themselves.

The classifications established by `ASTRO-ARCH-001`, `ASTRO-MARKET-001A`, and `ASTRO-SKY-001` are **preserved unchanged**; none are silently discarded or renamed. `ASTRO-SOURCE-001` adds source-specific classes and groupings without overwriting any established class, and it distinguishes which classifications are actually applied to Source Records.

Cardinality is deliberately **not** locked here. A Source Record receives a primary source classification, while additional lineage or evidence qualifiers may be preserved where necessary — for example, a vendor source may simultaneously carry its source-artifact identity, a vendor-described evidence classification, and a time-sensitive pricing qualifier. The exact storage/cardinality model remains downstream work; this baseline defines semantic clarity, not database design.

### 6.1 Source Record Evidence Classes

These classifications apply to actual source artifacts or evidence records.

| Evidence Class | Meaning | Established by |
| :--- | :--- | :--- |
| **Current-Lineage Authority** | A current-lineage document accepted as authority for its stated scope. | ASTRO-ARCH-001 |
| **Primary / Original Source** | An original text, canon, table, or first-hand document. Being a primary/original source does **not** automatically grant Formula Authority, Taxonomy Authority, or Validation Reference status; each role still requires explicit role-specific review. | ASTRO-SOURCE-001 (refinement) |
| **Scholarly / Technical Reference** | Academic, peer-reviewed, or technical reference material usable for context, comparison, or as a validation reference, subject to review. | ASTRO-SOURCE-001 (refinement) |
| **Historical Repository Finding** | Something found in the repository or historical documents; recorded as a compatibility constraint, not as architecture authority. | ASTRO-ARCH-001 |
| **Repository Search Finding — Runtime Not Revalidated** | Matching implementation found in the repository; records existence only, not runtime behavior or correctness. | ASTRO-SKY-001 |
| **User-Provided Evidence** | Detail observed in screenshots or usage reported by the user; high signal, not proof. | ASTRO-ARCH-001 |
| **User-Provided Product Evidence** | User-supplied screenshot or usage detail about a product; evidence, not proof. | ASTRO-MARKET-001A |
| **User-Provided Visualization Evidence** | User-supplied visualization pattern evidence; demonstrates interaction, not the underlying formula. | ASTRO-SKY-001 |
| **Vendor-Described Evidence** | Capability or behavior described by a vendor; may be accurate, not independently verified. | ASTRO-ARCH-001 |
| **Vendor-Described Architecture** | Design described by a vendor; not independently verified. | ASTRO-MARKET-001A |
| **Vendor-Described Product Behavior** | Product behavior described by a vendor; not independently verified. | ASTRO-MARKET-001A |
| **Vendor Marketing Claim** | Promotional assertion; unvalidated and not technical proof. | ASTRO-MARKET-001A |
| **Verified Product Fact** | Independently confirmed existence, category, or behavior from an official source. | ASTRO-MARKET-001A |
| **Product / Competitor Observation** | What a product exists for or appears to do (subsumes `Verified Product Fact` and screenshot observation); market evidence only. | ASTRO-SOURCE-001 (grouping) |
| **Pricing Snapshot** | Price observed on a specific access date; time-bounded, not a durable market fact. | ASTRO-MARKET-001A |
| **Derived / Secondary Interpretation** | A paraphrase, translation, commentary, or AI-generated summary of a source; not the original source itself. | ASTRO-SOURCE-001 (refinement) |

### 6.2 Lineage Claim / Decision Classifications

These classify claims, decisions, hypotheses, and lineage statements rather than Source Records. They remain part of the broader Astro evidence/lineage discipline, preserved for their original lineage purpose, but are **not** required to function as Source Record evidence classes.

| Classification | Meaning | Established by |
| :--- | :--- | :--- |
| **Architecture Decision** | A decision made in a current-lineage document for the Astro architecture. | ASTRO-ARCH-001 |
| **Product Hypothesis** | Proposed positioning or design direction for Astro Strategy Lab. | ASTRO-MARKET-001A |
| **Architecture Inference** | Reasoned inference about implementation; explicitly a hypothesis. | ASTRO-MARKET-001A |
| **Open Question** | A question deliberately deferred; no decision is made. | ASTRO-ARCH-001 |

### 6.3 Inputs inspected for this baseline

| Input | Classification |
| :--- | :--- |
| `astro-arch-001-calculation-interpretation-time-state-and-authority-architecture-baseline.md` | Current-Lineage Authority |
| `qa-astro-arch-001-calculation-interpretation-time-state-and-authority-architecture-baseline.md` | Current-Lineage Authority |
| `astro-market-001a-thai-astrology-competitor-evidence-and-positioning-addendum.md` | Current-Lineage Authority |
| `qa-astro-market-001a-thai-astrology-competitor-evidence-and-positioning-addendum.md` | Current-Lineage Authority |
| `astro-sky-001-explainable-planetarium-and-multi-house-visualization-capability-definition.md` | Current-Lineage Authority |
| `qa-astro-sky-001-explainable-planetarium-and-multi-house-visualization-capability-definition.md` | Current-Lineage Authority |

### 6.4 Historical repository findings (not current authority)

The following exist in the repository or as historical documents. They are recorded as **Historical Repository Finding** / **Repository Search Finding — Runtime Not Revalidated** only. They do **not** become source authority merely because they exist, and runtime code is **not** source authority by virtue of existing.

| Finding | Classification |
| :--- | :--- |
| `astro-market-001-ai-fortune-app-market-pattern-review.md` | Historical Repository Finding |
| `astro-num-001-number-strategy-module-spec-v1.md` | Historical Repository Finding (candidate baseline, under review) |
| `astro-real-app-121-strategic-timing-auspicious-window-definition-and-integration-plan.md` | Historical Repository Finding |
| `astro-real-app-122-strategic-timing-decision-resolution-and-ui-data-contract-plan.md` | Historical Repository Finding |
| `astro-real-app-123-strategic-timing-static-ui-and-navigation-shell-implementation.md` | Historical Repository Finding |
| Existing repository source, e.g. `src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiAstrologyAdapter.ts` | Repository Search Finding — Runtime Not Revalidated |
| Existing repository source, e.g. `src/components/workspaces/astro-strategy/real-app/data/astroRealAppThaiHouseMappingAdapter.ts` | Repository Search Finding — Runtime Not Revalidated |
| Existing repository source, e.g. `src/components/workspaces/astro-strategy/real-app/data/astroRealAppChineseMetaphysicsAdapter.ts` | Repository Search Finding — Runtime Not Revalidated |
| Existing repository source, e.g. `src/components/workspaces/astro-strategy/real-app/data/astroRealAppTypes.ts` | Repository Search Finding — Runtime Not Revalidated |

Existing runtime code is admissible to Source Authority **only** as a record that matching implementation exists. It does not establish formula correctness, runtime behavior, or architectural authority unless a current-lineage authority document explicitly elevates it.

---

## 7. Authority Roles (Conceptual)

Authority roles are assigned through review; a source's category does **not** automatically grant it a role.

| Role | Meaning |
| :--- | :--- |
| **Formula Authority Candidate** | A source potentially admissible for defining or reconstructing a calculation method. Requires explicit source review and recorded provenance before use by Calculation Authority. |
| **Taxonomy Authority Candidate** | A source potentially admissible for canonical terminology or identity mapping. Consumed by Taxonomy Authority, not used to compute. |
| **Validation Reference Candidate** | An independent source, test, or reference suitable for validating calculated outputs. Independence is evaluated claim-specifically against the exact validation purpose (Section 8.2). |
| **Knowledge Reference** | A source useful for curated knowledge and explanation; may not silently become calculated fact. |
| **Historical Context** | Useful for understanding lineage and history, but not current formula authority. |
| **Product / Vendor Evidence** | Useful for product behavior and market evidence only. |
| **User Observation** | Useful for recording observed behavior or requirements; never calculation truth. |

One source may hold one role and not another. Example:

```text
Vendor documentation
= admissible as Product / Vendor Evidence

but

= inadmissible as independent calculation validation
```

---

## 8. Source Admissibility Policy

### 8.1 Calculation lineage

A source must **not** enter Calculation Authority as formula authority merely because it is:

- present in repository code;
- mentioned in an AI response;
- shown in a screenshot;
- implemented by a competitor;
- described by a vendor;
- widely repeated online;
- inferred from runtime behavior.

Formula/calculation authority requires **explicit source review and recorded provenance**. No source may enter the calculation lineage silently.

### 8.2 Validation lineage

Validation independence is **claim-specific and purpose-specific**: independence is evaluated against the exact validation claim or purpose being tested, not as a single blanket property.

Distinguish two uses:

- **Normative reference use** — a source may define a formula, table, convention, or expected example. This can be useful for conformance checking against the same published standard.
- **Independent validation use** — evidence presented as *independent validation* must have independence appropriate to the exact claim being tested.

The following remains prohibited as independent validation:

```text
implementation
→ generates expected result
→ same implementation validates itself
```

A calculation implementation cannot establish correctness solely by reproducing outputs generated from its own implementation lineage.

A Formula Authority Source may legitimately contain worked examples, published tables, and expected outputs, which may be useful as reference examples:

```text
Formula Authority Source
→ may contain worked reference examples

but

Worked examples from the same normative lineage
≠ automatically independent validation
```

Independence is evaluated for the exact claim/purpose being validated and is recorded. Absolute independence is **not** required between every Formula Authority Source and every Validation Reference: normative conformance tests may legitimately use the same published standard/source, independent cross-checks may use another source/tool/dataset, and different validation claims may require different forms of independence. The final validation methodology is deferred to `ASTRO-VALID-001`.

### 8.3 Knowledge lineage

Knowledge Authority may use **wider curated sources** than Calculation Authority, but:

- interpretive content must not silently become calculated fact;
- source provenance must remain visible in any explanation that cites it;
- tradition/school boundaries must be maintained.

### 8.4 Rule lineage

Rule Authority must identify which **source(s), tradition, and rule version** support each rule-derived finding. A rule finding without an identified source, tradition, and version is not admissible.

---

## 9. Source Conflict Policy

When reputable sources disagree, the disagreement is **preserved**, not resolved by majority vote or AI preference.

```text
Source A
≠
Source B

→ record conflict
→ identify school / tradition / version / context
→ preserve both where legitimate
→ do not silently merge
→ human / domain review
→ downstream policy chooses explicitly
```

Conflict causes to account for:

- different schools / traditions;
- different editions;
- translation differences;
- historical evolution;
- regional practice;
- different calculation conventions;
- transcription errors;
- vendor-specific implementation;
- unresolved uncertainty.

A downstream authority that chooses one source over another must record that choice explicitly and link it to the preserved conflict record. Silence is not a resolution.

---

## 10. Tradition / School Separation

Source Authority must preserve school/tradition identity. It must not create a false universal astrology rule.

Examples of traditions that may later appear in the register:

- Thai astrology traditions;
- Western astrology;
- Chinese metaphysics;
- BaZi;
- Qi Men Dun Jia;
- I Ching;
- numerology systems;
- other explicitly identified traditions.

Rules:

- A source supporting one tradition does **not** automatically become authority for another.
- Cross-tradition comparison is recorded as comparison, not as a merged single authority.
- `ASTRO-SOURCE-001` does **not** establish formulas for any tradition.

---

## 11. Translation and Edition Discipline

Governance for translated and editioned material:

- The **original text** and a **translation** are distinct source artifacts when meaning may differ.
- Edition/version must be recorded when relevant.
- A translation must not silently override original terminology.
- Uncertain translation must be marked as uncertain.
- OCR/transcription output is **not** automatically authoritative.
- Quotations, tables, diagrams, and formulas must maintain locator/provenance where possible.

No OCR or source extraction is performed in this task.

---

## 12. Freshness and Revalidation

Different sources age differently. No single universal expiration period is prescribed.

### 12.1 Stable / historical sources

Examples: classical texts, historical rule systems, published editions.

Their age does **not** automatically make them invalid, but edition, authenticity, and provenance still matter.

### 12.2 Time-sensitive sources

Examples: vendor product behavior, pricing, software documentation, dependency documentation, licensing information.

These require access dates and later revalidation. A time-sensitive source cited without an access date is incomplete.

---

## 13. Source Register Status Model (Conceptual)

Conceptual statuses; exact enum/schema remains downstream work.

- discovered;
- recorded;
- under review;
- admissible for a stated role;
- restricted to context;
- disputed;
- superseded;
- rejected for a stated role;
- requires revalidation.

A source may be admissible for one role and inadmissible for another; status is tracked per role, not only per source.

```text
Vendor documentation
= admissible as Vendor-Described Evidence

but

= inadmissible as independent calculation validation
```

---

## 14. Provenance Requirements

Every authoritative downstream claim must be traceable conceptually:

```text
Claim / Formula / Taxonomy Entry / Rule
→ Source Record
→ exact locator when available
→ edition / version
→ authority role
→ review decision
```

Rules:

- No "according to astrology" or anonymous model-memory authority.
- AI-generated summaries may assist research but must not become original source authority.

---

## 15. AI Boundary

AI may:

- assist discovery;
- summarize sources;
- compare sources;
- propose candidate classifications;
- surface conflicts.

AI may **not**:

- invent a source;
- manufacture a citation;
- elevate its own memory to Source Authority;
- choose formula authority silently;
- resolve scholarly/traditional disagreement without recorded review;
- transform vendor/user evidence into calculation truth.

Human/domain review remains required for any authority elevation.

---

## 16. User-Provided Source Library

Astro Strategy Lab may later use books, documents, scans, screenshots, notes, and other material provided by the user.

Rules:

- User ownership/provision does **not** automatically establish technical authority.
- Provenance should be recorded.
- Title, edition, author, and page/locator should be captured when available.
- Extracted text should remain linked to its source artifact.
- Uncertain or partial scans must be marked.
- Copyrighted-material handling and licensing are **separate** from technical authority.

No actual books are ingested or reproduced in this task.

---

## 17. Licensing Boundary

Technical source authority and licensing permission are **separate** questions.

A source may be technically authoritative but **not** licensed for:

- redistribution;
- embedding;
- shipping inside the application;
- training;
- commercial reuse.

`ASTRO-SOURCE-001` records this separation. It does **not** approve any license.

---

## 18. Downstream Contract — ASTRO-TAXONOMY-001

`ASTRO-SOURCE-001` must provide `ASTRO-TAXONOMY-001`:

- reviewed source records;
- tradition/school identity;
- terminology evidence;
- conflicting terminology records;
- edition/translation context;
- provenance.

Taxonomy must **not** create canonical terms from model memory alone.

---

## 19. Downstream Contract — ASTRO-CALC-001

`ASTRO-SOURCE-001` must provide `ASTRO-CALC-001`:

- explicitly approved formula-authority source(s);
- exact formula/table/algorithm locator where available;
- school/tradition scope;
- version/edition;
- assumptions;
- known ambiguities/conflicts;
- provenance;
- human review decision.

Calculation must **not** infer formulas merely from:

- screenshots;
- competitor output;
- existing UI;
- AI memory;
- historical implementation code.

---

## 20. Relationship to ASTRO-VALID-001

Source Authority also supports independent validation references.

Distinguish:

```text
Formula source
```

from:

```text
Validation reference
```

They may sometimes be related, but independence must be evaluated. The calculation implementation must not become its own sole proof.

Validation independence is **claim-specific and purpose-specific** (Section 8.2):

- A **normative reference use** — formula, table, convention, or expected example from a published standard — is useful for conformance checking.
- An **independent validation use** requires independence appropriate to the exact claim being tested. Worked examples from the same normative lineage as the calculation do **not** automatically qualify as independent validation.
- Absolute independence is **not** required between every Formula Authority Source and every Validation Reference.

The final validation methodology is deferred to `ASTRO-VALID-001`.

---

## 21. Roadmap Integrity

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

- `ASTRO-SOURCE-001` occupies the Source Authority stage only; it does not reorder, insert, or remove any stage.
- `ASTRO-SKY` remains lateral and deferred; `ASTRO-SOURCE-001` does **not** authorize ASTRO-SKY implementation.

---

## 22. Required Non-Goals

- no runtime code;
- no database changes;
- no UI;
- no calculation implementation;
- no formula selection;
- no claim that any astrology school is objectively correct;
- no ephemeris selection;
- no house-system selection;
- no zodiac-mode selection;
- no ayanamsha selection;
- no dependency selection;
- no license approval;
- no ingestion of full books;
- no OCR pipeline;
- no RAG implementation;
- no embeddings/vector database;
- no implementation authorization.

---

## 23. Open Questions (Deferred)

The following are deliberately deferred; no decision is made in this baseline:

- exact V1 source corpus;
- which Thai astrology texts become formula-authority candidates;
- exact source-review workflow;
- source database/schema;
- citation storage format;
- document ingestion system;
- OCR/extraction strategy;
- copyright/licensing approval;
- exact conflict-resolution board/process;
- source confidence/ranking implementation.

---

## 24. Decision Summary

- **Source Record model** established (conceptual; no executable schema).
- **Evidence class and authority role** separated as distinct concepts: `Primary / Original Source` is an evidence classification only, while `Formula Authority Candidate`, `Taxonomy Authority Candidate`, and `Validation Reference Candidate` remain authority roles granted only through explicit review.
- **Evidence classification** preserved from `ASTRO-ARCH-001`, `ASTRO-MARKET-001A`, and `ASTRO-SKY-001`, with source-specific refinements added. Source Record evidence classes are separated from lineage claim/decision classifications (`Architecture Decision`, `Product Hypothesis`, `Architecture Inference`, `Open Question`), which are preserved for their lineage purpose without being mandated as Source Record evidence classes.
- **Admissibility policy** established for calculation, validation, knowledge, and rule lineages. Validation independence is claim-specific and purpose-specific; self-validation remains prohibited; normative reference examples do not automatically constitute independent validation.
- **Conflict policy** established: preserve disagreement; no majority vote or AI preference.
- **Tradition/school separation** and **translation/edition discipline** established.
- **Freshness, provenance, status model, AI boundary, user-provided library, and licensing boundary** established.
- **Downstream contracts** established for `ASTRO-TAXONOMY-001`, `ASTRO-CALC-001`, and `ASTRO-VALID-001`.
- **Roadmap unchanged**: `ASTRO-ARCH → … → ASTRO-STRATEGY`; ASTRO-SKY remains lateral and deferred.
- **No formula, dependency, or license choice** made.

```text
DOCUMENT_STATUS=CURRENT_LINEAGE_SOURCE_AUTHORITY_BASELINE
WORK_TYPE=DOCS_ONLY
AUTHORITY_LAYER=SOURCE_AUTHORITY_ONLY
ROADMAP_SEQUENCE_CHANGED=NO
```

---

*End of ASTRO-SOURCE-001. Docs-only source-governance baseline; no formulas, dependencies, licenses, or runtime artifacts established.*
