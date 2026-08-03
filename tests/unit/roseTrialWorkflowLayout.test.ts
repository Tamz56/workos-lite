import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Rose Trial workflow layout", () => {
  it("keeps the seven JSX sections in the approved workflow order", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/workspaces/travel/rose-trial/RoseTrialLabClient.tsx"),
      "utf8"
    );
    const sectionMarkers = [
      "ก. ข้อมูลภาพรวมการทดลอง",
      "ข. ตั้งค่า Batch",
      "<SamplePreparationSection",
      "<InventorySection",
      "<PreparationChecklistSection",
      "<TreatmentProductSection",
      "ง. กำหนด Treatment",
    ];
    const positions = sectionMarkers.map((marker) => source.indexOf(marker));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });
});
