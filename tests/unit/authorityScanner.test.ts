// P1E.2 / R1-L2 — scanner hardening: handler-style coverage, set equality,
// and Server Action guardrail detection.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
    findServerActionFiles,
    mutationMethodsInSource,
    scanRouteFiles,
} from "../helpers/routeScanner";

const tmpDirs: string[] = [];

function makeTmp(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "p1e2-scanner-"));
    tmpDirs.push(dir);
    return dir;
}

afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

describe("mutationMethodsInSource", () => {
    it("detects function-style handlers", () => {
        expect(mutationMethodsInSource("export async function POST(req) {}")).toEqual(["POST"]);
        expect(mutationMethodsInSource("export function PATCH(req) {}")).toEqual(["PATCH"]);
    });

    it("detects const/arrow-style handlers", () => {
        expect(mutationMethodsInSource("export const PUT = async (req) => {}")).toEqual(["PUT"]);
        expect(mutationMethodsInSource("export const DELETE = (req) => {}")).toEqual(["DELETE"]);
    });

    it("detects mixed styles in one file", () => {
        const source = [
            "export async function POST(req) {}",
            "export const PATCH = (req) => {}",
            "export function PUT(req) {}",
            "export const DELETE = async (req) => {}",
        ].join("\n");
        // Function-style exports are collected first, then const/arrow style.
        expect(mutationMethodsInSource(source)).toEqual(["POST", "PUT", "PATCH", "DELETE"]);
    });

    it("does not flag unrelated code", () => {
        expect(mutationMethodsInSource("export async function GET(req) {}")).toEqual([]);
        expect(mutationMethodsInSource("const x = 1;")).toEqual([]);
    });
});

describe("scanRouteFiles filesystem set equality", () => {
    it("finds hidden-ignore dirs and const/function styles with exact keys", () => {
        const root = makeTmp();
        fs.mkdirSync(path.join(root, "api", "hidden-dir"), { recursive: true });
        fs.mkdirSync(path.join(root, "api", "plain"), { recursive: true });
        fs.writeFileSync(
            path.join(root, "api", "hidden-dir", "route.ts"),
            "export async function POST(req) {}\n",
        );
        fs.writeFileSync(
            path.join(root, "api", "plain", "route.ts"),
            "export const PATCH = async (req) => {}\n",
        );

        const scanned = scanRouteFiles(path.join(root, "api"));
        expect(scanned.get("hidden-dir")).toEqual(["POST"]);
        expect(scanned.get("plain")).toEqual(["PATCH"]);
    });
});

describe("findServerActionFiles", () => {
    it("detects use-server files and ignores clean files", () => {
        const root = makeTmp();
        const withAction = path.join(root, "action.ts");
        const clean = path.join(root, "clean.tsx");
        fs.writeFileSync(withAction, '"use server";\nexport async function save() {}\n');
        fs.writeFileSync(clean, "export function read() {}\n");

        const found = findServerActionFiles(root);
        expect(found).toEqual([withAction]);
    });
});
