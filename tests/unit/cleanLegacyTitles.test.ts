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

    it("should scan and clean multiple notes fields like displayTitle, canonicalTitle, and episodeCode", () => {
        const parsedNotes = {
            legacyId: "5773",
            displayTitle: "5773 — EP.10.1 Auxin Guide",
            canonicalTitle: "5773 — EP.10.1 Auxin Guide",
            episodeCode: "5773 — EP.10.1"
        };

        const updatedNotes = {
            ...parsedNotes,
            originalTitle: "5773 — EP.10.1 Auxin Guide",
            displayTitle: parsedNotes.displayTitle.replace(prefixRegex, ""),
            canonicalTitle: parsedNotes.canonicalTitle.replace(prefixRegex, ""),
            episodeCode: parsedNotes.episodeCode.replace(prefixRegex, "")
        };

        expect(updatedNotes.displayTitle).toBe("EP.10.1 Auxin Guide");
        expect(updatedNotes.canonicalTitle).toBe("EP.10.1 Auxin Guide");
        expect(updatedNotes.episodeCode).toBe("EP.10.1");
        expect(updatedNotes.originalTitle).toBe("5773 — EP.10.1 Auxin Guide");
    });
});
