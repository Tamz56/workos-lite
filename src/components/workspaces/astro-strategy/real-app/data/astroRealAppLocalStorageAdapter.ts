import { AstroStrategyDataAdapter, AstroTodayData, ReflectionHistoryItem, AstroPlanningNotes, AstroGuideData, AstroReflectionDraft, AstroPersistedPayload } from "./astroRealAppTypes";
import { MOCK_TODAY_DATA, MOCK_HISTORY_LOGS, MOCK_PLANNING_NOTES, MOCK_GUIDE_DATA } from "./astroRealAppMockData";

const KEYS = {
  REFLECTION_HISTORY: "astro-real-app:reflection-history:v1",
  PLANNING_NOTES: "astro-real-app:planning-notes:v1",
  REFLECTION_DRAFT: "astro-real-app:reflection-draft:v1"
};

const VERSION = 1;

function safeParse<T>(jsonStr: string | null, fallback: T): T {
  if (!jsonStr) return fallback;
  try {
    const payload = JSON.parse(jsonStr) as AstroPersistedPayload<T>;
    // Check if it fits the payload wrapper structure
    if (payload && payload.version !== undefined && payload.data !== undefined) {
      return payload.data;
    }
    // Backward compatibility for raw parsed objects
    return payload as unknown as T;
  } catch (error) {
    console.error("AstroRealAppLocalStorageAdapter: Failed to parse JSON.", error);
    return fallback;
  }
}

function safeSave<T>(key: string, data: T): void {
  try {
    const payload: AstroPersistedPayload<T> = {
      version: VERSION,
      updatedAt: new Date().toISOString(),
      data
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (error) {
    console.error(`AstroRealAppLocalStorageAdapter: Failed to save key "${key}" to localStorage.`, error);
  }
}

export const AstroRealAppLocalStorageAdapter: AstroStrategyDataAdapter = {
  loadTodayBrief: async (): Promise<AstroTodayData> => {
    return MOCK_TODAY_DATA;
  },

  loadReflectionHistory: async (): Promise<ReflectionHistoryItem[]> => {
    if (typeof window === "undefined") return MOCK_HISTORY_LOGS;
    return safeParse(localStorage.getItem(KEYS.REFLECTION_HISTORY), MOCK_HISTORY_LOGS);
  },

  saveReflectionHistory: async (history: ReflectionHistoryItem[]): Promise<void> => {
    if (typeof window === "undefined") return;
    safeSave(KEYS.REFLECTION_HISTORY, history);
  },

  loadPlanningNotes: async (): Promise<AstroPlanningNotes> => {
    if (typeof window === "undefined") return MOCK_PLANNING_NOTES;
    return safeParse(localStorage.getItem(KEYS.PLANNING_NOTES), MOCK_PLANNING_NOTES);
  },

  savePlanningNotes: async (notes: AstroPlanningNotes): Promise<void> => {
    if (typeof window === "undefined") return;
    safeSave(KEYS.PLANNING_NOTES, notes);
  },

  loadGuideData: async (): Promise<AstroGuideData> => {
    return MOCK_GUIDE_DATA;
  },

  // Stub/Delayed methods for Drafts
  loadReflectionDraft: async (): Promise<AstroReflectionDraft | null> => {
    return null;
  },

  saveReflectionDraft: async (): Promise<void> => {
    return;
  },

  clearReflectionDraft: async (): Promise<void> => {
    return;
  }
};
