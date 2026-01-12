
import "../globals.css";
import { Sidebar } from "@/components/Sidebar";

import Topbar from "@/components/Topbar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="bg-gray-50 text-gray-900">
        <div className="min-h-screen flex">
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0">
            <Topbar />
            <div className="flex-1 p-6 max-w-5xl mx-auto w-full">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
