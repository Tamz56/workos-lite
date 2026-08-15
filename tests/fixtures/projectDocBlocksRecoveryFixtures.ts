// ---------------------------------------------------------------------------
// P1G-D0.7B-3C-3 — synthetic recovery fixture
// Hermetic replacement for the untracked historical recovery JSON.
// Minimal but sufficient for importer coverage (Thai Unicode, Markdown,
// array semantics, duplicate/conflict behavior). Deterministic data only.
// ---------------------------------------------------------------------------

export type RecoveryFixtureRecord = {
  id: string;
  projectSlug: string;
  type: string;
  title: string;
  date: string;
  summary: string;
  details: string;
  evidenceLinks: string[];
  relatedFiles: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
};

export const RECOVERY_FIXTURE_RECORDS: RecoveryFixtureRecord[] = [
  {
    id: "rec-1-workos-sop",
    projectSlug: "workos-lite-arbordesk",
    type: "sop",
    title: "SOP: บันทึกการกลับมาทำงาน",
    date: "2026-08-01",
    summary: "สรุปภาษาไทยสำหรับการกลับมาทำงาน",
    details: "ศึกษาปัญหาการกลับมาทำงาน\n\n```text\nขั้นตอนที่ 1: ตรวจรายการ\nขั้นตอนที่ 2: ยืนยันผล\n```",
    evidenceLinks: ["https://example.com/a", "https://example.com/b"],
    relatedFiles: ["a.ts", "b.ts"],
    status: "active",
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
  },
  {
    id: "rec-2-gf-decision",
    projectSlug: "green-fineness-content",
    type: "decision",
    title: "Decision: เนื้อหา Green Fineness",
    date: "2026-08-02",
    summary: "บันทึกการตัดสินใจด้านเนื้อหา",
    details: "ยืนยันทิศทางเนื้อหา\n- ใช้ภาษาไทย\n- รักษา tone ให้สงบ",
    evidenceLinks: [],
    relatedFiles: [],
    status: "active",
    createdAt: "2026-08-02T09:30:00.000Z",
    updatedAt: "2026-08-02T09:30:00.000Z",
  },
];
