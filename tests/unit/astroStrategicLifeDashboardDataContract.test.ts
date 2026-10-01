import { describe, expect, it } from "vitest";

import { astroStrategicLifeDashboardV0 as data } from "@/components/workspaces/astro-strategy/real-app/data/astroStrategicLifeDashboardV0";

describe("ASTRO-DASH-002 strategic life dashboard data contract", () => {
  it("uses the candidate v0.2 contract and Thai astrology method context", () => {
    expect(data.schemaVersion).toBe("astro.dashboard.v0.2-candidate");
    expect(data.methodContext.primaryTradition).toBe("THAI_ASTROLOGY");
    expect(data.methodContext.zodiacReference).toBe("NIRAYANA / SIDEREAL");
    expect(data.methodContext.ayanamsha).toBe("LAHIRI");
    expect(data.methodContext.implementationLabel).toBe("WHOLE_SIGN");
    expect(data.methodContext.planetBaseline).toBe("CLASSICAL_7_PLANETS");
  });

  it("preserves explicit method omissions", () => {
    expect(data.omissions).toEqual([
      "RAHU_POLICY",
      "KETU_POLICY",
      "MRITAYU_MAPPING",
      "EXACT_ASPECT_MECHANICS",
    ]);
  });

  it("keeps Work governed and Money governed-limited", () => {
    expect(data.domains.work.displayState).toBe("SUPPORTIVE / BOUNDED");
    expect(data.domains.work.authority).toBe("ASTRO-METHOD-012");

    expect(data.domains.money.displayState).toBe(
      "STRUCTURAL CONNECTION / DIRECTION NOT ESTABLISHED",
    );
    expect(data.domains.money.synthesisClass).toBe("INSUFFICIENT_EVIDENCE");
    expect(data.domains.money.authority).toBe("ASTRO-METHOD-013");
  });

  it("keeps wellbeing human-reported, non-diagnostic, and reality-first", () => {
    expect(data.domains.wellbeing.source).toBe("HUMAN_REPORTED ONLY");
    expect(data.domains.wellbeing.astroDerivation).toBe(false);
    expect(data.domains.wellbeing.nonDiagnostic).toBe(true);
    expect(data.domains.wellbeing.capacityPrecedence).toBe(true);
    expect(data.domains.wellbeing.rule).toBe(
      "REALITY / CAPACITY > ASTRO MOMENTUM",
    );
  });

  it("does not fabricate unavailable relationship or home/family readings", () => {
    expect(data.domains.relationships.availability).toBe("not_yet_governed");
    expect(data.domains.homeFamily.availability).toBe("not_yet_governed");
  });

  it("fails Project Motion closed with no fallback authority", () => {
    expect(data.projectMotion.available).toBe(false);
    expect(data.projectMotion.state).toBe("FAIL_CLOSED / UNAVAILABLE");
    expect(data.projectMotion.forbiddenFallbacks).toEqual(
      expect.arrayContaining([
        "Project Registry",
        "Planner",
        "Project Work Log",
        "Coordination recovery",
        "hard-coded Project status",
      ]),
    );
  });

  it("separates natal interpretation, guidance, and human decision", () => {
    expect(data.strategicTranslation.separationRule).toBe(
      "NATAL_INTERPRETATION != STRATEGIC_GUIDANCE != HUMAN_DECISION",
    );
  });

  it("contains no numeric astrology score contract", () => {
    const serialized = JSON.stringify(data);

    expect(serialized).not.toMatch(/astrologyScore/i);
    expect(serialized).not.toMatch(/numericScore/i);
  });
});
