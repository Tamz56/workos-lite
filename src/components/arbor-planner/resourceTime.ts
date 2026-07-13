const BANGKOK_OFFSET_MINUTES = 7 * 60;
const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function pad(value: number) { return String(value).padStart(2, "0"); }

export function isoToBangkokDateTimeLocal(iso: string | null): string {
    if (!iso) return "";
    const instant = new Date(iso);
    if (Number.isNaN(instant.getTime())) return "";
    const bangkok = new Date(instant.getTime() + BANGKOK_OFFSET_MINUTES * 60_000);
    return `${bangkok.getUTCFullYear()}-${pad(bangkok.getUTCMonth() + 1)}-${pad(bangkok.getUTCDate())}T${pad(bangkok.getUTCHours())}:${pad(bangkok.getUTCMinutes())}`;
}

export function bangkokDateTimeLocalToIso(localValue: string): string | null {
    if (!localValue) return null;
    const match = LOCAL_PATTERN.exec(localValue);
    if (!match) throw new Error("Reset time ต้องอยู่ในรูปแบบวันที่และเวลาไทยที่ถูกต้อง");
    const [, yearText, monthText, dayText, hourText, minuteText] = match;
    const year = Number(yearText); const month = Number(monthText); const day = Number(dayText);
    const hour = Number(hourText); const minute = Number(minuteText);
    const wallTime = new Date(Date.UTC(year, month - 1, day, hour, minute));
    if (wallTime.getUTCFullYear() !== year || wallTime.getUTCMonth() !== month - 1 || wallTime.getUTCDate() !== day || wallTime.getUTCHours() !== hour || wallTime.getUTCMinutes() !== minute) {
        throw new Error("Reset time ไม่ใช่วันที่หรือเวลาที่ถูกต้อง");
    }
    return new Date(wallTime.getTime() - BANGKOK_OFFSET_MINUTES * 60_000).toISOString();
}
