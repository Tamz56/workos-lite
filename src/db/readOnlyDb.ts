import Database from "better-sqlite3";
import { resolveWorkosDbPath } from "@/db/dbPath";

export function openReadOnlyWorkosDatabase(
    cwd = process.cwd(),
    override = process.env.WORKOS_DB_PATH,
): Database.Database {
    const dbPath = resolveWorkosDbPath(cwd, override);
    return new Database(dbPath, {
        readonly: true,
        fileMustExist: true,
    });
}
