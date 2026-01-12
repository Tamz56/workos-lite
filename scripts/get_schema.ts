
import { db } from "../src/db/db";

const info = db.prepare("PRAGMA table_info(tasks)").all();
console.table(info);
console.log(JSON.stringify(info, null, 2));
