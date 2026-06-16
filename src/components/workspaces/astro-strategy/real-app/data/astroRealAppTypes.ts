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

export interface AstroDataImportValidationIssue {
  severity: "error" | "warning";
  key?: string;
  message: string;
}

export interface AstroDataImportKeyStatus {
  key: string;
  existsInBackup: boolean;
  existsInCurrentStorage: boolean;
  backupBytes: number;
  currentBytes: number;
  status: "match" | "new" | "diff" | "missing_in_backup" | "malformed";
  notes?: string;
}

export interface AstroDataImportDryRunReport {
  isValid: boolean;
  exportedAt?: string;
  routeContext?: string;
  validationIssues: AstroDataImportValidationIssue[];
  keyStatuses: AstroDataImportKeyStatus[];
  metadata?: AstroDataExportMetadata;
  data?: AstroDataExportPayload;
}

export type AstroDataRestoreMode = "merge-safe" | "replace";

export interface AstroDataRestoreKeyResult {
  key: string;
  status: "restored" | "merged" | "skipped-exists" | "skipped-empty" | "failed";
  bytesWritten: number;
  error?: string;
}

export interface AstroDataRestoreResult {
  success: boolean;
  mode: AstroDataRestoreMode;
  restoredCount: number;
  skippedCount: number;
  failedCount: number;
  keyResults: AstroDataRestoreKeyResult[];
  error?: string;
}

export type ThaiAstroLayerSource = string;
export type ThaiAstroSignal = string;
export type ThaiAstroSymbolicAlignment = number;
export type ThaiAstroCautionLevel = "low" | "medium" | "high";

export interface ThaiAstroTimingContext {
  readonly isBirthWeekdayCycle: boolean;
  readonly currentYamIndex?: number;
  readonly rawTimeChecked: string;
}

export interface ThaiAstroStrategyOutput {
  readonly layerName: string;
  readonly source: ThaiAstroLayerSource;
  readonly timingContext: ThaiAstroTimingContext;
  readonly thaiAstroSignal: ThaiAstroSignal;
  readonly symbolicMeaning: string;
  readonly strategyImplication: string;
  readonly suggestedAction: string;
  readonly reflectionPrompt: string;
  readonly cautionNote: string;
  readonly cautionLevel: ThaiAstroCautionLevel;
  readonly symbolicAlignment: ThaiAstroSymbolicAlignment;
  readonly confidenceNotes: string;
  readonly safetyDisclaimer: string;
  readonly generatedAt: string;
}

export type ChineseElement = "wood" | "fire" | "earth" | "metal" | "water";

export interface ChineseAstroTimingContext {
  readonly dayMasterElement: ChineseElement;
  readonly currentSeason: "spring" | "summer" | "autumn" | "winter" | "earth-transition";
  readonly relationType: "supporting" | "neutral" | "caution";
}

export interface ChineseMetaphysicsStrategyOutput {
  readonly layerName: "Chinese Metaphysics Strategy";
  readonly source: string;
  readonly timingContext: ChineseAstroTimingContext;
  readonly chineseMetaphysicsSignal: string;
  readonly elementFocus: ChineseElement;
  readonly symbolicMeaning: string;
  readonly strategyImplication: string;
  readonly suggestedAction: string;
  readonly reflectionPrompt: string;
  readonly cautionNote: string;
  readonly symbolicAlignment: number; // 0.0 to 1.0
  readonly confidenceNotes: string;
  readonly safetyDisclaimer: string;
  readonly generatedAt: string;
}

export type ThaiTransitMode = "Focus" | "Stabilize" | "Pause";

export interface ThaiTransitPlanetSummary {
  readonly planetId: number;
  readonly zodiacSign: string;
  readonly isRetrograde: boolean;
}

export interface ThaiTransitHouseImpact {
  readonly houseName: string;
  readonly impactLevel: "high_support" | "high_pressure" | "neutral";
  readonly durationDays: number;
}

export interface ThaiTransitElementRelationship {
  readonly compatibilityType: "supporting" | "neutral" | "clashing";
  readonly elementPairAdvice: string;
}

export type ThaiTransitSignalId =
  | "TH_SIG_DEEP_WORK"
  | "TH_SIG_QA_REVIEW"
  | "TH_SIG_RECALIBRATE"
  | "TH_SIG_COMMUNICATE"
  | "TH_SIG_REST_EYE"
  | "TH_SIG_AVOID_DECISION"
  | "TH_SIG_REFACTOR";

export type ThaiTransitWorkModeId =
  | "structured_work"
  | "system_design"
  | "qa_testing"
  | "debugging"
  | "delivery"
  | "summary_notes"
  | "research"
  | "system_cleanup"
  | "meeting"
  | "agreements"
  | "self_pacing"
  | "energy_check"
  | "recovery"
  | "review"
  | "low_intensity";

export interface ThaiTransitStrategyOutput {
  readonly layerName: "Thai Transit Strategy";
  readonly source: string;
  readonly transitDate: string;
  readonly transitMode: ThaiTransitMode;
  readonly activeTransitHouses: string[];
  readonly transitPlanetSummary: ThaiTransitPlanetSummary[];
  readonly natalHouseImpacts: ThaiTransitHouseImpact[];
  readonly elementRelationship: ThaiTransitElementRelationship;
  readonly workTimingSignals: string[];
  readonly decisionCautionSignals: string[];
  readonly recoverySignals: string[];
  readonly recommendedWorkModes: string[];
  readonly avoidOrDelayModes: string[];
  readonly reflectionPrompt: string;
  readonly confidenceNotes: string;
  readonly safetyDisclaimer: string;
  readonly generatedAt: string;
}

// DEV-082 Composer types
export type NatalTransitStrategyMode = "Focus" | "Stabilize" | "Pause" | "Review" | "Recover";
export type NatalTransitCautionLevel = "low" | "medium" | "high";

export interface NatalTransitSuppressedSignal {
  readonly signalId: string;
  readonly sourceLayer: "natal" | "transit" | "history" | "engine" | "optional";
  readonly suppressionReason: string;
  readonly suppressedBy: "user_fatigue" | "today_engine_priority" | "low_confidence" | "duplicate";
  readonly confidenceImpact: number;
}

export interface NatalTransitStrategyComposerOutput {
  readonly layerName: string;
  readonly source: string;
  readonly strategyDate: string;
  readonly strategyMode: NatalTransitStrategyMode;
  readonly primaryRecommendation: string;
  readonly secondaryRecommendation: string[];
  readonly cautionLevel: NatalTransitCautionLevel;
  readonly focusWindow?: string;
  readonly workModePriority: string[];
  readonly recoveryPriority: string[];
  readonly decisionGuidance: string;
  readonly supportingSignals: string[];
  readonly suppressedSignals: NatalTransitSuppressedSignal[];
  readonly conflictResolutionNotes: string;
  readonly reflectionPrompt: string;
  readonly confidenceNotes: string;
  readonly safetyDisclaimer: string;
  readonly generatedAt: string;
}

export interface NatalTransitComposerInput {
  readonly targetDate: string;
  readonly targetTime?: string;
  readonly todayTimingData?: {
    readonly strategyMode: string;
    readonly strategyDirection: string;
    readonly workRecommendations: string[];
    readonly riskPreventions: string[];
    readonly recoveryAnchors: string[];
    readonly reflectionPrompt: string;
  } | null;
  readonly thaiTransitContext?: ThaiTransitStrategyOutput | null;
  readonly natalStrategyProfile?: AstroBirthProfile | null;
  readonly reflectionHistorySummary?: {
    readonly totalLogsThisMonth: number;
    readonly fatigueLevel?: "low" | "medium" | "high";
    readonly energyLevel?: "low" | "medium" | "high";
    readonly recentLowEnergySignalsDetected?: boolean;
  } | null;
  readonly thaiAstroContext?: ThaiAstroStrategyOutput | null;
  readonly chineseAstroContext?: ChineseMetaphysicsStrategyOutput | null;
  readonly userCurrentFocus?: string;
  readonly userEnergyState?: {
    readonly energyLevel?: "low" | "steady" | "hyper" | "variable";
    readonly bodySignal?: "normal" | "fatigued" | "tense" | "refreshed";
  } | null;
}

export type ThaiZodiacSign =
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces";

export type ThaiHouseName =
  | "ตนุ"
  | "กดุมภะ"
  | "สหัชชะ"
  | "พันธุ"
  | "ปุตตะ"
  | "อริ"
  | "ปัตนิ"
  | "มรณะ"
  | "ศุภะ"
  | "กัมมะ"
  | "ลาภะ"
  | "วินาศ";

export type ThaiHouseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface ThaiHouseMappingInput {
  ascendantZodiacSign: string;
  ascendantConfidenceScore: number;
  calculationMethod: string;
  dayBoundaryRisk: boolean;
  birthDataConfidence: "high" | "medium" | "low" | "unknown";
  generatedAt?: string;
}

export interface ThaiHousePlacementV01 {
  houseNumber: ThaiHouseNumber;
  houseNameThai: ThaiHouseName;
  zodiacSign: ThaiZodiacSign;
  themeCategory: "work" | "resource" | "network" | "obstacle" | "recharge" | "other";
  workLifeTheme: string;
  strategyMeaningIds: string[];
  cautionSignalIds: string[];
  recoverySignalIds: string[];
  confidenceScore: number;
  uncertaintyNotes: string;
}

export interface ThaiHouseMappingV01 {
  mappingId: string;
  source: string;
  calculationVersion: string;
  houseSystem: string;
  ascendant: {
    zodiacSign: string;
    confidenceScore: number;
    calculationMethod: string;
  };
  houses: ThaiHousePlacementV01[];
  dominantWorkHouses: number[];
  sensitiveHouses: number[];
  strategicSignalIds: string[];
  confidenceNotes: string;
  safetyDisclaimer: string;
  generatedAt: string;
}

// ASTRO-REAL-APP-DEV-099 — Thai Planet Placement Types
export type ThaiPlanetId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type ThaiPlanetPlacementConfidence = 'pending' | 'approximate' | 'validated' | 'unavailable';

export type ThaiPlanetPlacementValidationStatus =
  | 'not-validated'
  | 'reference-matched'
  | 'reference-mismatch'
  | 'not-comparable';

export type ThaiPlanetPlacementComparisonStatus =
  | 'matched'
  | 'mismatch'
  | 'not-comparable'
  | 'system-mismatch';

export interface ThaiPlanetPlacementInput {
  birthDate: string;
  birthTime: string;
  birthLocation: {
    label: string;
    latitude?: number;
    longitude?: number;
    timezone: string;
  };
  calendarSystem: 'pending-reference-validation' | 'thai-solar' | 'gregorian' | 'system-specific';
  calculationSystem: 'pending-reference-validation' | 'thai-traditional' | 'sidereal' | 'system-specific';
}

export interface ThaiPlanetMappingEntry {
  planetId: ThaiPlanetId;
  label: string;
  role: string;
  mappingStatus: 'pending-reference-validation' | 'validated' | 'system-specific';
  sourceNote?: string;
}

export interface ThaiPlanetPlacementResult {
  planetId: ThaiPlanetId;
  signRasi: string | 'pending-reference-validation' | 'unavailable';
  degree: string | 'pending-reference-validation' | 'unavailable';
  segment?: string | 'pending-reference-validation' | 'unavailable';
  specialStatus?: string | 'pending-reference-validation' | 'unavailable';
  confidence: ThaiPlanetPlacementConfidence;
  validationStatus: ThaiPlanetPlacementValidationStatus;
  notes?: string;
}

export interface ThaiPlanetPlacementReferenceCaseLike {
  caseId: string;
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  timezone: string;
  calendarSystem: string;
  sourceType: string;
  referenceConfidence: string;
  validationStatus: string;
  notes?: string;
  expectedPlacements?: Array<{
    planetId: number;
    expectedSignRasi: string;
    expectedDegree: string;
    expectedSegment?: string;
    expectedSpecialStatus?: string;
    validationSourceNote?: string;
  }>;
}

export interface ThaiPlanetPlacementComparison {
  caseId: string;
  planetId: ThaiPlanetId;
  runtimeValue: ThaiPlanetPlacementResult;
  expectedValueStatus: 'pending-reference-validation' | 'validated' | 'unavailable';
  comparisonStatus: ThaiPlanetPlacementComparisonStatus;
  notes?: string;
}

export interface ThaiPlanetPlacementSafetySummary {
  comparableCount: number;
  notComparableCount: number;
  validatedCount: number;
  pendingCount: number;
  issues: string[];
}

