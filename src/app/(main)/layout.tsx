
import "../globals.css";
import { Sidebar } from "@/components/Sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="bg-gray-50 text-gray-900">
        <div className="min-h-screen flex">
          <Sidebar />
          <main className="flex-1">
            <div className="mx-auto max-w-5xl p-6">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
