import { describe, expect, it, vi } from "vitest";
import { createDefaultRoseDay0State } from "@/components/workspaces/travel/rose-trial/day-0/defaults";
import {
  copyRoseDay0Markdown,
  createRoseDay0MarkdownPreview,
  formatRoseDay0SavedTimestamp,
  getPreparationSnapshotChangeReasons,
  regenerateRoseDay0TrialUnits,
} from "@/components/workspaces/travel/rose-trial/day-0/logic";
import type { RoseDay0State } from "@/components/workspaces/travel/rose-trial/day-0/types";
import type { RoseTrialState } from "@/components/workspaces/travel/rose-trial/types";

function createDay0State(): RoseDay0State {
  const state = createDefaultRoseDay0State({
    trialName: "Rose Trial",
    cropName: "กุหลาบ",
    goal: "Test rooting",
    batchName: "B1",
    plannedStartDate: "2026-07-11",
    totalCuttings: 3,
    readinessStatus: "ready_for_day0",
    sourceUpdatedAt: "2026-07-10T00:00:00.000Z",
    treatments: [
      {
        code: "T0",
        name: "Control",
        description: "No input",
        cuttingCount: 2,
        inputName: "น้ำเปล่า",
        notes: "control note",
      },
      {
        code: "T1",
        name: "IBA",
        description: "Rooting input",
        cuttingCount: 1,
        inputName: "IBA",
        notes: "iba note",
      },
    ],
  });

  return {
    ...state,
    status: "completed",
    completedAt: "2026-07-11T08:00:00.000Z",
    notes: "do not reset me",
    startInfo: {
      ...state.startInfo,
      location: "โรงเรือน QA",
      notes: "start note",
    },
    observation: {
      directObservation: "กิ่งสดดี",
      interpretation: "สภาพตั้งต้นเหมาะสม",
      uncertainty: "ความชื้นอาจแกว่ง",
    },
    treatments: [
      {
        id: "treatment-t0",
        code: "T0",
        name: "Control",
        description: "No input",
        cuttingCount: 2,
        inputName: "น้ำเปล่า",
        notes: "control note",
        source: "default",
      },
      {
        id: "treatment-t1",
        code: "T1",
        name: "IBA",
        description: "Rooting input",
        cuttingCount: 1,
        inputName: "IBA",
        notes: "iba note",
        source: "default",
      },
    ],
    trialUnits: [
      {
        id: "ROSE-B1-T0-01",
        treatmentId: "treatment-t0",
        treatmentCode: "T0",
        sequenceNumber: 1,
        label: "กิ่งที่ 1 - Control",
        containerCode: "POT-01",
        initialCondition: "สดมาก",
        notes: "preserve note",
      },
      {
        id: "ROSE-B1-T0-02",
        treatmentId: "treatment-t0",
        treatmentCode: "T0",
        sequenceNumber: 2,
        label: "กิ่งที่ 2 - Control",
        containerCode: "POT-02",
        initialCondition: "สดดี",
        notes: "remove if count drops",
      },
      {
        id: "ROSE-B1-T1-01",
        treatmentId: "treatment-t1",
        treatmentCode: "T1",
        sequenceNumber: 1,
        label: "กิ่งที่ 1 - IBA",
        containerCode: "POT-03",
        initialCondition: "สดดี",
        notes: "t1 note",
      },
    ],
  };
}

function createPreparationState(overrides: Partial<RoseTrialState> = {}): RoseTrialState {
  const base: RoseTrialState = {
    version: 1,
    pilot: {
      trialName: "Rose Trial",
      cropName: "กุหลาบ",
      goal: "Test rooting",
      location: "โรงเรือน QA",
      expectedStartDate: "2026-07-11",
      notes: "",
    },
    batch: {
      batchName: "B1",
      totalCuttings: 3,
      plannedStartDate: "2026-07-11",
      notes: "",
    },
    checklistItems: [],
    treatments: [
      {
        id: "treatment-t0",
        code: "T0",
        name: "Control",
        description: "No input",
        cuttingCount: 2,
        inputName: "น้ำเปล่า",
        notes: "control note",
        source: "default",
      },
      {
        id: "treatment-t1",
        code: "T1",
        name: "IBA",
        description: "Rooting input",
        cuttingCount: 1,
        inputName: "IBA",
        notes: "iba note",
        source: "default",
      },
    ],
    updatedAt: "2026-07-10T00:00:00.000Z",
  };

  return { ...base, ...overrides };
}

describe("Rose Trial Day 0 Stage 2D.2 regeneration safety", () => {
  it("regenerates without resetting other Day 0 sections", () => {
    const state = createDay0State();

    const result = regenerateRoseDay0TrialUnits(state);

    expect(result.state.startInfo).toEqual(state.startInfo);
    expect(result.state.observation).toEqual(state.observation);
    expect(result.state.notes).toBe("do not reset me");
    expect(result.state.trialUnits).toHaveLength(3);
  });

  it("preserves matching Trial Unit fields", () => {
    const state = createDay0State();

    const result = regenerateRoseDay0TrialUnits(state);
    const preserved = result.state.trialUnits.find((unit) => unit.id === "ROSE-B1-T0-01");

    expect(preserved?.containerCode).toBe("POT-01");
    expect(preserved?.initialCondition).toBe("สดมาก");
    expect(preserved?.notes).toBe("preserve note");
  });

  it("adds new IDs and removes excess IDs after confirm", () => {
    const state = createDay0State();
    state.treatments = state.treatments.map((treatment) =>
      treatment.code === "T0" ? { ...treatment, cuttingCount: 1 } : { ...treatment, cuttingCount: 2 }
    );

    const result = regenerateRoseDay0TrialUnits(state);
    const ids = result.state.trialUnits.map((unit) => unit.id);

    expect(ids).toEqual(["ROSE-B1-T0-01", "ROSE-B1-T1-01", "ROSE-B1-T1-02"]);
    expect(result.warnings).toHaveLength(1);
  });

  it("moves completed state back to draft after regenerate", () => {
    const result = regenerateRoseDay0TrialUnits(createDay0State());

    expect(result.state.status).toBe("draft");
    expect(result.state.completedAt).toBeNull();
  });
});

describe("Rose Trial Day 0 Stage 2D.2 export preview logic", () => {
  it("creates preview content without writing to clipboard", () => {
    const clipboard = { writeText: vi.fn() };
    const preview = createRoseDay0MarkdownPreview(createDay0State(), new Date("2026-07-11T09:00:00.000Z"));

    expect(preview.markdown).toContain("Rose Trial Day 0 Record");
    expect(preview.generatedAt).toBe("2026-07-11T09:00:00.000Z");
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it("reports clipboard success", async () => {
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };

    await expect(copyRoseDay0Markdown("markdown", clipboard)).resolves.toEqual({ ok: true });
    expect(clipboard.writeText).toHaveBeenCalledWith("markdown");
  });

  it("keeps preview content available after clipboard failure", async () => {
    const preview = createRoseDay0MarkdownPreview(createDay0State());
    const clipboard = { writeText: vi.fn().mockRejectedValue(new Error("denied")) };

    const result = await copyRoseDay0Markdown(preview.markdown, clipboard);

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toContain("denied");
    expect(preview.markdown).toContain("กิ่งสดดี");
  });
});

describe("Rose Trial Day 0 Stage 2D.2 snapshot warning", () => {
  it("does not warn when Preparation matches snapshot", () => {
    const state = createDay0State();

    expect(getPreparationSnapshotChangeReasons(state.trialSnapshot, createPreparationState())).toEqual([]);
  });

  it("warns when batch changes", () => {
    const state = createDay0State();
    const prep = createPreparationState({
      batch: {
        batchName: "B9",
        totalCuttings: 3,
        plannedStartDate: "2026-07-11",
        notes: "",
      },
    });

    expect(getPreparationSnapshotChangeReasons(state.trialSnapshot, prep)).toContain("ชื่อ Batch เปลี่ยนจาก Preparation ปัจจุบัน");
  });

  it("warns when treatment count changes without mutating snapshot", () => {
    const state = createDay0State();
    const before = JSON.stringify(state.trialSnapshot);
    const prep = createPreparationState({
      treatments: createPreparationState().treatments.map((treatment) =>
        treatment.code === "T1" ? { ...treatment, cuttingCount: 2 } : treatment
      ),
    });

    expect(getPreparationSnapshotChangeReasons(state.trialSnapshot, prep)).toContain("จำนวนกิ่งของ Treatment T1 เปลี่ยนจาก Preparation ปัจจุบัน");
    expect(JSON.stringify(state.trialSnapshot)).toBe(before);
  });
});

describe("Rose Trial Day 0 Stage 2D.2 saved timestamp", () => {
  it("formats saved state with Thai locale text", () => {
    expect(formatRoseDay0SavedTimestamp("2026-07-11T09:15:00.000Z")).toContain("บันทึกล่าสุด:");
  });

  it("does not invent a saved time when no timestamp exists", () => {
    expect(formatRoseDay0SavedTimestamp(null)).toBe("ยังไม่ได้บันทึก");
    expect(formatRoseDay0SavedTimestamp("not-a-date")).toBe("ยังไม่ได้บันทึก");
  });
});
