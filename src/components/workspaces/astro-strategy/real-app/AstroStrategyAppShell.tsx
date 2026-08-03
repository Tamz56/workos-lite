import * as React from "react";

type AstroStrategyAppShellProps = {
  children: React.ReactNode;
};

export function AstroStrategyAppShell({ children }: AstroStrategyAppShellProps) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
