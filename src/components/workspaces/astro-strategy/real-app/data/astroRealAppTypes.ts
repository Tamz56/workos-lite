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
  timingContext?: {
    mode: string;
    label: string;
    source: "engine" | "fallback" | "manual" | "legacy";
    capturedAt: string;
    disclaimer?: string;
  };
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
  legacyExists: boolean;
  targetExists: boolean;
  itemCount?: number;
  status: "ready" | "skip-target-exists" | "missing-legacy" | "unsupported" | "parse-error";
  notes?: string;
  bytesDetected: number;
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

export type MigrationExecutionStatus =
  | "copied"
  | "skipped-target-exists"
  | "skipped-missing-legacy"
  | "skipped-not-ready"
  | "skipped-parse-error"
  | "failed";

export interface MigrationExecutionItem {
  legacyKey: string;
  targetKey: string;
  status: MigrationExecutionStatus;
  bytesTransferred?: number;
  error?: string;
}

export interface MigrationExecutionResult {
  timestamp: string;
  copiedCount: number;
  skippedCount: number;
  failedCount: number;
  items: MigrationExecutionItem[];
}

export interface AstroBirthProfile {
  displayName?: string;
  fullName?: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  timezone?: string;
  utcOffset?: string;
  birthWeekday?: string;
  notes?: string;
  updatedAt?: string;
  schemaVersion?: number;
}

export interface AstroBirthProfileStorageEnvelope {
  version: number;
  updatedAt: string;
  data: AstroBirthProfile;
}

export interface AstroBirthProfileValidationIssue {
  field: keyof AstroBirthProfile;
  message: string;
  severity: "error" | "warning";
}

export interface AstroBirthProfileValidationResult {
  isValid: boolean;
  issues: AstroBirthProfileValidationIssue[];
}

export interface AstroBirthProfilePersistenceResult {
  success: boolean;
  error?: string;
  profile?: AstroBirthProfile;
}


export interface AstroTimingInput {
  birthProfile: AstroBirthProfile;
  targetDate?: string; // Format: YYYY-MM-DD
}

export type AstroTimingMode = "Stabilize & Structure" | "Focus & Deliver" | "Pause & Calibrate";

export interface AstroTimingBrief {
  strategyMode: AstroTimingMode;
  triggerSignal: string;
  reason: string;
  recommendedMove: string;
  recoverySupport: string;
  guardrail: string;
}

export interface AstroStrategyRecommendation {
  text: string;
  category: "work" | "planning" | "action";
}

export interface AstroRiskFlag {
  text: string;
  severity: "low" | "medium" | "high";
}

export interface AstroRecoveryAnchor {
  text: string;
  type: "short" | "evening";
}

export interface AstroEngineMetadata {
  readonly calculationMode: "rule-based" | "ephemeris" | "hybrid";
  readonly confidenceScore: number; // 0.0 to 1.0 confidence representation
  readonly sourceEngine: string; // identifier of source algorithm
  readonly disclaimer: string; // safety and ethical disclaimer
}

export interface AstroEngineOutput {
  readonly timestamp: string;
  readonly timingInput: AstroTimingInput;
  readonly brief: AstroTimingBrief;
  readonly recommendations: readonly AstroStrategyRecommendation[];
  readonly riskFlags: readonly AstroRiskFlag[];
  readonly recoveryAnchors: readonly AstroRecoveryAnchor[];
  readonly metadata: AstroEngineMetadata;
}

export interface AstroWeeklyTimingDay {
  date: string;
  weekday: string;
  mode: AstroTimingMode;
  label: string;
  strategicFocus: string;
  recommendedAction: string;
  riskNote: string;
  recoveryAnchor: string;
  source: "engine" | "fallback";
  confidence: number;
  isBirthWeekdayCycle: boolean;
}

export interface AstroWeeklyTimingViewModel {
  days: AstroWeeklyTimingDay[];
  weeklyTheme: string;
  metadata: AstroEngineMetadata;
  disclaimer: string;
}

export interface AstroMonthlyReflectionViewModel {
  monthLabel: string;
  primaryMode: AstroTimingMode;
  secondaryMode: AstroTimingMode;
  monthlyTheme: string;
  strategicFocus: string;
  recommendedFocusAreas: string[];
  riskWatch: string[];
  recoveryAnchors: string[];
  reflectionPatternSummary: string;
  totalLogsThisMonth: number;
  topLoggedMode: string;
  topLoggedEnergy: string;
  source: "engine" | "fallback";
  confidence: number;
  generatedAt: string;
  disclaimer: string;
  metadata: AstroEngineMetadata;
}

export interface AstroOnboardingStatus {
  isFirstRun: boolean;
  isDismissed: boolean;
  detectedSignals: string[];
}

export interface AstroOnboardingSignal {
  birthProfileExists: boolean;
  reflectionHistoryExists: boolean;
  planningNotesExists: boolean;
  reflectionDraftExists: boolean;
}

export interface AstroOnboardingStorageEnvelope {
  version: number;
  updatedAt: string;
  isDismissed: boolean;
}

export interface AstroDataExportMetadata {
  appName: string;
  exportVersion: number;
  exportedAt: string;
  routeContext: string;
  source: string;
  schemaVersions: Record<string, number>;
  includedKeys: string[];
}

export interface AstroDataExportPayload {
  [key: string]: unknown;
}

export interface AstroDataExportEnvelope {
  $schema: string;
  metadata: AstroDataExportMetadata;
  data: AstroDataExportPayload;
}

export interface AstroDataExportKeyStatus {
  key: string;
  exists: boolean;
  bytes: number;
  status: "available" | "missing" | "malformed";
  notes?: string;
}

export interface AstroDataExportResult {
  success: boolean;
  fileName?: string;
  bytes?: number;
  error?: string;
}




