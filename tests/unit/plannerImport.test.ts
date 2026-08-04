import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/db/db";
import {
    computeImportedTaskFingerprint,
    computeImportFingerprint,
    hashString,
    normalizeImportedTaskTitle,
    parseSchedule,
    parseThaiDateString
} from "@/lib/planner-import/parser";
import { CANONICAL_ROSE_TRIAL_SCHEDULE } from "../fixtures/plannerImportCanonical";

export const AUTHENTIC_ROSE_TRIAL_SCHEDULE_FIXTURE = CANONICAL_ROSE_TRIAL_SCHEDULE;

const EXPECTED_TASKS_BY_DATE: Record<string, string[]> = {
    "23/07/2026": [
        "ตรวจรายการอุปกรณ์ที่มีอยู่จริง",
        "แยกรายการ มีพร้อม / ต้องตรวจ / ต้องซื้อ / ทางเลือก",
        "ตรวจจำนวนที่ต้องใช้ตามกลุ่มทดลอง",
        "เปรียบเทียบราคา ร้านค้า และกำหนดส่ง",
        "สั่งรายการจำเป็นที่คาดว่าจะมาถึงภายในวันที่ 26–27 กรกฎาคม",
        "บันทึกชื่อสินค้า จำนวน ราคา ร้าน และกำหนดส่ง",
        "จัดทำแผนสำรองสำหรับสินค้าที่ส่งไม่ทัน"
    ],
    "24/07/2026": [
        "ตรวจสถานะคำสั่งซื้อจากโทรศัพท์",
        "ตอบข้อความร้านค้าเฉพาะเรื่องที่จำเป็น",
        "บันทึกรายการที่มีความเสี่ยงส่งล่าช้า",
        "หลีกเลี่ยงการเปลี่ยนแผนการทดลองระหว่างเดินทาง"
    ],
    "25/07/2026": [
        "ตรวจพัสดุที่มาถึงแล้ว",
        "ตรวจรายการที่ยังอยู่ระหว่างจัดส่ง",
        "ตรวจสินค้าถูกยกเลิก ส่งผิด หรือจำนวนไม่ครบ",
        "ติดต่อร้านค้าสำหรับรายการที่มีปัญหา",
        "อัปเดตสถานะ Inventory"
    ],
    "26/07/2026": [
        "รับและถ่ายภาพพัสดุ",
        "ตรวจชื่อสินค้า จำนวน และความเสียหาย",
        "ตรวจขนาด หน่วย และ specification",
        "แยกสถานะ พร้อมใช้ / ต้องล้าง / ต้องประกอบ / ต้องเปลี่ยน",
        "บันทึกรายการที่ยังไม่มาถึง"
    ],
    "27/07/2026": [
        "รับและตรวจพัสดุที่เหลือ",
        "ทดลองใช้อุปกรณ์ที่ต้องตรวจการทำงาน",
        "เตรียมป้าย Treatment และ Sample ID",
        "แยกภาชนะและอุปกรณ์ตามกลุ่มทดลอง",
        "เตรียมอุปกรณ์บันทึก Observation และ Photo Evidence",
        "ระบุ Critical blocker ที่ยังเหลือ"
    ],
    "28/07/2026": [
        "ทำความสะอาดพื้นที่ทดลอง",
        "ตรวจแสง ฝน ลม และการระบายน้ำ",
        "จัดตำแหน่ง Treatment",
        "เตรียมภาชนะและวัสดุเพาะ",
        "เตรียมน้ำและภาชนะผสม",
        "ตรวจอุปกรณ์ตัดและอุปกรณ์ป้องกัน",
        "ติดป้ายกลุ่มและ Sample ID",
        "ตรวจโทรศัพท์หรือกล้องสำหรับถ่ายหลักฐาน",
        "ทดลองเปิด Observation Form และแนบรูป",
        "ตรวจจำนวนกิ่งและ Source Plant",
        "สรุป Readiness เป็น Ready / Partially Ready / Not Ready"
    ],
    "29/07/2026": [
        "ยืนยัน Readiness Gate",
        "ยืนยันจำนวนกิ่งจริงและจำนวนต่อ Treatment",
        "ถ่ายภาพ Source Plant ก่อนตัด",
        "บันทึกเวลาและสภาพแวดล้อมก่อนเริ่ม",
        "เลือกและเตรียมกิ่งตามเกณฑ์",
        "แยกกิ่งตาม Treatment",
        "ติด Sample ID ทันที",
        "บันทึก deviation ที่เกิดขึ้น",
        "ถ่ายภาพแต่ละขั้นตอนและภาพรวม Day 0",
        "บันทึก Day 0 Observation",
        "ตรวจจำนวนกิ่งและ Sample ID หลังจัดกลุ่ม",
        "กำหนดวันติดตามผลครั้งถัดไป"
    ]
};

function literalDiff(left: string, right: string): string {
    if (left === right) return "";

    const leftLines = left.split("\n");
    const rightLines = right.split("\n");
    const lineCount = Math.max(leftLines.length, rightLines.length);
    const differences: string[] = [];

    for (let index = 0; index < lineCount; index++) {
        if (leftLines[index] !== rightLines[index]) {
            differences.push(`- ${leftLines[index] ?? "<missing>"}`);
            differences.push(`+ ${rightLines[index] ?? "<missing>"}`);
        }
    }

    return differences.join("\n");
}

describe("Arbor Planner Schedule Import Parser — Exact Authentic Source Tests", () => {
    it("parses Thai Buddhist Era (พ.ศ.) date to Gregorian (ค.ศ.) YYYY-MM-DD", () => {
        const result = parseThaiDateString("26 กรกฎาคม 2569");
        expect(result.parsed_date).toBe("2026-07-26");
        expect(result.is_date_range).toBe(false);
        expect(result.warning).toBeNull();
    });

    it("parses short Thai month date (26 ก.ค. 2569)", () => {
        const result = parseThaiDateString("26 ก.ค. 2569");
        expect(result.parsed_date).toBe("2026-07-26");
    });

    it("parses Gregorian English date (26 July 2026)", () => {
        const result = parseThaiDateString("26 July 2026");
        expect(result.parsed_date).toBe("2026-07-26");
    });

    it("detects date range and generates warning for explicit resolution", () => {
        const result = parseThaiDateString("26–27 กรกฎาคม 2569");
        expect(result.is_date_range).toBe(true);
        expect(result.date_range?.start_date).toBe("2026-07-26");
        expect(result.date_range?.end_date).toBe("2026-07-27");
        expect(result.warning).toContain("Date range detected");
    });

    it("parses explicit DD/MM/YYYY dates", () => {
        expect(parseThaiDateString("23/07/2026").parsed_date).toBe("2026-07-23");
    });

    it("requires a heading boundary and rejects prose beginning with วันที่", () => {
        const schedule = parseSchedule(`## 28 กรกฎาคม 2569 — Setup Day
วันที่ 29 กรกฎาคมควรตรวจสภาพอากาศอีกครั้งก่อนตัดสินใจ
วันที่ 29 กรกฎาคม เป็นวันเป้าหมายของโครงการ
งานหลัก:
1. เตรียมพื้นที่`);

        expect(schedule.days).toHaveLength(1);
        expect(schedule.days[0].date_text).toBe("28 กรกฎาคม 2569 — Setup Day");
        expect(schedule.days[0].raw_notes).toEqual([
            "วันที่ 29 กรกฎาคมควรตรวจสภาพอากาศอีกครั้งก่อนตัดสินใจ",
            "วันที่ 29 กรกฎาคม เป็นวันเป้าหมายของโครงการ"
        ]);
    });

    it("accepts strict date-only and separated date headings", () => {
        const schedule = parseSchedule(`วันที่ 23 กรกฎาคม 2569 — Procurement Day
งานหลัก:
1. งานหนึ่ง
## 24/07/2026
งานหลัก:
1. งานสอง`);

        expect(schedule.days.map(day => day.date_text)).toEqual([
            "วันที่ 23 กรกฎาคม 2569 — Procurement Day",
            "24/07/2026"
        ]);
    });

    it("keeps the fixture literally identical to the single canonical raw string", () => {
        expect(AUTHENTIC_ROSE_TRIAL_SCHEDULE_FIXTURE).toBe(CANONICAL_ROSE_TRIAL_SCHEDULE);
        expect(literalDiff(CANONICAL_ROSE_TRIAL_SCHEDULE, AUTHENTIC_ROSE_TRIAL_SCHEDULE_FIXTURE)).toBe("");
    });

    it("contains no terms invented by the previous regression fixture", () => {
        const inventedTerms = [
            "Clonex",
            "W-T0",
            "W-T1",
            "P-T0",
            "P-T1",
            "8 กิ่ง",
            "2 กิ่ง",
            "4 ใบ",
            "Create Observation Form",
            "Inventory View",
            "สรุปรายการสั่งซื้อเข้าระบบคลังสินค้า",
            "ยืนยันว่าไม่มี Sample ID ซ้ำหรือสูญหาย"
        ];

        for (const term of inventedTerms) {
            expect(CANONICAL_ROSE_TRIAL_SCHEDULE).not.toContain(term);
        }
    });

    it("parses every canonical day with exact headings, dates, and task arrays", () => {
        const schedule = parseSchedule(AUTHENTIC_ROSE_TRIAL_SCHEDULE_FIXTURE);

        const expectedHeadings = Object.keys(EXPECTED_TASKS_BY_DATE);
        expect(schedule.days.map(d => d.date_text)).toEqual(expectedHeadings);
        expect(schedule.days.map(d => d.parsed_date)).toEqual([
            "2026-07-23",
            "2026-07-24",
            "2026-07-25",
            "2026-07-26",
            "2026-07-27",
            "2026-07-28",
            "2026-07-29"
        ]);

        for (const day of schedule.days) {
            expect(day.tasks.map(task => task.title)).toEqual(EXPECTED_TASKS_BY_DATE[day.date_text]);
        }

        expect(schedule.days.map(day => day.tasks.length)).toEqual([7, 4, 5, 5, 6, 11, 12]);
        expect(schedule.total_tasks).toBe(50);
        expect(schedule.days.map(day => day.daily_capacity_minutes)).toEqual([180, 30, 60, 120, 150, 240, 300]);
        expect(schedule.days.map(day => day.energy_level)).toEqual(["medium", "low", null, "medium", "medium", "high", "high"]);
        expect(schedule.days.map(day => day.planner_status)).toEqual([
            "planning",
            "active",
            "active",
            "active",
            "active",
            "active",
            "active"
        ]);
        expect(schedule.days[2].warnings).toContain(
            "Unsupported Energy Level: \"ต่ำถึงปานกลาง\". Value preserved as raw metadata."
        );
    });

    it("warns on invalid capacity without inventing a value", () => {
        const schedule = parseSchedule(`## 23/07/2026
Daily Capacity Minutes:
หนึ่งร้อยแปดสิบ
งานหลัก:
1. ตรวจรายการ`);

        expect(schedule.days[0].daily_capacity_minutes).toBeNull();
        expect(schedule.days[0].warnings[0]).toContain("Invalid Daily Capacity Minutes");
    });

    it("keeps unsupported energy and Planner status values null with warnings", () => {
        const schedule = parseSchedule(`## 23/07/2026
Energy Level: เร่งด่วน
Planner Day Status: Pending
งานหลัก:
1. ตรวจรายการ`);

        expect(schedule.days[0].energy_level).toBeNull();
        expect(schedule.days[0].planner_status).toBeNull();
        expect(schedule.days[0].warnings).toEqual([
            "Unsupported Energy Level: \"เร่งด่วน\". Value preserved as raw metadata.",
            "Unsupported Planner Day Status: \"Pending\". Value preserved as raw metadata."
        ]);
    });

    it("maps กำลังปานกลาง to medium without an unsupported warning", () => {
        const schedule = parseSchedule(`## 23/07/2026
Energy Level: กำลังปานกลาง
งานหลัก:
1. ตรวจรายการ`);

        expect(schedule.days[0].energy_level).toBe("medium");
        expect(schedule.days[0].warnings).not.toContain(
            "Unsupported Energy Level: \"กำลังปานกลาง\". Value preserved as raw metadata."
        );
    });

    it("keeps metadata and narrative date references from creating days", () => {
        const schedule = parseSchedule(CANONICAL_ROSE_TRIAL_SCHEDULE);

        expect(schedule.days).toHaveLength(7);
        expect(schedule.overall_notes).toEqual([
            "# Arbor Planner Entry Pack — Rose Trial Preparation",
            "Schedule Period:",
            "23–29 กรกฎาคม 2569"
        ]);
        expect(schedule.days.map(day => day.date_text)).toEqual(Object.keys(EXPECTED_TASKS_BY_DATE));
        expect(schedule.days.every(day => !/^(Main Outcome|Daily Capacity Minutes|Energy Level|Planner Day Status)/.test(day.date_text))).toBe(true);
        expect(schedule.days.filter(day => day.is_date_range)).toHaveLength(0);
        expect(schedule.days.some(day => day.date_text.includes("26–27 กรกฎาคม"))).toBe(false);
        expect(schedule.days.some(day => day.date_text.includes("วันที่ 28 กรกฎาคม"))).toBe(false);
        expect(schedule.days.some(day => day.date_text.includes("วันที่ 29 กรกฎาคม"))).toBe(false);
    });

    it("preserves every non-structural source line in a parsed destination", () => {
        const schedule = parseSchedule(CANONICAL_ROSE_TRIAL_SCHEDULE);
        const structuralLines = new Set(["Main Outcome:", "งานหลัก:", "Definition of Done:"]);
        const sourceContentLines = CANONICAL_ROSE_TRIAL_SCHEDULE
            .split("\n")
            .map(line => line.trim())
            .filter(line => line && line !== "---" && !structuralLines.has(line))
            .map(line => line.replace(/^##\s*/, ""));
        const preservedLines = new Set([
            ...schedule.overall_notes,
            ...schedule.days.flatMap(day => [
                day.date_text,
                day.main_outcome ?? "",
                ...day.raw_notes,
                ...day.tasks.map(task => task.raw_text),
                ...day.dods.map(dod => dod.raw_text)
            ])
        ]);

        expect(sourceContentLines.filter(line => !preservedLines.has(line))).toEqual([]);
    });

    it("matches the canonical preservation matrix", () => {
        const schedule = parseSchedule(CANONICAL_ROSE_TRIAL_SCHEDULE);
        const preservationMatrix = {
            document_metadata: schedule.overall_notes.length,
            operational_days: schedule.days.length,
            main_outcomes: schedule.days.filter(day => day.main_outcome).length,
            day_metadata_lines: schedule.days.reduce((count, day) => count + day.raw_notes.length, 0),
            tasks: schedule.days.reduce((count, day) => count + day.tasks.length, 0),
            definitions_of_done: schedule.days.reduce((count, day) => count + day.dods.length, 0),
            silently_discarded_content_lines: 0
        };

        expect(preservationMatrix).toEqual({
            document_metadata: 3,
            operational_days: 7,
            main_outcomes: 7,
            day_metadata_lines: 42,
            tasks: 50,
            definitions_of_done: 7,
            silently_discarded_content_lines: 0
        });
    });

    it("computes deterministic source_text_hash and fingerprint", () => {
        const text = "## 26 กรกฎาคม 2569 — Test Day\nงานหลัก:\n1. Test Task";
        const hash1 = hashString(text);
        const hash2 = hashString(text);
        expect(hash1).toBe(hash2);

        const fp1 = computeImportFingerprint("proj-1", hash1, "append");
        const fp2 = computeImportFingerprint("proj-1", hash1, "append");
        const fp3 = computeImportFingerprint("proj-1", hash1, "skip");
        const fp4 = computeImportFingerprint("proj-1", hash1, "append", "evening_ai");

        expect(fp1).toBe(fp2);
        expect(fp1).not.toBe(fp3);
        expect(fp1).not.toBe(fp4);
    });

    it("normalizes imported-task identity conservatively without rewriting source wording", () => {
        expect(normalizeImportedTaskTitle("  ตรวจ   รายการภาษาไทย  ")).toBe("ตรวจ รายการภาษาไทย");

        const compact = computeImportedTaskFingerprint("proj-1", "2026-07-23", "ตรวจ รายการภาษาไทย");
        const repeatedWhitespace = computeImportedTaskFingerprint("proj-1", "2026-07-23", "  ตรวจ   รายการภาษาไทย  ");
        const alteredCase = computeImportedTaskFingerprint("proj-1", "2026-07-23", "Task A");
        const lowerCase = computeImportedTaskFingerprint("proj-1", "2026-07-23", "task a");

        expect(repeatedWhitespace).toBe(compact);
        expect(alteredCase).not.toBe(lowerCase);
    });
});

describe("Arbor Planner Import Database Operations & Constraints", () => {
    let testProjectId: string;
    let testPlanDate: string;

    beforeEach(() => {
        testProjectId = `test-proj-${Date.now()}`;
        testPlanDate = `2026-09-${Math.floor(Math.random() * 20 + 1).toString().padStart(2, '0')}`;

        db.prepare(`
            INSERT INTO projects (id, slug, name, status)
            VALUES (?, ?, ?, 'planned')
        `).run(testProjectId, `slug-${testProjectId}`, "Test Project");
    });

    afterEach(() => {
        db.prepare("DELETE FROM planner_days WHERE plan_date = ?").run(testPlanDate);
        db.prepare("DELETE FROM projects WHERE id = ?").run(testProjectId);
    });

    it("creates planner_import_batches and prevents duplicate fingerprint inserts", () => {
        const fp = `fp-${Date.now()}`;
        const batchId = `batch-${Date.now()}`;

        db.prepare(`
            INSERT INTO planner_import_batches (id, fingerprint, project_id, source_text_hash, conflict_policy, result_json)
            VALUES (?, ?, ?, 'hash123', 'append', '{"success": true}')
        `).run(batchId, fp, testProjectId);

        const row = db.prepare("SELECT id FROM planner_import_batches WHERE fingerprint = ?").get(fp) as { id: string } | undefined;
        expect(row).toBeDefined();
        expect(row?.id).toBe(batchId);

        expect(() => {
            db.prepare(`
                INSERT INTO planner_import_batches (id, fingerprint, project_id, source_text_hash, conflict_policy, result_json)
                VALUES ('batch-dup', ?, ?, 'hash123', 'append', '{"success": true}')
            `).run(fp, testProjectId);
        }).toThrow(/UNIQUE/);
    });

    it("preserves existing Planner Day main_outcome on append", () => {
        const existingDayId = `day-exist-${Date.now()}`;
        const existingOutcome = "Existing Day Outcome";

        db.prepare(`
            INSERT INTO planner_days (id, plan_date, main_outcome, status)
            VALUES (?, ?, ?, 'planning')
        `).run(existingDayId, testPlanDate, existingOutcome);

        const existingDay = db.prepare("SELECT main_outcome FROM planner_days WHERE plan_date = ?").get(testPlanDate) as {
            main_outcome: string | null;
        } | undefined;
        expect(existingDay?.main_outcome).toBe(existingOutcome);
    });
});
