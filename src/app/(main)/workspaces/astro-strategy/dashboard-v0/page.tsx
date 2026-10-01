import { AstroStrategicLifeDashboardV0 } from "@/components/workspaces/astro-strategy/real-app/AstroStrategicLifeDashboardV0";
import { AstroStrategyAppShell } from "@/components/workspaces/astro-strategy/real-app/AstroStrategyAppShell";

export const metadata = {
  title: "Strategic Life Dashboard V0 | Astro Strategy Lab",
  description:
    "Thai-Primary bounded validation dashboard for governed strategic-life interpretation.",
};

export default function AstroStrategicLifeDashboardV0Page() {
  return (
    <AstroStrategyAppShell>
      <AstroStrategicLifeDashboardV0 />
    </AstroStrategyAppShell>
  );
}
