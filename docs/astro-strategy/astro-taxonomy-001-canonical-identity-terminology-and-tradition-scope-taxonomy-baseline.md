# ASTRO-TAXONOMY-001 — Canonical Identity, Terminology and Tradition-Scope Taxonomy Baseline

* **Document Date**: 2026-08-20
* **Work Type**: Docs-only (No code, UI, database, dependency, configuration, or asset changes)
* **Project Area**: Astro Strategy Lab
* **Document Class**: Current-lineage taxonomy-governance authority baseline (new)

---

## Status

```text
DOCUMENT_STATUS=CURRENT_LINEAGE_TAXONOMY_AUTHORITY_BASELINE
WORK_TYPE=DOCS_ONLY
AUTHORITY_LAYER=TAXONOMY_AUTHORITY_ONLY
ROADMAP_SEQUENCE_CHANGED=NO
```

This document is the **first current-lineage Taxonomy Authority baseline** for Astro Strategy Lab. It establishes how concepts, identities, terminology, aliases, translations, tradition/school scope, and taxonomy versions are governed before Calculation Authority begins consuming them.

This document is:

- **not** implementation authorization;
- **not** a formula, ephemeris, house-system, zodiac-mode, or ayanamsha decision;
- **not** an interpretive rule system;
- **not** a dependency or license decision;
- **not** a complete domain vocabulary.

---

## 1. Document Status and Authority

This baseline registers **Taxonomy Authority governance only**. It does not calculate, validate, interpret, or decide strategy.

- **What it authorizes**: the conceptual Canonical Concept Record model; the canonical-identity-vs-display-label rule; the identity-resolution policy; tradition/school-scope handling; alias, translation, and transliteration discipline; homonym/collision handling; cross-tradition mapping; taxonomy versioning and historical traceability; merge/split/deprecation policy; taxonomy conflict policy; the AI/UI/knowledge/rule boundaries; and the downstream contracts for `ASTRO-CALC-001`, `ASTRO-VALID-001`, and future `ASTRO-KNOW` / `ASTRO-RULE` / `ASTRO-EXPLAIN` layers.
- **What it does not authorize**: any formula, any calculated planetary position, any house placement, any ephemeris output, any validation result, any interpretive rule truth, or any strategic recommendation.

Any downstream document that consumes a canonical identity must cite this baseline and cannot weaken the identity rules recorded here.

---

## 2. Purpose and Scope

Astro Strategy Lab is the **Personal Strategic Timing Advisor / Explainable Strategic Decision Workspace** (positioning recorded in `ASTRO-MARKET-001A`). For its guidance to remain explainable and safe, the domain concepts that function as authoritative, reusable, machine-referenced, rule-referenced, calculation-referenced, validation-referenced, or otherwise identity-sensitive identities must resolve to a stable, reviewed canonical identity with recorded provenance.

```text
Any downstream domain concept that functions as an authoritative,
reusable, or machine-referenced identity must resolve to a reviewed
canonical identity where applicable.

Ordinary explanatory language, narrative wording, temporary UI text,
and ephemeral user context are not automatically taxonomy entities.
```

The governing architectural objective is:

> **Different names must not silently create different concepts, and similar names must not silently collapse distinct concepts.**

This baseline exists to:

1. define the **Canonical Concept Record** — the conceptual unit of the Taxonomy Register;
2. separate **canonical identity** (stable) from **display label** (mutable representation);
3. state that canonical terminology may only be established from admissible Source Authority inputs;
4. define identity resolution so that aliasing, distinction, and unresolved relationships are decided on evidence, never by name similarity alone;
5. make tradition/school scope first-class so similar names across different systems are not collapsed;
6. discipline translation and transliteration so neither silently creates or changes identity;
7. handle homonyms/collisions, aliases, and cross-tradition correspondence without silent identity collapse;
8. make taxonomy version-aware and historically traceable so past records remain interpretable;
9. define merge/split/deprecation so history is preserved, not rewritten;
10. state the downstream contracts that `ASTRO-CALC-001`, `ASTRO-VALID-001`, and future layers must satisfy.

This task does **not** select formulas, does **not** enumerate the complete V1 concept corpus, and does **not** decide which astrology tradition is correct.

---

## 3. Authority Layer Boundary

### 3.1 Position in the authority hierarchy

`ASTRO-ARCH-001` establishes the following hierarchy; `ASTRO-TAXONOMY-001` operates **only within the Taxonomy Authority layer**:

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

### 3.2 What Taxonomy Authority owns

Taxonomy Authority:

- establishes canonical identities and a versioned controlled vocabulary;
- assigns preferred canonical labels within a stated tradition/school scope;
- records aliases, translations, transliterations, and historical names;
- resolves or explicitly defers identity relationships between terms;
- preserves terminology conflicts and tradition/school identity;
- versions, merges, splits, and deprecates concepts with full history;
- publishes canonical concept records for downstream consumption.

### 3.3 What Taxonomy Authority must not impersonate

`ASTRO-TAXONOMY-001` must not impersonate:

- **Source Authority** — it does not decide which inputs are admissible or their evidence class; it consumes reviewed source evidence;
- **Calculation Authority** — it does not compute any chart, table, or formula output;
- **Validation Authority** — it does not validate calculated outputs;
- **Knowledge Authority** — it does not author curated interpretive knowledge;
- **Rule Authority** — it does not derive rule findings or interpretive rules.

Taxonomy Authority *prepares* the identities those layers may consume; it does not act as them.

---

## 4. Evidence Classification and Inputs

### 4.1 Evidence discipline

`ASTRO-TAXONOMY-001` does not define or extend the evidence-class taxonomy. It consumes evidence classifications and lineage classifications established by `ASTRO-SOURCE-001` and their originating current-lineage authorities.

The classifications below are referenced from upstream authority, not defined here.

**Source Record Evidence Classes** (established upstream; classify actual source artifacts or evidence records):

| Evidence Class | Meaning |
| :--- | :--- |
| **Current-Lineage Authority** | A current-lineage document accepted as authority for its stated scope. |
| **Historical Repository Finding** | Something found in the repository or historical documents; a compatibility constraint, not taxonomy authority. |
| **User-Provided Evidence** | Detail observed in screenshots or usage reported by the user; high signal, not proof. |
| **Vendor-Described Evidence** | Capability or behavior described by a vendor; may be accurate, not independently verified. |

**Lineage Claim / Decision Classifications** (established upstream; classify claims, decisions, hypotheses, and lineage statements, not Source Records):

| Classification | Meaning |
| :--- | :--- |
| **Architecture Decision** | A decision made in a current-lineage document for the Astro architecture. |
| **Open Question** | A question deliberately deferred; no decision is made. |

`Architecture Decision` and `Open Question` are referenced only as lineage classifications, not as Source Record evidence classes. No new evidence class is introduced here.

Historical repository terminology and existing runtime labels are **not** promoted into canonical authority merely because they already exist in code or UI.

### 4.2 Inputs inspected for this baseline

| Input | Classification |
| :--- | :--- |
| `astro-arch-001-calculation-interpretation-time-state-and-authority-architecture-baseline.md` | Current-Lineage Authority |
| `qa-astro-arch-001-calculation-interpretation-time-state-and-authority-architecture-baseline.md` | Current-Lineage Authority |
| `astro-source-001-authoritative-source-register-and-admissibility-policy-baseline.md` | Current-Lineage Authority |
| `qa-astro-source-001-authoritative-source-register-and-admissibility-policy-baseline.md` | Current-Lineage Authority |
| `astro-market-001a-thai-astrology-competitor-evidence-and-positioning-addendum.md` | Current-Lineage Authority |
| `qa-astro-market-001a-thai-astrology-competitor-evidence-and-positioning-addendum.md` | Current-Lineage Authority |
| `astro-sky-001-explainable-planetarium-and-multi-house-visualization-capability-definition.md` | Current-Lineage Authority |
| `qa-astro-sky-001-explainable-planetarium-and-multi-house-visualization-capability-definition.md` | Current-Lineage Authority |

Upstream vocabulary referenced by this baseline (for example, the time-state field identities `referenceNow`, `selectedEventTime`, `calculationTime`, `calculatedAt`, and the strategic-state vocabulary recorded in `ASTRO-MARKET-001A`) is treated as **established upstream authority**, not re-decided here.

---

## 5. Core Taxonomy Model — Canonical Concept Record

A **Canonical Concept Record** is the conceptual unit of the Taxonomy Register. This is conceptual architecture only; no executable JSON/database/TypeScript schema is created here.

| Field | Meaning |
| :--- | :--- |
| Canonical concept identity | A stable identity distinguishing this concept from every other, independent of any label. |
| Preferred canonical label | The preferred label within a stated tradition/school and language scope. |
| Concept category | A broad architecture-level category (Section 15). |
| Tradition / school scope | Which tradition(s), school(s), or system(s) the concept speaks to, where known. |
| Language-neutral conceptual identity | A stable conceptual anchor where appropriate, so identity does not depend on one language's spelling. |
| Source terminology | The original term(s) as they appear in the reviewed source(s). |
| Source record / provenance reference | Link(s) back to the reviewed Source Record(s) that support the concept. |
| Source locator | Exact locator where applicable: URL, repository path, bibliographic reference, page/edition. |
| Aliases | Alternate names that resolve to this concept without replacing its identity (Section 13). |
| Alternate spellings / transliterations | Spelling or script variants (Section 12). |
| Translated terms | Translations with provenance and uncertainty (Section 11). |
| Historical names | Names used historically, retained for traceability. |
| Abbreviation / symbol | Short form or symbol where applicable. |
| Semantic definition | Identity-defining and disambiguating semantics only: what entity/concept this identity refers to, how it differs from adjacent/similarly named concepts, and the scope necessary for identity resolution. |
| Distinction from similar concepts | Explicit statement of how this concept differs from similarly named concepts. |
| Known terminology conflicts | Recorded disagreements about terminology or meaning (Section 22). |
| Relationship to other concepts | Identity relationships: alias, translation, correspondence, derivation, related, distinct, unresolved (Section 10). |
| Taxonomy version | The taxonomy version in which this identity was established (Section 18). |
| Status | The concept's position in the taxonomy status model (Section 32). |
| Notes / ambiguity | Open questions, translation uncertainty, partial-source caveats, or other ambiguity. |

The **Semantic definition** field is limited to identity-defining and disambiguating semantics. It is **not**:

```text
Taxonomy semantic definition
≠ interpretive knowledge
≠ predictive meaning
≠ executable rule semantics
≠ strategic meaning
```

No executable schema is defined here. The exact storage/cardinality/identifier-syntax model remains downstream work.

---

## 6. Canonical Identity vs Display Label

These are **distinct** concepts and must never be conflated.

```text
Canonical Identity
≠
Display Label
```

A stable identity must not depend on a UI-visible name. Conceptually:

```text
canonical concept ID
→ stable identity

Thai label
English label
traditional spelling
transliteration
UI-short label
→ representations / aliases
```

Rules:

- Changing a preferred label must **not** silently create a new conceptual identity.
- Identical labels must **not** prove that two concepts are the same.
- Identity is decided by reviewed evidence, not by visible text or slug.
- A label is a representation; an identity is the stable referent those representations point to.

---

## 7. Source Authority Dependency

Taxonomy Authority may only canonically establish terminology from admissible Source Authority inputs.

Required conceptual lineage:

```text
Source Record
→ terminology evidence
→ tradition/school context
→ taxonomy review
→ Canonical Concept Record
```

Taxonomy must **not** create authoritative concepts from:

- AI/model memory alone;
- existing runtime code alone;
- UI labels alone;
- screenshots;
- competitor terminology;
- vendor marketing;
- unsupported online repetition.

Such material may serve only as evidence or context according to `ASTRO-SOURCE-001`. Taxonomy Authority must **not** mint canonical terms from model memory alone, and must not promote repository terminology into current taxonomy authority without review.

---

## 8. Identity Resolution Policy

When candidate terms are considered for taxonomy, identity resolution must be evidence-backed and must not force premature equivalence.

Conceptually:

```text
Term A
and
Term B
```

Taxonomy review may determine:

```text
A = alias of canonical concept X
```

or:

```text
A and B = distinct concepts
```

or:

```text
relationship unresolved
```

Rules:

- Equivalence requires evidence-backed identity resolution.
- Do **not** force premature equivalence.
- Do **not** let text similarity or a shared translation alone decide identity.
- A resolution decision must trace to reviewed source evidence (Section 31).

---

## 9. Tradition / School Scope

Tradition/school identity is first-class. Taxonomy must not create globally universal concepts merely because names look similar.

Examples of systems that may later appear in the register:

- Thai astrology traditions;
- Western astrology;
- Chinese metaphysics;
- BaZi;
- Qi Men Dun Jia;
- I Ching;
- numerology systems;
- other explicitly identified systems.

Critical rules:

```text
same or similar term
+
different tradition/school
≠ automatically same canonical concept
```

```text
different term
+
same tradition
≠ automatically different concept
```

Identity resolution requires evidence in both directions.

---

## 10. Cross-Tradition Mapping

Cross-tradition correspondence may be represented conceptually, but never as silent identity collapse.

Candidate relationship kinds (exact names not locked; executable relation schema remains downstream work):

- exact identity within a defined taxonomy scope;
- alias;
- translation;
- approximate correspondence;
- analogous role;
- historical derivation;
- related concept;
- explicitly distinct concept;
- unresolved relationship.

A mapping between two traditions is recorded as a **relationship**, not as a merge of two identities. It must preserve both source concepts and the tradition/school context of each.

---

## 11. Translation Discipline

Translation must not silently create identity.

```text
Original term
→ translated label
```

does not automatically mean:

```text
translated label
= authoritative conceptual definition
```

Requirements:

- preserve the original-language term when available;
- preserve source and locator;
- record translation provenance;
- distinguish translation from transliteration (Section 12);
- preserve uncertainty;
- allow multiple translations for one term;
- do not overwrite original terminology;
- do not let AI-generated translation become canonical without human/domain review.

---

## 12. Transliteration / Romanization

Distinguish:

```text
translation
```

from:

```text
transliteration / romanization
```

A transliteration represents spelling/pronunciation in another script; it is not necessarily a semantic translation.

- A transliteration variant is recorded as an alternate spelling, not as an authoritative definition.
- `ASTRO-TAXONOMY-001` does **not** choose a universal transliteration standard here. If multiple systems exist, that remains a future policy question.
- Transliteration provenance and uncertainty must be recorded where relevant.

---

## 13. Synonym / Alias Policy

Aliases may include:

- alternate spelling;
- historical spelling;
- abbreviated term;
- transliteration variant;
- UI shorthand;
- regional term;
- commonly used alternate name.

An alias:

- does **not** replace canonical identity;
- remains traceable to evidence where appropriate;
- may be tradition-specific;
- may be deprecated without deleting historical provenance.

Common usage does **not** by itself confer canonical authority.

---

## 14. Homonym / Collision Policy

Two terms may have identical text but different meanings. Taxonomy must support conceptual collision handling.

Example pattern:

```text
same visible label
→ concept X in school A
→ concept Y in school B
```

These must remain separate identities unless evidence establishes otherwise. Canonical identity must therefore **not** be generated solely from visible text or a text-derived slug.

---

## 15. Concept Category (Broad Architecture Level)

Concept categories are defined only at a broad architecture level. This baseline does **not** fully enumerate the Astro taxonomy.

Candidate categories may eventually include concepts relating to:

- celestial body / astronomical object identity;
- astrology point/object identity;
- house;
- sign / zodiac identity;
- aspect;
- dignity/status;
- time-state concept;
- calendar concept;
- location/observer concept;
- rule concept;
- strategic state;
- evidence/source concept;
- tradition/school;
- numerical/numerology concept;
- Chinese metaphysics concept;
- I Ching concept;
- other domain-specific identities.

Exact V1 taxonomy corpus and category list are deferred (Section 34).

---

## 16. Astronomical Identity vs Astrological Interpretation

An important separation must be maintained:

```text
Astronomical / calculated object identity
≠
Astrological interpretation
```

For example, a celestial object may have a stable calculation identity while different schools assign different meanings or rules to it.

- Taxonomy must support this separation.
- Taxonomy must **not** encode interpretive meaning as if it were calculated fact.
- A single astronomical identity may legitimately link to multiple tradition-specific astrological concepts without collapsing them.

---

## 17. Calculation-Facing Identity Contract

Calculation Authority must consume canonical identities rather than arbitrary labels, **for identity-sensitive, calculation-referenced domain concepts**. Narrative explanation text, temporary UI wording, and ephemeral user context are not automatically taxonomy entities and do not require canonical identities.

Conceptually:

```text
calculation input/output
→ canonical identity reference
```

not:

```text
calculation input/output
→ loosely parsed UI string
```

CALC must **not** determine concept identity by guessing names. For calculation-relevant concepts, taxonomy should provide sufficient identity context:

- canonical identity;
- tradition/school scope;
- applicable policy/version identity where appropriate;
- aliases only for input resolution;
- taxonomy version.

The actual Calculation Snapshot schema is **not** defined here (owned by `ASTRO-CALC-001`).

---

## 18. Taxonomy Versioning

Taxonomy must be version-aware.

Principles:

- canonical identities should remain stable where possible;
- changing a display label does **not** require a new identity;
- material semantic change must be versioned, or create a new concept where appropriate;
- merged/split concepts require explicit migration/history (Sections 20, 21);
- deprecated identities must remain resolvable for historical artifacts;
- old Calculation Snapshots must remain interpretable against the taxonomy version used at calculation time.

No version-numbering format is chosen here.

---

## 19. Immutability / Historical Traceability

Do not silently rewrite historical meaning.

If taxonomy changes:

```text
v1 concept meaning
→ later corrected/refined
```

historical records must remain traceable to the prior taxonomy state.

No silent retroactive reinterpretation of:

- Calculation Snapshots;
- Validation Records;
- rule-derived findings;
- decision history;
- exported/PDF artifacts.

Exact persistence implementation is downstream work.

---

## 20. Merge / Split Policy

Conceptual taxonomy evolution must handle merge and split without rewriting history.

### 20.1 Merge

Two previously distinct identities are later determined to represent one concept.

Must preserve:

- old identities;
- provenance;
- merge decision;
- canonical successor/reference;
- historical resolution.

### 20.2 Split

One earlier identity is later found to conflate multiple concepts.

Must preserve:

- previous identity;
- split reason;
- new identities;
- source evidence;
- affected lineage.

Do **not** auto-rewrite past records; past records keep referencing the identity/version they originally used.

---

## 21. Deprecation Policy

Deprecated does not mean deleted.

A deprecated concept/alias must retain:

- historical identity;
- reason for deprecation;
- successor where applicable;
- version context;
- provenance.

This is required for explainability and auditability.

---

## 22. Taxonomy Conflict Policy

When terminology sources disagree:

```text
Source A terminology
≠
Source B terminology
```

do not let Taxonomy Authority resolve by:

- majority vote;
- model preference;
- popularity alone;
- current UI usage;
- developer convenience.

Instead:

```text
record conflict
→ identify source/tradition/edition/language
→ preserve candidate meanings
→ review identity relationship
→ explicit taxonomy decision
→ provenance
```

If unresolved, `UNRESOLVED` must be allowed conceptually. Do not fabricate consensus.

---

## 23. Canonicalization Authority Boundary

Taxonomy Authority may decide:

- canonical identity;
- preferred canonical label within a stated scope;
- aliases;
- relationship between terms;
- taxonomy version;
- deprecation/merge/split dispositions and history (Section 32).

Taxonomy Authority may **not** decide:

- formula correctness;
- calculated planetary position;
- house placement;
- ephemeris output;
- validation result;
- interpretive rule truth;
- strategic recommendation.

Those belong downstream.

---

## 24. AI Boundary

AI may assist:

- term discovery;
- duplicate candidate detection;
- alias suggestions;
- translation candidate generation;
- conflict surfacing;
- source comparison;
- proposed mappings.

AI may **not** silently:

- mint authoritative canonical identities;
- merge concepts;
- split concepts;
- choose tradition equivalence;
- elevate a translation;
- delete conflicting terminology;
- decide formula semantics;
- transform model memory into taxonomy authority.

Canonical elevation requires reviewed evidence and human/domain approval.

---

## 25. UI Boundary

UI labels are representations of canonical concepts; UI is **not** Taxonomy Authority.

```text
UI text
≠
canonical identity
```

- Changing a button/dropdown/diagram label must not mutate taxonomy identity.
- Renderer geometry and visualization labels must not create new canonical facts.
- UI text may reference a canonical identity; it does not define it.

---

## 26. Knowledge / Rule Boundary

Taxonomy supplies identities to Knowledge and Rule Authority. It does not itself encode full interpretive knowledge or executable rules.

Conceptually:

```text
Canonical Concept
→ Knowledge may describe it
→ Rule Authority may reference it
```

But:

```text
taxonomy definition
≠ interpretive rule
```

The taxonomy semantic definition is limited to identity-defining and disambiguating semantics (Section 5); it does not carry interpretive knowledge, predictive meaning, rule semantics, or strategic meaning.

KNOW/RULE work is **not** moved into `ASTRO-TAXONOMY-001`.

---

## 27. Downstream Contract — ASTRO-CALC-001

`ASTRO-TAXONOMY-001` must provide `ASTRO-CALC-001`:

- canonical identity references for calculation-relevant concepts;
- canonical tradition/school identities;
- recognized aliases for input resolution;
- the explicit distinction between aliases and canonical identity;
- applicable taxonomy version;
- unresolved identity conflicts that must block or constrain calculation policy;
- provenance back to Source Authority.

CALC must **not**:

- invent its own taxonomy independently;
- infer identity from display strings where a canonical identity is available.

---

## 28. Relationship to ASTRO-VALID-001

Validation must be able to determine:

- which canonical identity was calculated;
- under which taxonomy version;
- under which tradition/school scope.

Taxonomy disagreement and calculation correctness are **separate** validation concerns. Validation methodology is **not** implemented here (owned by `ASTRO-VALID-001`).

---

## 29. Relationship to Knowledge / Rule / Explain

Future layers should consume canonical references rather than free-text identity guessing, **for identity-sensitive, machine-referenced domain concepts**. Ordinary explanation prose and narrative wording are not automatically taxonomy entities.

Conceptually:

```text
Knowledge entry
Rule definition
Explanation evidence
```

should reference:

```text
Canonical Concept Identity
+
Taxonomy Version
```

where applicable. No executable contracts are defined yet.

---

## 30. Strategic-State Taxonomy Boundary

The Astro architecture already refers to strategic-state / confidence terminology (recorded in `ASTRO-MARKET-001A`; candidate confidence vocabulary remains deferred by `ASTRO-ARCH-001`).

`ASTRO-TAXONOMY-001` may establish that identity-sensitive strategic-state concepts require canonical identities eventually, but must **not** redesign strategic decision semantics in this task. Narrative strategic guidance and explanatory wording are not automatically taxonomy entities.

Do not collapse:

```text
taxonomy identity
```

with:

```text
strategic recommendation
```

Strategic-state vocabulary is registered as needing canonical identity; its exact canonical wording and semantics remain deferred (Section 34).

---

## 31. Source Register Linkage

Every canonical taxonomy decision must conceptually trace:

```text
Canonical Concept / Alias / Mapping Decision
→ reviewed Source Record(s)
→ locator / edition / language
→ tradition/school
→ taxonomy review decision
```

No anonymous canonicalization.

---

## 32. Required Status Model

Taxonomy state is separated into three conceptual dimensions, without defining executable schemas or enums.

```text
status
≠ relationship
≠ evolution event
```

### 32.1 Review / Lifecycle Status

Where a concept sits in the review/lifecycle pipeline.

Examples may include:

- discovered;
- candidate;
- under review;
- canonical within stated scope;
- disputed;
- unresolved;
- deprecated;
- superseded.

Exact names remain deferred.

### 32.2 Identity Relationship

How a term relates to a canonical identity.

Examples may include:

- alias of;
- translation of;
- related to;
- distinct from;
- approximate correspondence;
- unresolved relationship.

These are relationships, not lifecycle statuses.

### 32.3 Taxonomy Evolution History / Disposition

Recorded change history and disposition of identities.

Examples may include:

- merged into;
- split into;
- superseded by;
- deprecated in version.

These record evolution/history, not ordinary review status.

Conceptual example:

```text
Concept X
review/lifecycle status = canonical within scope

Term Y
relationship = alias of Concept X

Concept Z
evolution history = merged into Concept X
```

Exact vocabulary/schema remains downstream work. **Status is not evidence authority**: a status label does not replace reviewed source evidence.

---

## 33. Roadmap Integrity

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

- `ASTRO-TAXONOMY-001` occupies the Taxonomy Authority stage only; it does not reorder, insert, or remove any stage.
- `ASTRO-SKY` remains lateral and deferred; `ASTRO-TAXONOMY-001` does **not** authorize ASTRO-SKY implementation.

---

## 34. Open Questions (Deferred)

The following are deliberately deferred; no decision is made in this baseline:

- exact V1 Canonical Concept corpus;
- exact list of Thai astrology terms;
- exact Chinese metaphysics term corpus;
- exact I Ching taxonomy;
- canonical identifier syntax;
- slug format;
- database/schema;
- enum values;
- taxonomy storage engine;
- graph/database technology;
- migration mechanism;
- final transliteration standard;
- localization framework;
- exact multilingual search behavior;
- fuzzy matching algorithm;
- embedding/vector strategy;
- automated entity resolution;
- source confidence scoring;
- formula selection;
- exact strategic-state canonical wording and confidence vocabulary.

---

## 35. Required Non-Goals

- no runtime implementation;
- no database implementation;
- no UI implementation;
- no formula selection;
- no calculation implementation;
- no ephemeris selection;
- no house-system selection;
- no zodiac-mode selection;
- no ayanamsha selection;
- no interpretation/rule implementation;
- no strategic guidance changes;
- no dependency selection;
- no license approval;
- no OCR;
- no RAG;
- no embeddings/vector DB;
- no fuzzy matcher implementation;
- no identifier-generation implementation;
- no localization implementation;
- no implementation authorization.

---

## 36. Decision Summary

- **Canonical Concept Record** established (conceptual; no executable schema).
- **Canonical identity vs display label** separated: a label is a representation, never the identity.
- **Source Authority dependency** established: taxonomy canonicalizes only from reviewed source evidence; taxonomy defines no new evidence classes.
- **Canonicalization scope** limited to authoritative, reusable, or machine-referenced identity-sensitive domain concepts; ordinary prose, narrative, temporary UI wording, and ephemeral user context are not automatically taxonomy entities.
- **Semantic definition** limited to identity-defining and disambiguating semantics; it excludes interpretive knowledge, predictive meaning, executable rule semantics, and strategic meaning.
- **Identity resolution** established: evidence-backed; no forced equivalence; unresolved allowed.
- **Tradition/school scope** established: similar names across systems are not auto-merged; different names in one system are not auto-split.
- **Cross-tradition mapping** established as relationships, never silent identity collapse.
- **Translation, transliteration, alias, and homonym/collision policies** established.
- **Astronomical identity vs astrological interpretation** separated.
- **Calculation-facing identity contract** established: CALC consumes canonical identities, not UI strings.
- **Taxonomy versioning, historical traceability, merge/split/deprecation** established.
- **Status model** separated into three dimensions: review/lifecycle status, identity relationship, and evolution history/disposition (`status ≠ relationship ≠ evolution event`).
- **Taxonomy conflict policy** established: preserve disagreement; no majority vote or AI preference.
- **AI/UI/knowledge/rule boundaries** established.
- **Downstream contracts** established for `ASTRO-CALC-001`, `ASTRO-VALID-001`, and future KNOW/RULE/EXPLAIN layers.
- **Roadmap unchanged**: `ASTRO-ARCH → … → ASTRO-STRATEGY`; ASTRO-SKY remains lateral and deferred.
- **No formula, system, dependency, or license choice** made.

```text
DOCUMENT_STATUS=CURRENT_LINEAGE_TAXONOMY_AUTHORITY_BASELINE
WORK_TYPE=DOCS_ONLY
AUTHORITY_LAYER=TAXONOMY_AUTHORITY_ONLY
ROADMAP_SEQUENCE_CHANGED=NO
```

---

*End of ASTRO-TAXONOMY-001. Docs-only taxonomy-governance baseline; no formulas, systems, dependencies, licenses, or runtime artifacts established.*
