// RC9: Knowledge Base & Notes+ Update
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WorkOS-Lite",
  description: "Local-first task OS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="bg-gray-50 text-gray-900" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
