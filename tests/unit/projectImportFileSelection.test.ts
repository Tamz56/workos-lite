import { describe, expect, it, vi } from "vitest";
import {
    createFileSelectionHandlers,
} from "@/components/project-import/WorkbookUploadPanel";
import { readEffectivePassword } from "@/components/project-import/ProjectImportWorkspace";
import {
    validateUploadFile,
} from "@/lib/project-import/client/projectImportApiClient";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function fileList(files: File[]): FileList {
    // Node's test environment has no DataTransfer; the handlers only access
    // the FileList by index/length, so a minimal list is sufficient.
    return {
        0: files[0],
        1: files[1],
        length: files.length,
        item: (index: number) => files[index] ?? null,
    } as unknown as FileList;
}

function xlsxFile(name = "workos-project-import-browser-qa-02-filled.xlsx", type = XLSX_MIME, size = 40960): File {
    return new File([new Uint8Array(size)], name, { type });
}

function syntheticEvent(files: File[] | null) {
    return {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: { files: files ? fileList(files) : null },
    };
}

describe("Workbook file selection interaction", () => {
    it("accepts a valid xlsx via the change path and stores the file", () => {
        const onChange = vi.fn();
        const onError = vi.fn();
        const handlers = createFileSelectionHandlers({ onChange, onError }, false);
        const file = xlsxFile();
        const result = handlers.handleInputChange({ target: { files: fileList([file]), value: "C:\\fakepath\\file.xlsx" } });
        expect(result).toBe(file);
        expect(onChange).toHaveBeenCalledWith(file);
        expect(onError).not.toHaveBeenCalled();
    });

    it("accepts a dropped file and reports its filename and size", () => {
        const onChange = vi.fn();
        const onError = vi.fn();
        const handlers = createFileSelectionHandlers({ onChange, onError }, false);
        const file = xlsxFile();
        const event = syntheticEvent([file]);
        const result = handlers.handleDrop(event);
        expect(result).toBe(file);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.stopPropagation).toHaveBeenCalled();
        expect(onChange).toHaveBeenCalledWith(file);
        expect(file.name).toBe("workos-project-import-browser-qa-02-filled.xlsx");
        expect(file.size).toBe(40960);
    });

    it("dragOver calls preventDefault and stopPropagation", () => {
        const handlers = createFileSelectionHandlers({ onChange: vi.fn(), onError: vi.fn() }, false);
        const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
        handlers.handleDragOver(event);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.stopPropagation).toHaveBeenCalled();
    });

    it("rejects an invalid file and shows a safe error without storing it", () => {
        const onChange = vi.fn();
        const onError = vi.fn();
        const handlers = createFileSelectionHandlers({ onChange, onError }, false);
        const bad = new File([""], "file.xls", { type: "application/vnd.ms-excel" });
        handlers.handleDrop(syntheticEvent([bad]));
        expect(onChange).toHaveBeenCalledWith(null);
        expect(onError).toHaveBeenCalledWith(expect.stringContaining(".xlsx"));
    });

    it("rejects multiple files by taking only the first", () => {
        const onChange = vi.fn();
        const handlers = createFileSelectionHandlers({ onChange, onError: vi.fn() }, false);
        const first = xlsxFile("one.xlsx");
        const second = xlsxFile("two.xlsx");
        const result = handlers.handleDrop(syntheticEvent([first, second]));
        expect(result).toBe(first);
        expect(onChange).toHaveBeenCalledWith(first);
    });

    it("clears the file when no file is supplied", () => {
        const onChange = vi.fn();
        const onError = vi.fn();
        const handlers = createFileSelectionHandlers({ onChange, onError }, false);
        handlers.handleDrop(syntheticEvent(null));
        expect(onChange).toHaveBeenCalledWith(null);
        expect(onError).toHaveBeenCalledWith("กรุณาเลือกไฟล์ .xlsx");
    });

    it("reports a safe error when disabled (no password) instead of silently ignoring", () => {
        const onChange = vi.fn();
        const onError = vi.fn();
        const handlers = createFileSelectionHandlers({ onChange, onError }, true);
        const event = syntheticEvent([xlsxFile()]);
        const result = handlers.handleDrop(event);
        expect(result).toBeNull();
        expect(onChange).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledWith("กรุณากรอก Agent Password ก่อนเลือกไฟล์");
    });

    it("resets the input value after capture so the same file can be selected again", () => {
        const onChange = vi.fn();
        const handlers = createFileSelectionHandlers({ onChange, onError: vi.fn() }, false);
        const file = xlsxFile();
        const target = { files: fileList([file]), value: "" };
        handlers.handleInputChange({ target });
        expect(target.value).toBe("");
        expect(onChange).toHaveBeenCalledWith(file);
        // A second identical selection must still reach the handler.
        const target2 = { files: fileList([xlsxFile()]), value: "" };
        handlers.handleInputChange({ target: target2 });
        expect(onChange).toHaveBeenCalledTimes(2);
    });
});

describe("Workbook file validation", () => {
    it("accepts .xlsx with the standard MIME type", () => {
        expect(validateUploadFile(xlsxFile())).toBeNull();
    });

    it("accepts .xlsx with an empty MIME type (macOS/browser variation)", () => {
        expect(validateUploadFile(xlsxFile("file.xlsx", ""))).toBeNull();
    });

    it("accepts an uppercase .XLSX filename", () => {
        expect(validateUploadFile(xlsxFile("FILE.XLSX", ""))).toBeNull();
    });

    it("rejects .xls and .csv", () => {
        expect(validateUploadFile(new File([""], "file.xls", { type: "application/vnd.ms-excel" }))).toContain(".xlsx");
        expect(validateUploadFile(new File([""], "file.csv", { type: "text/csv" }))).toContain(".xlsx");
    });

    it("rejects files over 25 MB", () => {
        const big = xlsxFile("big.xlsx", XLSX_MIME, 25 * 1024 * 1024 + 1);
        expect(validateUploadFile(big)).toContain("25 MB");
    });
});

describe("Effective password accessor (autofill-safe)", () => {
    it("returns the DOM value even when React state would be empty", () => {
        const setUiError = vi.fn();
        const password = readEffectivePassword({
            getDomValue: () => "autofilled-secret",
            setUiError,
        });
        expect(password).toBe("autofilled-secret");
        expect(setUiError).not.toHaveBeenCalled();
    });

    it("returns null and sets a safe AUTH_REQUIRED error when DOM is empty", () => {
        const setUiError = vi.fn();
        const password = readEffectivePassword({
            getDomValue: () => "",
            setUiError,
        });
        expect(password).toBeNull();
        expect(setUiError).toHaveBeenCalledWith(expect.objectContaining({ code: "AUTH_REQUIRED" }));
    });

    it("never includes the password value in the error object", () => {
        const setUiError = vi.fn();
        readEffectivePassword({ getDomValue: () => "", setUiError });
        expect(JSON.stringify(setUiError.mock.calls[0][0])).not.toContain("autofilled");
    });
});
