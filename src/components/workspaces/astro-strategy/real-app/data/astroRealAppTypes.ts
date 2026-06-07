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
}
