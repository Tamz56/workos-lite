# WorkOS Operations Authority Boundary — v1

Status: `AUTOMATION-001-P1E` hardening reference (P1E.1C)

P1E implementation surface is completed through P1E.1C; an independent
whole-repository bypass review (`P1E-R1`) is still required before final
network-capable closure. This document is not a claim of full closure.

This document is the authoritative description of who may perform a meaningful
persistent domain write in WorkOS and through which path.

---

## 1. Network threat model

WorkOS is designed so that reachability through LAN, VPN, tunnel, or a remote
browser **never implies human authority**. The application trust model rejects:

- `localhost = trusted human`
- `same network = trusted human`
- `UI caller = authenticated human`
- `cookie exists = authenticated human`
- `agent credential → H1 human mutation authority`

The authoritative human identity boundary is the server-validated H2 session
(opaque token, SHA-256 stored server-side, 12h expiry, revocation, operator
enabled check) combined with trusted-origin enforcement.

---

## 2. Authority classes

### H1 — Authenticated first-party human interactive writes

H1 does **not** mean "called by our UI".

H1 means:

```text
valid server-resolved WorkOS human session
+ trusted Origin
+ route-level mutation authorization (requireHumanMutation)
```

Covered surfaces (P1E.1B Tier-0/core + P1E.1C remaining families):

- Tasks (create/update/delete/batch/run-agent/attachments)
- Docs (create/update/delete/cleanup-drafts)
- Events + Attachments (create/delete)
- Projects + project items (create/update/delete/execute/items)
- Backup restore, legacy Import, Admin (reset/create-from-template)
- Notes + note links
- Lists (create/update/delete)
- Sprints + sprint items
- Planner (days/items) + Planner Import execute
- Writing Lab (story sets/episodes/projects/blocks/seed)
- Writing Desk (drafts/review)
- Prompt Studio (templates/versions/workflows/steps/run logs)
- Arbor Inbox
- Content Package
- Project secondary families (doc-blocks/decisions/loops/gates/context)

Denial contract:

```text
no/invalid H2 session          → 401 HUMAN_AUTH_SESSION_INVALID
valid H2 + missing/foreign Origin → 403 HUMAN_AUTH_CSRF_REJECTED
```

### G1 — Operations Gateway

```text
agent proposes                    → POST /api/operations (agent-key, operations:request)
agent reads owned operation       → GET  /api/operations/[id] (agent-key, operations:read)
human reviews                     → GET  /api/human/operations(+[id]) (H2)
human approve / reject / revoke   → POST /api/human/operations/[id]/* (H2 + trusted Origin)
human execute                     → POST /api/human/operations/[id]/execute (H2 + trusted Origin)
governed execution audit          → operation_execution_attempts / operation_approval_events
```

Agents may propose, persist candidates, and read owned operations. Agents may
not approve or execute.

### G2 — Project Import (separately governed workflow)

`/api/project-import/**` keeps its own agent-key + capability-scope governance:

```text
dry-run   → project_import:dry_run   (persists audit-only batch/rows)
approve   → project_import:approve
reject    → project_import:reject
revoke    → project_import:revoke
execute   → project_import:execute   (requires an approval; writes project_items /
                                      project_doc_blocks with audit)
```

G2 is an explicit documented exception; it is not routed through the Operations
Gateway and must not receive generic H1 guards.

### Legacy agent surface (P1E.1C Phase B/C)

```text
POST /api/agent/execute
  dry_run:true   → preview only, zero domain write
  dry_run:false  → 403 AGENT_DIRECT_WRITE_DISABLED (gateway: /api/operations)

POST /api/agent/proxy  → REMOVED (no production caller; latent duplicate bypass)

Agent Debugger         → preview-only (Preview Build retained; Execute Now disabled)
```

The six legacy action types (task.create/update, doc.create/update,
event.create, attachment.create) have **no** Operations Gateway equivalent today;
live legacy writes are simply forbidden rather than migrated.

### C1 — Control / auth / audit mutations

```text
POST /api/human-auth/logout   (session revocation)
POST /api/agent/login         (agent UI cookie)
POST /api/agent/logout        (agent UI cookie)
```

Not domain-write authority.

### AUTH_BOOTSTRAP

```text
POST /api/human-auth/login    (creates the H2 session; must never require one)
```

### READ_ONLY_POST

```text
POST /api/backup/validate        (parse/verify only; no durable domain mutation)
POST /api/planner-import/preview (parse/preview only; no durable domain mutation)
```

Classification is based on side effects, not HTTP method.

### PREVIEW_ONLY

```text
POST /api/agent/execute (dry_run:true)
```

---

## 3. Static authority registry

`src/lib/authority/mutationAuthorityRegistry.ts` is the explicit
route/method → classification manifest. `tests/unit/mutationAuthorityRegistry.test.ts`
scans the repository route inventory and fails when a new unclassified mutation
route appears. The registry is a guardrail and audit artifact; runtime
authorization remains route-level.

---

## 4. Forbidden patterns

- Any agent/external meaningful write outside G1/G2.
- Any H1 route that mutates without `requireHumanMutation`.
- Silent direct-write fallback (env missing → write allowed, auth uncertain →
  write allowed, Gateway unavailable → direct write).
- `ALLOW_LEGACY_AGENT_WRITES=1` style runtime bypass.

---

## 5. Change discipline

Any new mutation surface must be classified in the registry, protected at the
route level, and documented here before it ships.
