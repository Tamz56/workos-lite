import { describe, it, expect } from "vitest";
import { 
    parseProjectMetadata, 
    getCleanDisplayTitle, 
    getEpisodeCode, 
    getAssetType, 
    getLegacyId 
} from "../../src/lib/projectMetadata";

describe("parseProjectMetadata and Helpers", () => {
    it("should handle clean projects without episode or metadata notes", () => {
        const project = {
            title: "ไซโตไคนินและจิ๊บเบอเรลลิน",
            writing_mode: "knowledge_article"
        };
        const meta = parseProjectMetadata(project);
        expect(meta.canonicalTitle).toBe("ไซโตไคนินและจิ๊บเบอเรลลิน");
        expect(meta.displayTitle).toBe("ไซโตไคนินและจิ๊บเบอเรลลิน");
        expect(meta.assetType).toBe("knowledge_article");
        expect(meta.episodeCode).toBeUndefined();
    });

    it("should extract episodeCode from episode_id match", () => {
        const project = {
            title: "ไซโตไคนินและจิ๊บเบอเรลลิน",
            writing_mode: "knowledge_article",
            episode_id: "GF-S01-E07"
        };
        const meta = parseProjectMetadata(project);
        expect(meta.episodeCode).toBe("EP.7");
        expect(meta.displayTitle).toBe("EP.7 — ไซโตไคนินและจิ๊บเบอเรลลิน");
    });

    it("should NOT extract episodeCode from hash/legacy IDs (length > 2)", () => {
        const project = {
            title: "EP.9.2 เมื่อใบสร้างอาหารผ่านปากใบ",
            writing_mode: "knowledge_article",
            episode_id: "EP-DFE07090"
        };
        const epCode = getEpisodeCode(project);
        expect(epCode).toBeUndefined();
        
        const cleanTitle = getCleanDisplayTitle(project);
        expect(cleanTitle).toBe("EP.9.2 เมื่อใบสร้างอาหารผ่านปากใบ");
    });

    it("should extract legacyId from hash/legacy IDs (length > 2)", () => {
        const project = {
            title: "EP.9.2 เมื่อใบสร้างอาหารผ่านปากใบ",
            writing_mode: "knowledge_article",
            id: "EP-DFE07090"
        };
        const legacyId = getLegacyId(project);
        expect(legacyId).toBe("07090");
    });

    it("should parse legacy IDs and clean visible titles with numeric prefixes", () => {
        const project = {
            title: "07090 — EP.9.2 Cytokinin Article",
            writing_mode: "knowledge_article",
            notes: JSON.stringify({
                episodeCode: "EP.9.2"
            })
        };
        const meta = parseProjectMetadata(project);
        expect(meta.legacyId).toBe("07090");
        expect(meta.canonicalTitle).toBe("EP.9.2 Cytokinin Article");
        expect(meta.displayTitle).toBe("EP.9.2 — EP.9.2 Cytokinin Article");
    });

    it("should map legacySource notes as legacy_shell assetType", () => {
        const project = {
            title: "plant-cytokinin-hormone",
            writing_mode: "knowledge_article",
            notes: JSON.stringify({
                legacySource: true,
                originalSlug: "plant-cytokinin-hormone"
            })
        };
        const meta = parseProjectMetadata(project);
        expect(meta.assetType).toBe("legacy_shell");
    });
});
