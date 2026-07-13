import { describe, expect, it } from "vitest";
import { bangkokDateTimeLocalToIso, isoToBangkokDateTimeLocal } from "@/components/arbor-planner/resourceTime";

describe("AI resource reset time in Asia/Bangkok", () => {
    it("converts UTC ISO to Bangkok datetime-local", () => { expect(isoToBangkokDateTimeLocal("2026-07-15T10:00:00.000Z")).toBe("2026-07-15T17:00"); });
    it("round trips to the same instant", () => { const iso = "2026-07-15T10:00:00.000Z"; expect(bangkokDateTimeLocalToIso(isoToBangkokDateTimeLocal(iso))).toBe(iso); });
    it("handles null and empty values", () => { expect(isoToBangkokDateTimeLocal(null)).toBe(""); expect(bangkokDateTimeLocalToIso("")).toBeNull(); });
    it("rejects invalid local datetime", () => { expect(() => bangkokDateTimeLocalToIso("2026-02-30T10:00")).toThrow(/Reset time/); expect(() => bangkokDateTimeLocalToIso("not-a-date")).toThrow(/Reset time/); });
});
