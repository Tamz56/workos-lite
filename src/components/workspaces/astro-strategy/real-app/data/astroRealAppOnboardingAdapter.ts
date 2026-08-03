import { AstroOnboardingStatus, AstroOnboardingSignal } from "./astroRealAppTypes";
import { buildLegacyMigrationDryRunReport } from "./astroRealAppMigrationDryRunAdapter";

const ONBOARDING_KEY = "astro-real-app:onboarding:v1";

/**
 * Safely inspects the existence of all target keys and legacy keys in localStorage.
 * Does not write or modify any key.
 */
export function detectFirstRunSignals(): AstroOnboardingSignal & { legacyKeysExist: boolean; legacyKeysFound: string[] } {
  if (typeof window === "undefined") {
    return {
      birthProfileExists: false,
      reflectionHistoryExists: false,
      planningNotesExists: false,
      reflectionDraftExists: false,
      legacyKeysExist: false,
      legacyKeysFound: []
    };
  }

  const birthProfileExists = localStorage.getItem("astro-real-app:birth-profile:v1") !== null;
  const reflectionHistoryExists = localStorage.getItem("astro-real-app:reflection-history:v1") !== null;
  const planningNotesExists = localStorage.getItem("astro-real-app:planning-notes:v1") !== null;
  const reflectionDraftExists = localStorage.getItem("astro-real-app:reflection-draft:v1") !== null;

  const dryRunReport = buildLegacyMigrationDryRunReport();
  const legacyKeysFound = dryRunReport.legacyKeysFound || [];
  const legacyKeysExist = legacyKeysFound.length > 0;

  return {
    birthProfileExists,
    reflectionHistoryExists,
    planningNotesExists,
    reflectionDraftExists,
    legacyKeysExist,
    legacyKeysFound
  };
}

/**
 * Loads the onboarding dismissed state from LocalStorage.
 * Returns true if the user has explicitly dismissed the onboarding banner/panel.
 */
export function loadOnboardingDismissedState(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const serialized = localStorage.getItem(ONBOARDING_KEY);
    if (!serialized) return false;
    const envelope = JSON.parse(serialized);
    if (envelope && typeof envelope === "object" && "isDismissed" in envelope) {
      return !!envelope.isDismissed;
    }
    return false;
  } catch (error) {
    console.error("loadOnboardingDismissedState: Failed to parse onboarding status.", error);
    return false;
  }
}

/**
 * Saves the onboarding dismissed state to LocalStorage.
 * Only writes to the dedicated astro-real-app:onboarding:v1 key.
 */
export function saveOnboardingDismissedState(dismissed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    const envelope = {
      version: 1,
      updatedAt: new Date().toISOString(),
      isDismissed: dismissed
    };
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(envelope));
  } catch (error) {
    console.error("saveOnboardingDismissedState: Failed to save onboarding status.", error);
  }
}

/**
 * Builds the complete AstroOnboardingStatus object.
 * First-run is detected if the Birth Profile or Reflection History key is missing in LocalStorage.
 */
export function buildAstroOnboardingStatus(): AstroOnboardingStatus {
  const isDismissed = loadOnboardingDismissedState();
  const signals = detectFirstRunSignals();

  const detectedSignals: string[] = [];
  if (!signals.birthProfileExists) {
    detectedSignals.push("Birth Profile is missing");
  }
  if (!signals.reflectionHistoryExists) {
    detectedSignals.push("Reflection History is missing");
  }
  if (!signals.planningNotesExists) {
    detectedSignals.push("Planning Notes are missing");
  }
  if (!signals.reflectionDraftExists) {
    detectedSignals.push("Reflection Draft is missing");
  }
  if (signals.legacyKeysExist) {
    detectedSignals.push(`Legacy keys found: ${signals.legacyKeysFound.join(", ")}`);
  }

  // We consider it a "First Run" if the user has no Birth Profile configured in LocalStorage,
  // or has no Reflection History saved yet.
  const isFirstRun = !signals.birthProfileExists || !signals.reflectionHistoryExists;

  return {
    isFirstRun,
    isDismissed,
    detectedSignals
  };
}

/**
 * Clears the onboarding status key (Preview / Debug / Reset use only).
 */
export function resetOnboardingDismissedStateForPreviewOnly(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ONBOARDING_KEY);
  } catch (error) {
    console.error("resetOnboardingDismissedStateForPreviewOnly: Failed to remove key.", error);
  }
}
