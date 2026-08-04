const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function calculateTimeRangeMinutes(startTime: string, endTime: string): number | null {
    const start = TIME_PATTERN.exec(startTime);
    const end = TIME_PATTERN.exec(endTime);
    if (!start || !end) return null;

    const startMinutes = Number(start[1]) * 60 + Number(start[2]);
    const endMinutes = Number(end[1]) * 60 + Number(end[2]);
    if (endMinutes <= startMinutes) return null;
    return endMinutes - startMinutes;
}

export function getTimeRangeError(startTime: string | null | undefined, endTime: string | null | undefined): string | null {
    const hasStart = startTime != null && startTime !== "";
    const hasEnd = endTime != null && endTime !== "";
    if (hasStart !== hasEnd) return "Start time and end time must be provided together.";
    if (!hasStart) return null;
    if (!TIME_PATTERN.test(startTime!) || !TIME_PATTERN.test(endTime!)) return "Start time and end time must use valid HH:MM 24-hour format.";
    if (calculateTimeRangeMinutes(startTime!, endTime!) == null) return "End time must be later than start time. Overnight ranges are not supported.";
    return null;
}

export function formatPlannerItemTime(startTime: string | null, endTime: string | null, estimatedMinutes: number | null) {
    if (startTime && endTime) return `${startTime}–${endTime} · ${estimatedMinutes ?? calculateTimeRangeMinutes(startTime, endTime)} นาที`;
    return estimatedMinutes == null ? "ไม่ระบุเวลา" : `${estimatedMinutes} นาที`;
}
