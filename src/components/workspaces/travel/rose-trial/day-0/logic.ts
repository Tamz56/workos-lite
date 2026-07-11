import type { RoseTrialState } from "../types";
import type { RoseDay0State } from "./types";
import { exportRoseDay0ToMarkdown } from "./exportMarkdown";
import { generateTrialUnits } from "./generateTrialUnits";

export interface RegenerateDay0Result {
  state: RoseDay0State;
  warnings: string[];
}

export interface Day0MarkdownPreview {
  markdown: string;
  generatedAt: string;
}

export interface CopyMarkdownResult {
  ok: boolean;
  errorMessage?: string;
}

type ClipboardWriter = Pick<Clipboard, "writeText">;

export function regenerateRoseDay0TrialUnits(state: RoseDay0State): RegenerateDay0Result {
  const result = generateTrialUnits(
    state.batch.batchName || state.trialSnapshot.batchName,
    state.treatments,
    state.trialUnits
  );

  return {
    state: {
      ...state,
      trialUnits: result.units,
      status: "draft",
      completedAt: null,
    },
    warnings: result.warnings,
  };
}

export function createRoseDay0MarkdownPreview(
  state: RoseDay0State,
  generatedAt = new Date()
): Day0MarkdownPreview {
  return {
    markdown: exportRoseDay0ToMarkdown(state),
    generatedAt: generatedAt.toISOString(),
  };
}

export async function copyRoseDay0Markdown(
  markdown: string,
  clipboard: ClipboardWriter | undefined = typeof navigator === "undefined" ? undefined : navigator.clipboard
): Promise<CopyMarkdownResult> {
  if (!clipboard) {
    return { ok: false, errorMessage: "ไม่พบระบบคลิปบอร์ดในบราวเซอร์นี้" };
  }

  try {
    await clipboard.writeText(markdown);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      errorMessage: error instanceof Error ? error.message : "ไม่สามารถคัดลอกเอกสารลงคลิปบอร์ดได้",
    };
  }
}

export function formatRoseDay0SavedTimestamp(updatedAt: string | null): string {
  if (!updatedAt) {
    return "ยังไม่ได้บันทึก";
  }

  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) {
    return "ยังไม่ได้บันทึก";
  }

  return `บันทึกล่าสุด: ${date.toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  })}`;
}

export function getPreparationSnapshotChangeReasons(
  snapshot: RoseDay0State["trialSnapshot"],
  preparation: RoseTrialState
): string[] {
  const reasons: string[] = [];

  if (snapshot.trialName !== preparation.pilot.trialName) {
    reasons.push("ชื่อการทดลองเปลี่ยนจาก Preparation ปัจจุบัน");
  }

  if (snapshot.batchName !== preparation.batch.batchName) {
    reasons.push("ชื่อ Batch เปลี่ยนจาก Preparation ปัจจุบัน");
  }

  if (snapshot.totalCuttings !== preparation.batch.totalCuttings) {
    reasons.push("จำนวนกิ่งรวมตามแผนเปลี่ยนจาก Preparation ปัจจุบัน");
  }

  const currentTreatments = new Map(
    preparation.treatments.map((treatment) => [treatment.code, treatment.cuttingCount])
  );
  const snapshotTreatments = new Map(
    snapshot.treatments.map((treatment) => [treatment.code, treatment.cuttingCount])
  );

  for (const [code, count] of snapshotTreatments) {
    if (!currentTreatments.has(code)) {
      reasons.push(`Treatment ${code} ไม่มีอยู่ใน Preparation ปัจจุบัน`);
      continue;
    }
    if (currentTreatments.get(code) !== count) {
      reasons.push(`จำนวนกิ่งของ Treatment ${code} เปลี่ยนจาก Preparation ปัจจุบัน`);
    }
  }

  for (const code of currentTreatments.keys()) {
    if (!snapshotTreatments.has(code)) {
      reasons.push(`Preparation ปัจจุบันมี Treatment ${code} เพิ่มเติม`);
    }
  }

  return reasons;
}
