import crypto from "crypto";
import {
    ParsedSchedule,
    ParsedScheduleDay
} from "./types";
import type { PlannerDayEnergyLevel, PlannerDayStatus } from "@/lib/planner/types";

export const INVALID_CAPACITY_WARNING_PREFIX = "Invalid Daily Capacity Minutes";

const THAI_MONTH_MAP: Record<string, string> = {
    "มกราคม": "01", "ม.ค.": "01", "ม.ค": "01",
    "กุมภาพันธ์": "02", "ก.พ.": "02", "ก.พ": "02",
    "มีนาคม": "03", "มี.ค.": "03", "มี.ค": "03",
    "เมษายน": "04", "เม.ย.": "04", "เม.ย": "04",
    "พฤษภาคม": "05", "พ.ค.": "05", "พ.ค": "05",
    "มิถุนายน": "06", "มิ.ย.": "06", "มิ.ย": "06",
    "กรกฎาคม": "07", "ก.ค.": "07", "ก.ค": "07",
    "สิงหาคม": "08", "ส.ค.": "08", "ส.ค": "08",
    "กันยายน": "09", "ก.ย.": "09", "ก.ย": "09",
    "ตุลาคม": "10", "ต.ค.": "10", "ต.ค": "10",
    "พฤศจิกายน": "11", "พ.ย.": "11", "พ.ย": "11",
    "ธันวาคม": "12", "ธ.ค.": "12", "ธ.ค": "12",
    "january": "01", "jan": "01",
    "february": "02", "feb": "02",
    "march": "03", "mar": "03",
    "april": "04", "apr": "04",
    "may": "05",
    "june": "06", "jun": "06",
    "july": "07", "jul": "07",
    "august": "08", "aug": "08",
    "september": "09", "sep": "09", "sept": "09",
    "october": "10", "oct": "10",
    "november": "11", "nov": "11",
    "december": "12", "dec": "12"
};

export function hashString(text: string): string {
    return crypto.createHash("sha256").update(text.trim()).digest("hex");
}

export function computeImportFingerprint(
    projectId: string,
    sourceTextHash: string,
    conflictPolicy: string,
    scheduledBlock = "morning_focus"
): string {
    return crypto
        .createHash("sha256")
        .update(`${projectId}:${sourceTextHash}:${conflictPolicy}:${scheduledBlock}`)
        .digest("hex");
}

const IMPORTED_TASK_NAMESPACE = "arbor-planner-import:v1";

export function normalizeImportedTaskTitle(title: string): string {
    return title.trim().replace(/\s+/g, " ");
}

export function computeImportedTaskFingerprint(projectId: string, planDate: string, taskTitle: string): string {
    const normalizedTitle = normalizeImportedTaskTitle(taskTitle);
    return crypto
        .createHash("sha256")
        .update(`${IMPORTED_TASK_NAMESPACE}:${projectId}:${planDate}:${normalizedTitle}`)
        .digest("hex");
}

function parseYear(yearStr: string): number {
    let year = parseInt(yearStr, 10);
    if (isNaN(year)) return new Date().getFullYear();
    if (year >= 2400) {
        year -= 543;
    } else if (year < 100) {
        year += 2000;
    }
    return year;
}

function formatIsoDate(year: number, monthStr: string, day: number): string {
    const mm = monthStr.padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
}

export function parseThaiDateString(raw: string): {
    parsed_date: string | null;
    date_range: { start_date: string; end_date: string; raw_range_text: string } | null;
    is_date_range: boolean;
    warning: string | null;
} {
    const text = raw.trim();

    // Explicit day-first numeric format: DD/MM/YYYY
    const dayFirstNumericMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (dayFirstNumericMatch) {
        const day = parseInt(dayFirstNumericMatch[1], 10);
        const month = parseInt(dayFirstNumericMatch[2], 10);
        const year = parseYear(dayFirstNumericMatch[3]);

        if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
            return {
                parsed_date: formatIsoDate(year, String(month), day),
                date_range: null,
                is_date_range: false,
                warning: null
            };
        }
    }

    // ISO format: YYYY-MM-DD
    const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (isoMatch) {
        return {
            parsed_date: `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`,
            date_range: null,
            is_date_range: false,
            warning: null
        };
    }

    const monthPattern = Object.keys(THAI_MONTH_MAP).join("|");

    // Date range pattern: e.g. 26–27 กรกฎาคม 2569 or 26 - 27 ก.ค. 2569
    const rangeRegex = new RegExp(
        `(\\d{1,2})\\s*[-–—~ถึง]+\\s*(\\d{1,2})\\s*(${monthPattern})\\s*(\\d{2,4})?`,
        "i"
    );
    const rangeMatch = text.match(rangeRegex);
    if (rangeMatch) {
        const startDay = parseInt(rangeMatch[1], 10);
        const endDay = parseInt(rangeMatch[2], 10);
        const monthKey = rangeMatch[3].toLowerCase();
        const monthNum = THAI_MONTH_MAP[monthKey] || THAI_MONTH_MAP[rangeMatch[3]] || "01";
        const year = rangeMatch[4] ? parseYear(rangeMatch[4]) : new Date().getFullYear();

        const startDate = formatIsoDate(year, monthNum, startDay);
        const endDate = formatIsoDate(year, monthNum, endDay);

        return {
            parsed_date: startDate,
            date_range: {
                start_date: startDate,
                end_date: endDate,
                raw_range_text: rangeMatch[0]
            },
            is_date_range: true,
            warning: `Date range detected: ${rangeMatch[0]} (${startDate} to ${endDate}). Requires explicit date selection before import.`
        };
    }

    // Single date pattern: e.g. 26 กรกฎาคม 2569 or 26 ก.ค. 2569
    const singleRegex = new RegExp(
        `(\\d{1,2})\\s*(${monthPattern})\\s*(\\d{2,4})?`,
        "i"
    );
    const singleMatch = text.match(singleRegex);
    if (singleMatch) {
        const day = parseInt(singleMatch[1], 10);
        const monthKey = singleMatch[2].toLowerCase();
        const monthNum = THAI_MONTH_MAP[monthKey] || THAI_MONTH_MAP[singleMatch[2]] || "01";
        const year = singleMatch[3] ? parseYear(singleMatch[3]) : new Date().getFullYear();

        return {
            parsed_date: formatIsoDate(year, monthNum, day),
            date_range: null,
            is_date_range: false,
            warning: null
        };
    }

    return {
        parsed_date: null,
        date_range: null,
        is_date_range: false,
        warning: `Could not parse explicit date from "${text}".`
    };
}

function isMetadataHeader(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed) return false;
    return /^(schedule period|ระยะเวลาดำเนินงาน|primary objective|เป้าหมายหลัก|system development priority|updated milestones|current operational status|project|topic|status|milestone):/i.test(trimmed);
}

function isDayHeaderLine(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed) return false;

    // Must NOT be a bullet or numbered list item
    if (/^[-*•]\s/.test(trimmed) || /^\d+[\.\)]\s/.test(trimmed)) {
        return false;
    }

    // Must NOT be a schedule metadata key line
    if (isMetadataHeader(trimmed)) {
        return false;
    }

    // Stripped of leading markdown header hashes
    const clean = trimmed.replace(/^#+\s*/, "").trim();

    // A day must be a strict date-only heading or use an explicit heading separator.
    // Prose such as "วันที่ 29 กรกฎาคม เป็นวันเป้าหมาย..." must not create a day.
    const dateParse = parseThaiDateString(clean);
    if (!dateParse.parsed_date && !dateParse.is_date_range) {
        return false;
    }

    const monthPattern = Object.keys(THAI_MONTH_MAP).join("|");
    const dateExpression = `(?:\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\/\\d{1,2}\\/\\d{4}|(?:\\d{1,2}\\s*[-–—~ถึง]+\\s*\\d{1,2}|\\d{1,2})\\s*(?:${monthPattern})\\s*\\d{2,4})`;
    const strictHeadingRegex = new RegExp(
        `^(?:วันที่\\s*)?${dateExpression}(?:\\s*(?:—|–|-|:)\\s*\\S.*)?$`,
        "i"
    );
    return strictHeadingRegex.test(clean);
}

type DayMetadataKey = "daily_capacity_minutes" | "energy_level" | "planner_status";

function parseEnergyLevel(value: string): PlannerDayEnergyLevel | null {
    const normalized = value.trim().toLowerCase();
    const values: Record<string, PlannerDayEnergyLevel> = {
        high: "high",
        medium: "medium",
        low: "low",
        recovery: "recovery",
        สูง: "high",
        ปานกลาง: "medium",
        กำลังปานกลาง: "medium",
        ต่ำ: "low",
        ฟื้นตัว: "recovery"
    };
    return values[normalized] ?? null;
}

function parsePlannerStatus(value: string): PlannerDayStatus | null {
    const normalized = value.trim().toLowerCase();
    const values: Record<string, PlannerDayStatus> = {
        planning: "planning",
        active: "active",
        completed: "completed",
        วางแผน: "planning",
        กำลังดำเนินการ: "active",
        เสร็จสิ้น: "completed"
    };
    return values[normalized] ?? null;
}

function applyDayMetadata(day: ParsedScheduleDay, key: DayMetadataKey, value: string) {
    if (key === "daily_capacity_minutes") {
        if (!/^\d+$/.test(value.trim())) {
            day.daily_capacity_minutes = null;
            day.warnings.push(`${INVALID_CAPACITY_WARNING_PREFIX}: "${value}".`);
            return;
        }

        const capacity = Number(value.trim());
        if (!Number.isSafeInteger(capacity)) {
            day.daily_capacity_minutes = null;
            day.warnings.push(`${INVALID_CAPACITY_WARNING_PREFIX}: "${value}".`);
            return;
        }

        day.daily_capacity_minutes = capacity;
        return;
    }

    if (key === "energy_level") {
        day.energy_level = parseEnergyLevel(value);
        if (!day.energy_level) {
            day.warnings.push(`Unsupported Energy Level: "${value}". Value preserved as raw metadata.`);
        }
        return;
    }

    day.planner_status = parsePlannerStatus(value);
    if (!day.planner_status) {
        day.warnings.push(`Unsupported Planner Day Status: "${value}". Value preserved as raw metadata.`);
    }
}

function isInvalidTaskTitle(title: string): boolean {
    const t = title.trim();
    if (!t) return true;
    if (/^[-*_]{2,}$/.test(t)) return true; // --, ---, ***
    if (/^#+$/.test(t)) return true;
    if (isMetadataHeader(t)) return true;
    return false;
}

export function parseSchedule(rawText: string): ParsedSchedule {
    const lines = rawText.split("\n");
    const days: ParsedScheduleDay[] = [];
    const overallNotes: string[] = [];
    const globalWarnings: string[] = [];

    const sourceTextHash = hashString(rawText);

    let currentDay: ParsedScheduleDay | null = null;
    let currentSection:
        | "main_outcome"
        | "tasks_main"
        | "tasks_capable"
        | "tasks_sys"
        | "dod"
        | "decision_point"
        | "do_not_do"
        | "risks"
        | "day_metadata"
        | "schedule_metadata"
        | "unknown" = "unknown";

    const finalizeDay = (day: ParsedScheduleDay | null) => {
        if (day) {
            days.push(day);
        }
    };

    let taskOrder = 1;
    let pendingDayMetadata: DayMetadataKey | null = null;
    let pendingSchedulePeriodRange = false;

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const trimmed = rawLine.trim();

        if (!trimmed) continue;

        // Check if line is a Separator
        if (/^[-*_]{2,}$/.test(trimmed)) continue;

        if (!currentDay && pendingSchedulePeriodRange) {
            pendingSchedulePeriodRange = false;
            const schedulePeriod = parseThaiDateString(trimmed);
            if (schedulePeriod.is_date_range) {
                overallNotes.push(trimmed);
                continue;
            }
        }

        // Check Schedule-level metadata headers
        if (isMetadataHeader(trimmed)) {
            if (!currentDay) {
                overallNotes.push(trimmed);
                pendingSchedulePeriodRange = /^(schedule period|ระยะเวลาดำเนินงาน):\s*$/i.test(trimmed);
                currentSection = "schedule_metadata";
                continue;
            }
        }

        if (isDayHeaderLine(trimmed)) {
            finalizeDay(currentDay);
            const cleanHeader = trimmed.replace(/^#+\s*/, "").trim();
            const dateParse = parseThaiDateString(cleanHeader);
            const warnings: string[] = [];
            if (dateParse.warning) {
                warnings.push(dateParse.warning);
            }

            currentDay = {
                id: `day-${days.length + 1}`,
                raw_text: rawLine,
                date_text: cleanHeader,
                parsed_date: dateParse.parsed_date,
                date_range: dateParse.date_range,
                is_date_range: dateParse.is_date_range,
                objective: null,
                main_outcome: null,
                daily_capacity_minutes: null,
                energy_level: null,
                planner_status: null,
                tasks: [],
                dods: [],
                decision_points: [],
                do_not_dos: [],
                risks: [],
                raw_notes: [],
                warnings
            };
            currentSection = "unknown";
            taskOrder = 1;
            pendingDayMetadata = null;
            continue;
        }

        if (!currentDay) {
            overallNotes.push(trimmed);
            continue;
        }

        // Section header matching
        if (/^(เป้าหมาย|main outcome|objective):?/i.test(trimmed)) {
            currentSection = "main_outcome";
            const content = trimmed.replace(/^(เป้าหมาย|main outcome|objective):?/i, "").trim();
            if (content) {
                currentDay.main_outcome = content;
                currentDay.objective = content;
            }
            continue;
        }

        const dayMetadataMatch = trimmed.match(/^(daily capacity minutes|energy level|planner day status):\s*(.*)$/i);
        if (dayMetadataMatch) {
            currentSection = "day_metadata";
            currentDay.raw_notes.push(trimmed);
            pendingDayMetadata =
                dayMetadataMatch[1].toLowerCase() === "daily capacity minutes" ? "daily_capacity_minutes" :
                dayMetadataMatch[1].toLowerCase() === "energy level" ? "energy_level" :
                "planner_status";
            if (dayMetadataMatch[2]) {
                applyDayMetadata(currentDay, pendingDayMetadata, dayMetadataMatch[2]);
                pendingDayMetadata = null;
            }
            continue;
        }

        if (/^(งานหลัก|main tasks):?/i.test(trimmed)) {
            currentSection = "tasks_main";
            continue;
        }

        if (/^(งานที่ทำได้|work items|capable tasks):?/i.test(trimmed)) {
            currentSection = "tasks_capable";
            continue;
        }

        if (/^(recommended system work|system work):?/i.test(trimmed)) {
            currentSection = "tasks_sys";
            continue;
        }

        if (/^(definition of done|dod):?/i.test(trimmed)) {
            currentSection = "dod";
            continue;
        }

        if (/^(decision point|readiness gate|gate result|decision rule):?/i.test(trimmed)) {
            currentSection = "decision_point";
            const content = trimmed.replace(/^(decision point|readiness gate|gate result|decision rule):?/i, "").trim();
            if (content) {
                currentDay.decision_points.push({
                    raw_text: trimmed,
                    gate_type: trimmed.toLowerCase().includes("readiness") ? "readiness_gate" : "decision_point",
                    rule: content
                });
            }
            continue;
        }

        if (/^(ไม่ควรทำ|do not do|guardrails):?/i.test(trimmed)) {
            currentSection = "do_not_do";
            continue;
        }

        if (/^(risks|ความเสี่ยง):?/i.test(trimmed)) {
            currentSection = "risks";
            continue;
        }

        // Process line under current section
        const bulletMatch = trimmed.match(/^[-*•]\s*(.+)/);
        const numberMatch = trimmed.match(/^(\d+)[\.\)]\s*(.+)/);
        const isList = !!(bulletMatch || numberMatch);
        const textContent = bulletMatch ? bulletMatch[1].trim() : numberMatch ? numberMatch[2].trim() : trimmed;

        if (isInvalidTaskTitle(textContent)) continue;

        switch (currentSection) {
            case "main_outcome":
                if (!currentDay.main_outcome) {
                    currentDay.main_outcome = textContent;
                    currentDay.objective = textContent;
                } else {
                    currentDay.main_outcome += ` ${textContent}`;
                }
                break;

            case "tasks_main":
            case "tasks_capable":
            case "tasks_sys":
            case "unknown":
                if (isList || currentSection !== "unknown") {
                    const category =
                        currentSection === "tasks_main" ? "งานหลัก" :
                        currentSection === "tasks_capable" ? "งานที่ทำได้" :
                        currentSection === "tasks_sys" ? "Recommended System Work" : "general";

                    currentDay.tasks.push({
                        id: `task-${currentDay.tasks.length + 1}`,
                        raw_text: trimmed,
                        title: textContent,
                        order: taskOrder++,
                        is_bullet: !!bulletMatch,
                        category
                    });
                } else {
                    currentDay.raw_notes.push(trimmed);
                }
                break;

            case "dod":
                currentDay.dods.push({
                    raw_text: trimmed,
                    criteria: [textContent]
                });
                break;

            case "decision_point":
                currentDay.decision_points.push({
                    raw_text: trimmed,
                    rule: textContent
                });
                break;

            case "do_not_do":
                currentDay.do_not_dos.push(textContent);
                break;

            case "risks":
                currentDay.risks.push({
                    raw_text: textContent
                });
                break;

            case "day_metadata":
                currentDay.raw_notes.push(trimmed);
                if (pendingDayMetadata) {
                    applyDayMetadata(currentDay, pendingDayMetadata, trimmed);
                    pendingDayMetadata = null;
                }
                break;
        }
    }

    finalizeDay(currentDay);

    let totalTasks = 0;
    for (const day of days) {
        totalTasks += day.tasks.length;
        if (day.warnings.length > 0) {
            globalWarnings.push(...day.warnings);
        }
    }

    return {
        days,
        raw_text: rawText,
        overall_notes: overallNotes,
        total_days: days.length,
        total_tasks: totalTasks,
        warnings: globalWarnings,
        source_text_hash: sourceTextHash
    };
}
