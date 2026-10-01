import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const pagePath = path.join(
  process.cwd(),
  "src/app/(main)/workspaces/astro-strategy/dashboard-v0/page.tsx",
);

const dashboardPath = path.join(
  process.cwd(),
  "src/components/workspaces/astro-strategy/real-app/AstroStrategicLifeDashboardV0.tsx",
);

const dataPath = path.join(
  process.cwd(),
  "src/components/workspaces/astro-strategy/real-app/data/astroStrategicLifeDashboardV0.ts",
);

const pageSource = fs.readFileSync(pagePath, "utf8");
const dashboardSource = fs.readFileSync(dashboardPath, "utf8");
const dataSource = fs.readFileSync(dataPath, "utf8");

describe("ASTRO-DASH-002 dashboard route contract", () => {
  it("uses the existing AstroStrategyAppShell on the isolated validation route", () => {
    expect(pageSource).toContain("AstroStrategyAppShell");
    expect(pageSource).toContain("AstroStrategicLifeDashboardV0");
    expect(pageSource).not.toContain("AstroRealAppPreview");
  });

  it("keeps Project Motion fail-closed", () => {
    expect(dataSource).toContain('"FAIL_CLOSED / UNAVAILABLE"');
    expect(dataSource).toContain(
      '"Live governed Project Motion is not yet proven for this Dashboard."',
    );
  });

  it("exposes method/source and explainability affordances", () => {
    expect(dashboardSource).toContain("Why this reading?");
    expect(dashboardSource).toContain("Method / Source");
    expect(dashboardSource).toContain("What is not yet known / omitted");
  });

  it("keeps natal interpretation, strategic guidance, and human decision distinct", () => {
    expect(dashboardSource).toContain("Natal Interpretation");
    expect(dashboardSource).toContain("Strategic Guidance");
    expect(dashboardSource).toContain("Human Decision");
  });

  it("does not import calculation runtime or the production preview", () => {
    const combined = `${pageSource}\n${dashboardSource}\n${dataSource}`;

    expect(combined).not.toContain("astroRealAppAstrologyEngineAdapter");
    expect(combined).not.toContain("astroRealAppThaiAstrologyAdapter");
    expect(combined).not.toContain("astroRealAppThaiTransitAdapter");
    expect(combined).not.toContain("AstroRealAppPreview");
  });

  it("contains no numeric astrology score UI", () => {
    const combined = `${dashboardSource}\n${dataSource}`;

    expect(combined).not.toMatch(/astrology score/i);
    expect(combined).not.toMatch(/numeric astrology score/i);
  });
});
