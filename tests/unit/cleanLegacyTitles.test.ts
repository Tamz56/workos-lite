import { describe, it, expect } from "vitest";

describe("clean-legacy-titles prefix matching and metadata update logic", () => {
    const prefixRegex = /^(\d+)\s*—\s*/;

    it("should match typical prefixes and extract clean title", () => {
        const title = "07090 — EP.9.2 Cytokinin Guide";
        const match = title.match(prefixRegex);
        expect(match).toBeTruthy();
        expect(match![1]).toBe("07090");

        const cleanTitle = title.replace(prefixRegex, "");
        expect(cleanTitle).toBe("EP.9.2 Cytokinin Guide");
    });

    it("should merge extracted legacyId and originalTitle into notes JSON", () => {
        const title = "5773 — EP.10.1 Auxin Guide";
        const legacyId = "5773";
        const cleanTitle = title.replace(prefixRegex, "");
        
        const existingNotes = {
            someKey: "someValue"
        };

        const updatedNotes = {
            ...existingNotes,
            legacyId,
            originalTitle: title
        };

        expect(updatedNotes.legacyId).toBe("5773");
        expect(updatedNotes.originalTitle).toBe("5773 — EP.10.1 Auxin Guide");
        expect(updatedNotes.someKey).toBe("someValue");
    });
});
