import { DatabaseSync } from "node:sqlite";
import nextEnv from "@next/env";
import { ensureDatabase, importSnapshot } from "../lib/db.js";

nextEnv.loadEnvConfig(process.cwd());

const sourcePath = process.argv[2] || "data/app.db";
const source = new DatabaseSync(sourcePath, { readOnly: true });
const tables = [
  "settings",
  "students",
  "months",
  "quizzes",
  "submissions",
  "recordings",
  "attendance_sessions",
  "attendance_records",
  "student_progress",
  "session_progress",
];
const snapshot = {};

for (const table of tables) {
  snapshot[table] = source.prepare(`SELECT * FROM ${table}`).all();
}

snapshot.settings = snapshot.settings.filter(({ key }) => key !== "admin_email" && key !== "admin_password_hash");
await ensureDatabase();
await importSnapshot(snapshot);

const summary = Object.fromEntries(tables.map((table) => [table, snapshot[table].length]));
console.log("SQLite data imported into Neon:", summary);
source.close();
