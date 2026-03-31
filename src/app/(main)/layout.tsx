
import "../globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Suspense } from "react";
import Topbar from "@/components/Topbar";
import { GlobalTaskDialogs } from "@/components/GlobalTaskDialogs";
import GlobalSearch from "@/components/GlobalSearch";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <div className="flex-1 w-full relative">
          <Suspense fallback={<div className="p-6 text-neutral-400">Loading…</div>}>
            <GlobalTaskDialogs />
            <GlobalSearch />
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
