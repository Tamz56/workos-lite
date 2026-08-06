// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — deterministic in-memory fixture generator
// WORKOS-SHEET-GATE-2
// All fixtures are generated during tests (no binary fixtures committed).
// No real project data is used.
// ---------------------------------------------------------------------------

import ExcelJS from "exceljs";
import JSZip from "jszip";
import {
    BACKLOG_HEADERS,
    PROJECT_DOCUMENTATION_HEADERS,
    SAMPLE_EXTERNAL_ROW_ID,
    WORKOS_FIELD_SHEET_SCHEMA_VERSION,
} from "@/lib/project-import/constants";

function utcDate(year: number, month: number, day: number): Date {
    return new Date(Date.UTC(year, month - 1, day));
}

async function toBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

function setRowValues(worksheet: ExcelJS.Worksheet, rowNumber: number, values: unknown[]) {
    values.forEach((value, index) => {
        worksheet.getCell(rowNumber, index + 1).value = value === "" ? undefined : value;
    });
}

function clearRow(worksheet: ExcelJS.Worksheet, rowNumber: number, columnCount: number) {
    for (let column = 1; column <= columnCount; column++) {
        worksheet.getCell(rowNumber, column).value = undefined;
    }
}

function buildBaseWorkbook(): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();

    const metadata = workbook.addWorksheet("00_Metadata");
    metadata.getCell("A1").value = "00_Metadata — WorkOS Project Field Sheet v1";
    metadata.getCell("A3").value = "Workbook Metadata";
    metadata.getCell("A4").value = "Key";
    metadata.getCell("B4").value = "Value";
    metadata.getCell("C4").value = "คำอธิบาย";
    const metadataRows: Array<[string, string]> = [
        ["schema_version", WORKOS_FIELD_SHEET_SCHEMA_VERSION],
        ["workbook_id", "WB-TEST-001"],
        ["batch_reference", "TEST-BATCH"],
        ["source_system", "manual"],
        ["export_timestamp", "2026-08-05T09:00:00+07:00"],
        ["timezone", "Asia/Bangkok"],
        ["prepared_by", "Arbor QA"],
        ["notes", "Fixture workbook for Gate 2 parser tests"],
    ];
    metadataRows.forEach(([key, value], index) => {
        metadata.getCell(5 + index, 1).value = key;
        metadata.getCell(5 + index, 2).value = value;
    });

    const documentation = workbook.addWorksheet("01_Project_Documentation");
    documentation.getCell("A1").value = "01_Project_Documentation";
    documentation.getCell("A2").value = "Thai instructions";
    documentation.getCell("A3").value = "Warning — sample row must be removed";
    PROJECT_DOCUMENTATION_HEADERS.forEach((header, index) => {
        documentation.getCell(5, index + 1).value = header;
    });
    PROJECT_DOCUMENTATION_HEADERS.forEach((header, index) => {
        documentation.getCell(6, index + 1).value = `desc ${header}`;
    });
    setRowValues(documentation, 7, [
        "TEST-DOC-001",
        "example-project-slug",
        "process_note",
        "Fixture doc one",
        utcDate(2026, 1, 5),
        "Summary one",
        "Details line 1\nDetails line 2",
        "https://a.example\nhttps://b.example",
        "file-a.txt",
        "Next step",
        "active",
        1,
        "manual_paste",
        true,
    ]);
    setRowValues(documentation, 8, [
        "TEST-DOC-002",
        "example-project-slug",
        "milestone",
        "Fixture doc two",
        "2026-02-10",
        "Summary two",
        "Details two",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        false,
    ]);

    const backlog = workbook.addWorksheet("02_Backlog");
    backlog.getCell("A1").value = "02_Backlog";
    backlog.getCell("A2").value = "Thai instructions";
    backlog.getCell("A3").value = "Warning — sample row must be removed";
    BACKLOG_HEADERS.forEach((header, index) => {
        backlog.getCell(5, index + 1).value = header;
    });
    BACKLOG_HEADERS.forEach((header, index) => {
        backlog.getCell(6, index + 1).value = `desc ${header}`;
    });
    setRowValues(backlog, 7, [
        "TEST-BACKLOG-001",
        "example-project-slug",
        "Backlog item one",
        "planned",
        2,
        "morning",
        utcDate(2026, 3, 1),
        utcDate(2026, 3, 15),
        false,
        "Dev",
        "DoD text",
        "Note text",
    ]);
    setRowValues(backlog, 8, [
        "TEST-BACKLOG-002",
        "example-project-slug",
        "Backlog item two",
        "done",
        undefined,
        "none",
        undefined,
        undefined,
        true,
        undefined,
        undefined,
        undefined,
    ]);

    return workbook;
}

function documentationSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
    return workbook.getWorksheet("01_Project_Documentation");
}

function backlogSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
    return workbook.getWorksheet("02_Backlog");
}

async function modifyZip(buffer: Buffer, mutate: (zip: JSZip) => void | Promise<void>): Promise<Buffer> {
    const zip = await JSZip.loadAsync(buffer);
    await mutate(zip);
    return Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
}

async function sheetPathForName(buffer: Buffer, sheetName: string): Promise<string> {
    const zip = await JSZip.loadAsync(buffer);
    const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
    const relsXml = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");
    if (!workbookXml || !relsXml) throw new Error("Workbook xml/rels not found");

    const sheetMatch = new RegExp(`<sheet[^>]*name="${sheetName}"[^>]*r:id="([^"]+)"`).exec(workbookXml);
    if (!sheetMatch) throw new Error(`Sheet ${sheetName} not found in workbook.xml`);
    const rid = sheetMatch[1];
    const relMatch = new RegExp(`<Relationship[^>]*Id="${rid}"[^>]*Target="([^"]+)"`).exec(relsXml);
    if (!relMatch) throw new Error(`Relationship ${rid} not found`);
    const target = relMatch[1];
    return target.startsWith("/") ? `xl${target}` : `xl/${target}`;
}

async function injectRowHidden(buffer: Buffer, sheetName: string, rowNumber: number): Promise<Buffer> {
    return modifyZip(buffer, async (zip) => {
        const sheetPath = await sheetPathForName(buffer, sheetName);
        const xml = await zip.file(sheetPath)?.async("string");
        if (!xml) throw new Error(`Sheet xml not found: ${sheetPath}`);
        const updated = xml.replace(new RegExp(`(<row[^>]*r="${rowNumber}"[^>]*>)`), (match) =>
            match.includes('hidden="1"') ? match : match.replace(">", ' hidden="1">'),
        );
        zip.file(sheetPath, updated);
    });
}

export async function validWorkbook(): Promise<Buffer> {
    return toBuffer(buildBaseWorkbook());
}

export async function workbookWithSchemaVersion(version: string): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    workbook.getWorksheet("00_Metadata").getCell(5, 2).value = version;
    return toBuffer(workbook);
}

export async function workbookMissingSheet(sheetName: string): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    workbook.removeWorksheet(sheetName);
    return toBuffer(workbook);
}

export async function workbookWithUnknownSheet(): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    workbook.addWorksheet("99_Extra");
    return toBuffer(workbook);
}

export async function workbookWithHiddenSheet(): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    backlogSheet(workbook).state = "hidden";
    return toBuffer(workbook);
}

export async function workbookWithMergedCellInDataRange(): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    documentationSheet(workbook).mergeCells("A10:B10");
    return toBuffer(workbook);
}

export async function workbookWithFormulaInDataRow(): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    documentationSheet(workbook).getCell("F8").value = { formula: '"x"', result: "Summary from formula" };
    return toBuffer(workbook);
}

export async function workbookWithDuplicateHeader(): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    documentationSheet(workbook).getCell(5, 14).value = "status";
    return toBuffer(workbook);
}

export async function workbookWithUnknownHeader(): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    documentationSheet(workbook).getCell(5, 15).value = "unknown_col";
    return toBuffer(workbook);
}

export async function workbookWithSampleRow(): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    setRowValues(documentationSheet(workbook), 9, [
        SAMPLE_EXTERNAL_ROW_ID,
        "example-project-slug",
        "process_note",
        "Sample row",
        utcDate(2026, 1, 1),
        "s",
        "d",
        undefined,
        undefined,
        undefined,
        "active",
        0,
        "manual_paste",
        false,
    ]);
    return toBuffer(workbook);
}

export async function workbookWithInvalidEnum(): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    documentationSheet(workbook).getCell(7, 3).value = "bogus";
    return toBuffer(workbook);
}

export async function workbookWithInvalidDate(): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    documentationSheet(workbook).getCell(7, 5).value = "2026-13-45";
    return toBuffer(workbook);
}

export async function workbookWithAmbiguousDate(): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    documentationSheet(workbook).getCell(7, 5).value = "05/01/2026";
    return toBuffer(workbook);
}

export async function workbookWithInvalidBoolean(): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    documentationSheet(workbook).getCell(7, 14).value = "ใช่";
    return toBuffer(workbook);
}

export async function workbookWithDuplicateExternalRowId(): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    documentationSheet(workbook).getCell(8, 1).value = "TEST-DOC-001";
    return toBuffer(workbook);
}

export async function workbookWithNegativeOrderIndex(): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    documentationSheet(workbook).getCell(7, 12).value = -1;
    return toBuffer(workbook);
}

export async function workbookWithNonIntegerOrderIndex(): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    documentationSheet(workbook).getCell(7, 12).value = "2.5";
    return toBuffer(workbook);
}

export async function workbookWithMissingExternalRowId(): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    documentationSheet(workbook).getCell(7, 1).value = undefined;
    return toBuffer(workbook);
}

export async function workbookWithMissingProjectSlug(): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    documentationSheet(workbook).getCell(7, 2).value = undefined;
    return toBuffer(workbook);
}

export async function workbookWithBlankRow(): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    const sheet = documentationSheet(workbook);
    clearRow(sheet, 8, PROJECT_DOCUMENTATION_HEADERS.length);
    setRowValues(sheet, 9, [
        "TEST-DOC-003",
        "example-project-slug",
        "process_note",
        "Fixture doc three",
        "2026-03-01",
        "Summary three",
        "Details three",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        false,
    ]);
    return toBuffer(workbook);
}

export async function workbookWithWhitespaceRows(): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    const docSheet = documentationSheet(workbook);
    const backlog = backlogSheet(workbook);
    for (let row = 9; row <= 500; row++) {
        for (let col = 1; col <= PROJECT_DOCUMENTATION_HEADERS.length; col++) {
            docSheet.getCell(row, col).value = " ";
        }
        for (let col = 1; col <= BACKLOG_HEADERS.length; col++) {
            backlog.getCell(row, col).value = " ";
        }
    }
    return toBuffer(workbook);
}

export async function workbookWithStartDateAfterEndDate(): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    backlogSheet(workbook).getCell(7, 7).value = "2026-04-01";
    backlogSheet(workbook).getCell(7, 8).value = "2026-03-01";
    return toBuffer(workbook);
}

export async function workbookWithOversizedDetails(): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    documentationSheet(workbook).getCell(7, 7).value = "x".repeat(200 * 1024 + 1);
    return toBuffer(workbook);
}

export async function workbookWithOverRowLimit(limit: number): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    const sheet = documentationSheet(workbook);
    for (let index = 0; index < limit + 2; index++) {
        setRowValues(sheet, 9 + index, [
            `TEST-DOC-EXTRA-${index}`,
            "example-project-slug",
            "process_note",
            `Extra fixture row ${index}`,
            "2026-05-01",
            "Summary",
            "Details",
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            false,
        ]);
    }
    return toBuffer(workbook);
}

export async function workbookWithMetadataPlaceholder(): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    workbook.getWorksheet("00_Metadata").getCell(6, 2).value = "<กรอก ID ที่คงที่และไม่ซ้ำ>";
    return toBuffer(workbook);
}

export async function workbookWithMissingRequiredMetadata(): Promise<Buffer> {
    const workbook = buildBaseWorkbook();
    workbook.getWorksheet("00_Metadata").getCell(6, 2).value = undefined;
    return toBuffer(workbook);
}

export async function workbookWithHiddenDataRow(): Promise<Buffer> {
    const buffer = await toBuffer(buildBaseWorkbook());
    return injectRowHidden(buffer, "01_Project_Documentation", 8);
}

export async function workbookWithExternalLink(): Promise<Buffer> {
    const buffer = await toBuffer(buildBaseWorkbook());
    return modifyZip(buffer, (zip) => {
        zip.file(
            "xl/externalLinks/externalLink1.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><externalLink xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><externalBook><sheetNames><sheetName val="X"/></sheetNames></externalBook></externalLink>',
        );
    });
}

export async function workbookWithMacro(): Promise<Buffer> {
    const buffer = await toBuffer(buildBaseWorkbook());
    return modifyZip(buffer, (zip) => {
        zip.file("xl/vbaProject.bin", Buffer.alloc(8, 1));
    });
}

export async function unsupportedFileBytes(): Promise<Buffer> {
    return Buffer.from("this is not a zip file at all", "utf8");
}

export async function oversizedFileBytes(): Promise<Buffer> {
    const buffer = Buffer.alloc(26 * 1024 * 1024);
    buffer[0] = 0x50;
    buffer[1] = 0x4b;
    buffer[2] = 0x03;
    buffer[3] = 0x04;
    return buffer;
}

export async function setDocCell(buffer: Buffer, rowNumber: number, columnIndex: number, value: unknown): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    workbook.getWorksheet("01_Project_Documentation").getCell(rowNumber, columnIndex).value = value === undefined ? undefined : value;
    return toBuffer(workbook);
}

export async function setBacklogCell(buffer: Buffer, rowNumber: number, columnIndex: number, value: unknown): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    workbook.getWorksheet("02_Backlog").getCell(rowNumber, columnIndex).value = value === undefined ? undefined : value;
    return toBuffer(workbook);
}
