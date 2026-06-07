export interface AstroTodayData {
  strategyMode: string;
  strategyDirection: string;
  workRecommendations: string[];
  riskPreventions: string[];
  recoveryAnchors: string[];
  reflectionPrompt: string;
}

export interface DailyCheckinSnapshot {
  energyLevel: string;
  clarityLevel: string;
  workloadPressure: string;
  focusCondition: string;
  bodySignal: string;
  todayIntention: string;
  cautionNote: string;
}

export interface ReflectionHistoryItem {
  id: string;
  version: number;
  createdAt: string;
  updatedAt?: string;
  reflectionDate: string;
  reflectionMode: string;
  reflectionSummary: string;
  noticedNotes: string;
  nextRightAction: string;
  strategyMode: string;
  dailyCheckinSnapshot: DailyCheckinSnapshot;
  markdownSnapshot: string;
}

export interface AstroPlanningNotes {
  focusNext: string;
  slowDown: string;
  nextSmallAction: string;
  reviewLater: string;
  notesUpdatedAt?: string;
}

export interface GuideItem {
  step: string;
  title: string;
  description: string;
}

export interface DisclaimerItem {
  title: string;
  body: string;
  accent?: "amber" | "rose" | "slate";
}

export interface TimingGuideDimension {
  label: string;
  heading: string;
  description: string;
  accent: "teal" | "violet" | "amber" | "indigo";
}

export interface AstroGuideData {
  quickStartItems: GuideItem[];
  disclaimerItems: DisclaimerItem[];
  timingGuideDimensions: TimingGuideDimension[];
  ethicalFramingText: string;
  reflectionUseText: string;
  closingQuote: string;
}

export interface AstroReflectionDraft {
  title: string;
  activity: string;
  rating: string;
  text: string;
  updatedAt?: string;
}

export interface AstroPersistedPayload<T> {
  version: number;
  updatedAt: string;
  data: T;
}

/**
 * AstroStrategyDataAdapter defines the core contracts for loading and saving real-app data.
 * In future persistence phases, this interface will be implemented to connect with LocalStorage, IndexDB, or backend APIs.
 */
export interface AstroStrategyDataAdapter {
  /** Loads the daily brief (today's configuration) */
  loadTodayBrief(): Promise<AstroTodayData>;
  
  /** Loads all historical reflection logs */
  loadReflectionHistory(): Promise<ReflectionHistoryItem[]>;
  
  /** Saves the updated reflection history list */
  saveReflectionHistory(history: ReflectionHistoryItem[]): Promise<void>;
  
  /** Loads the strategy planning notes */
  loadPlanningNotes(): Promise<AstroPlanningNotes>;
  
  /** Saves the strategy planning notes */
  savePlanningNotes(notes: AstroPlanningNotes): Promise<void>;
  
  /** Loads the guide & ethical settings */
  loadGuideData(): Promise<AstroGuideData>;

  /** Loads the active unsaved reflection draft */
  loadReflectionDraft(): Promise<AstroReflectionDraft | null>;
  
  /** Saves the active unsaved reflection draft */
  saveReflectionDraft(draft: AstroReflectionDraft): Promise<void>;
  
  /** Clears the active reflection draft (e.g. after successful history append) */
  clearReflectionDraft(): Promise<void>;

  /** Clears the strategy planning notes key from persistence */
  clearPlanningNotes(): Promise<void>;

  /** Clears all preview keys from persistence */
  clearAllPreviewData(): Promise<void>;
}

export interface MigrationKeyMapping {
  legacyKey: string;
  targetKey: string;
  bytesDetected: number;
  status: "pending" | "ready" | "skipped_empty" | "error";
  error?: string;
}

export interface MigrationDryRunReport {
  timestamp: string;
  dryRun: boolean;
  status: "idle" | "success" | "skipped" | "error";
  migrationNeeded: boolean;
  legacyKeysFound: string[];
  mappings: MigrationKeyMapping[];
  errorMessage?: string;
}

