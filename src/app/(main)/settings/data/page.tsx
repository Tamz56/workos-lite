import BackupRestorePanel from "@/components/backup/BackupRestorePanel";
import Link from "next/link";

export const metadata = {
    title: "Data Management | WorkOS-Lite",
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border bg-white/50 p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600">
                {title}
            </h2>
            {children}
        </div>
    );
}

export default function DataPage() {
    return (
        <div className="mx-auto max-w-3xl space-y-6 p-6">
            {/* Header */}
            <div>
                <Link href="/dashboard" className="text-xs text-neutral-500 hover:underline">
                    ← Back to Dashboard
                </Link>
                <h1 className="mt-2 text-xl font-semibold">Data Management</h1>
                <p className="text-sm text-neutral-500">
                    Export and import your data for backup or migration.
                </p>
            </div>

            {/* Export Section */}
            <Card title="Export Data">
                <p className="mb-4 text-sm text-neutral-600">
                    Download a backup of all your tasks, events, docs, and attachments.
                </p>
                <div className="flex flex-wrap gap-3">
                    <a
                        href="/api/export-zip"
                        className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-neutral-50"
                    >
                        <span>📦</span>
                        <span>Export Backup (ZIP)</span>
                    </a>
                    <a
                        href="/api/export"
                        className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-neutral-50"
                    >
                        <span>📄</span>
                        <span>Export Metadata (JSON)</span>
                    </a>
                </div>
                <p className="mt-3 text-xs text-neutral-500">
                    ZIP includes attachments. JSON contains only metadata (tasks, docs, events).
                </p>
            </Card>

            {/* Import/Restore Section */}
            <Card title="Import & Restore">
                <p className="mb-4 text-sm text-neutral-600">
                    Import a backup file to restore your data. The file will be validated before restore.
                </p>
                <BackupRestorePanel />
            </Card>

            {/* Info */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <strong>⚠️ Important:</strong> Restore (Replace) will delete all existing data and replace it with the backup contents.
                Always create a backup before restoring.
            </div>
        </div>
    );
}
