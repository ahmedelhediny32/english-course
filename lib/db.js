import crypto from "crypto";
import { neon } from "@neondatabase/serverless";

let schemaPromise;

function client() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  return neon(process.env.DATABASE_URL);
}

async function query(text, params = []) {
  await ensureDatabase();
  return client().query(text, params);
}

export async function ensureDatabase() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const sql = client();
      const statements = [
        `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
        `CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, name TEXT NOT NULL, pin TEXT NOT NULL DEFAULT '', email TEXT, password_hash TEXT, created_at BIGINT NOT NULL)`,
        `CREATE TABLE IF NOT EXISTS months (id TEXT PRIMARY KEY, name TEXT NOT NULL, date TEXT NOT NULL, created_at BIGINT NOT NULL)`,
        `CREATE TABLE IF NOT EXISTS quizzes (id TEXT PRIMARY KEY, month_id TEXT NOT NULL, title TEXT NOT NULL, date TEXT NOT NULL, sections TEXT NOT NULL)`,
        `CREATE TABLE IF NOT EXISTS submissions (quiz_id TEXT NOT NULL, student_id TEXT NOT NULL, student_name TEXT NOT NULL, submitted_at BIGINT NOT NULL, status TEXT NOT NULL, answers TEXT NOT NULL, scores TEXT NOT NULL, total_score DOUBLE PRECISION NOT NULL DEFAULT 0, max_score DOUBLE PRECISION NOT NULL DEFAULT 0, graded_at BIGINT, feedback TEXT DEFAULT '', PRIMARY KEY (quiz_id, student_id))`,
        `CREATE TABLE IF NOT EXISTS recordings (quiz_id TEXT NOT NULL, student_id TEXT NOT NULL, item_id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (quiz_id, student_id, item_id))`,
        `CREATE TABLE IF NOT EXISTS attendance_sessions (id TEXT PRIMARY KEY, month_id TEXT NOT NULL, session_date TEXT NOT NULL, label TEXT DEFAULT '', created_at BIGINT NOT NULL)`,
        `CREATE TABLE IF NOT EXISTS attendance_records (student_id TEXT NOT NULL, session_id TEXT NOT NULL, status TEXT NOT NULL, PRIMARY KEY (student_id, session_id))`,
        `CREATE TABLE IF NOT EXISTS student_progress (student_id TEXT NOT NULL, month_id TEXT NOT NULL, participation_score DOUBLE PRECISION, homework_score DOUBLE PRECISION, level TEXT DEFAULT '', notes TEXT DEFAULT '', updated_at BIGINT NOT NULL, PRIMARY KEY (student_id, month_id))`,
        `CREATE TABLE IF NOT EXISTS session_progress (student_id TEXT NOT NULL, session_id TEXT NOT NULL, participation_score DOUBLE PRECISION, homework_score DOUBLE PRECISION, notes TEXT DEFAULT '', updated_at BIGINT NOT NULL, PRIMARY KEY (student_id, session_id))`,
      ];
      for (const statement of statements) await sql.query(statement);
      await sql.query("INSERT INTO settings (key, value) VALUES ('admin_pin', '1234') ON CONFLICT (key) DO NOTHING");
      await sql.query("INSERT INTO settings (key, value) VALUES ('admin_email', $1) ON CONFLICT (key) DO NOTHING", [(process.env.ADMIN_EMAIL || "ahmedelhediny448@gmail.com").trim().toLowerCase()]);
      if (process.env.ADMIN_PASSWORD) {
        await sql.query("INSERT INTO settings (key, value) VALUES ('admin_password_hash', $1) ON CONFLICT (key) DO NOTHING", [hashPassword(process.env.ADMIN_PASSWORD)]);
      }
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function numberFields(row, fields) {
  if (!row) return row;
  for (const field of fields) if (row[field] != null) row[field] = Number(row[field]);
  return row;
}

function rowToQuiz(row) {
  if (!row) return null;
  return { id: row.id, monthId: row.month_id, title: row.title, date: row.date, sections: typeof row.sections === "string" ? JSON.parse(row.sections) : row.sections || [] };
}

function rowToSubmission(row) {
  if (!row) return null;
  return {
    quizId: row.quiz_id,
    studentId: row.student_id,
    studentName: row.student_name,
    submittedAt: Number(row.submitted_at),
    status: row.status,
    answers: typeof row.answers === "string" ? JSON.parse(row.answers) : row.answers || {},
    scores: typeof row.scores === "string" ? JSON.parse(row.scores) : row.scores || {},
    totalScore: Number(row.total_score || 0),
    maxScore: Number(row.max_score || 0),
    gradedAt: row.graded_at == null ? null : Number(row.graded_at),
    feedback: row.feedback || "",
  };
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, key] = stored.split(":");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  const expected = Buffer.from(key, "hex");
  const actual = Buffer.from(derived, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export async function getAdminPin() {
  const [row] = await query("SELECT value FROM settings WHERE key = 'admin_pin'");
  return row ? row.value : "1234";
}

export async function getAdminAccount() {
  const rows = await query("SELECT key, value FROM settings WHERE key IN ('admin_email', 'admin_password_hash')");
  const settings = Object.fromEntries(rows.map(({ key, value }) => [key, value]));
  return { email: (settings.admin_email || process.env.ADMIN_EMAIL || "ahmedelhediny448@gmail.com").trim().toLowerCase(), passwordHash: settings.admin_password_hash || "" };
}

export async function updateAdminAccount(email, password) {
  await query("INSERT INTO settings (key, value) VALUES ('admin_email', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [email.trim().toLowerCase()]);
  if (password) await query("INSERT INTO settings (key, value) VALUES ('admin_password_hash', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [hashPassword(password)]);
  return getAdminAccount();
}

export async function setAdminPin(pin) {
  await query("INSERT INTO settings (key, value) VALUES ('admin_pin', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [String(pin)]);
}

export async function listStudents() {
  return (await query("SELECT * FROM students ORDER BY lower(name)" )).map((row) => numberFields(row, ["created_at"]));
}

export async function listStudentsPublic() {
  return (await query("SELECT id, name, email, created_at FROM students ORDER BY lower(name)" )).map((row) => numberFields(row, ["created_at"]));
}

export async function getStudentByName(name) {
  const [row] = await query("SELECT * FROM students WHERE lower(trim(name)) = lower(trim($1))", [name]);
  return numberFields(row, ["created_at"]);
}

export async function getStudentByEmail(email) {
  const [row] = await query("SELECT * FROM students WHERE lower(trim(email)) = lower(trim($1))", [email]);
  return numberFields(row, ["created_at"]);
}

export async function getStudentById(id) {
  const [row] = await query("SELECT * FROM students WHERE id = $1", [id]);
  return numberFields(row, ["created_at"]);
}

export async function createStudent(name, pin) {
  const id = uid();
  await query("INSERT INTO students (id, name, pin, created_at) VALUES ($1, $2, $3, $4)", [id, name, pin, Date.now()]);
  return getStudentById(id);
}

export async function createStudentAccount(name, email, password) {
  const id = uid();
  await query("INSERT INTO students (id, name, pin, email, password_hash, created_at) VALUES ($1, $2, '', $3, $4, $5)", [id, name, email.trim().toLowerCase(), hashPassword(password), Date.now()]);
  return getStudentById(id);
}

export async function setStudentPin(id, pin) {
  await query("UPDATE students SET pin = $1 WHERE id = $2", [String(pin), id]);
}

export async function deleteStudent(id) {
  const rows = await query(`WITH deleted_submissions AS (
      DELETE FROM submissions WHERE student_id = $1 RETURNING student_id
    ), deleted_recordings AS (
      DELETE FROM recordings WHERE student_id = $1 RETURNING student_id
    ), deleted_attendance AS (
      DELETE FROM attendance_records WHERE student_id = $1 RETURNING student_id
    ), deleted_monthly_progress AS (
      DELETE FROM student_progress WHERE student_id = $1 RETURNING student_id
    ), deleted_session_progress AS (
      DELETE FROM session_progress WHERE student_id = $1 RETURNING student_id
    )
    DELETE FROM students WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}

export async function listMonths() {
  return (await query("SELECT * FROM months ORDER BY date ASC")).map((row) => numberFields(row, ["created_at"]));
}

export async function createMonth(name, date) {
  const id = uid();
  const createdAt = Date.now();
  await query("INSERT INTO months (id, name, date, created_at) VALUES ($1, $2, $3, $4)", [id, name, date, createdAt]);
  return { id, name, date, created_at: createdAt };
}

export async function listQuizzes() {
  return (await query("SELECT * FROM quizzes ORDER BY date ASC")).map(rowToQuiz);
}

export async function getQuiz(id) {
  const [row] = await query("SELECT * FROM quizzes WHERE id = $1", [id]);
  return rowToQuiz(row);
}

export async function saveQuiz(quiz) {
  const id = quiz.id || uid();
  await query(`INSERT INTO quizzes (id, month_id, title, date, sections) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (id) DO UPDATE SET month_id = EXCLUDED.month_id, title = EXCLUDED.title, date = EXCLUDED.date, sections = EXCLUDED.sections`, [id, quiz.monthId, quiz.title, quiz.date, JSON.stringify(quiz.sections || [])]);
  return getQuiz(id);
}

export async function deleteQuiz(id) {
  await query("DELETE FROM submissions WHERE quiz_id = $1", [id]);
  await query("DELETE FROM recordings WHERE quiz_id = $1", [id]);
  await query("DELETE FROM quizzes WHERE id = $1", [id]);
}

export async function listSubmissions() {
  return (await query("SELECT * FROM submissions")).map(rowToSubmission);
}

export async function getSubmission(quizId, studentId) {
  const [row] = await query("SELECT * FROM submissions WHERE quiz_id = $1 AND student_id = $2", [quizId, studentId]);
  return rowToSubmission(row);
}

export async function createSubmission(sub) {
  await query(`INSERT INTO submissions (quiz_id, student_id, student_name, submitted_at, status, answers, scores, total_score, max_score, graded_at, feedback)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (quiz_id, student_id) DO NOTHING`, [sub.quizId, sub.studentId, sub.studentName, sub.submittedAt, sub.status, JSON.stringify(sub.answers || {}), JSON.stringify(sub.scores || {}), sub.totalScore || 0, sub.maxScore || 0, sub.gradedAt || null, sub.feedback || ""]);
  return getSubmission(sub.quizId, sub.studentId);
}

export async function gradeSubmission(quizId, studentId, { scores, totalScore, maxScore, feedback }) {
  await query(`UPDATE submissions SET status = 'graded', scores = $1, total_score = $2, max_score = $3, graded_at = $4, feedback = $5
    WHERE quiz_id = $6 AND student_id = $7`, [JSON.stringify(scores || {}), totalScore || 0, maxScore || 0, Date.now(), feedback || "", quizId, studentId]);
  return getSubmission(quizId, studentId);
}

export async function saveRecording(quizId, studentId, itemId, data) {
  await query(`INSERT INTO recordings (quiz_id, student_id, item_id, data) VALUES ($1, $2, $3, $4)
    ON CONFLICT (quiz_id, student_id, item_id) DO UPDATE SET data = EXCLUDED.data`, [quizId, studentId, itemId, data]);
}

export async function getRecording(quizId, studentId, itemId) {
  const [row] = await query("SELECT data FROM recordings WHERE quiz_id = $1 AND student_id = $2 AND item_id = $3", [quizId, studentId, itemId]);
  return row ? row.data : null;
}

export async function listAttendanceSessions(monthId) {
  const rows = monthId
    ? await query("SELECT * FROM attendance_sessions WHERE month_id = $1 ORDER BY session_date ASC, created_at ASC", [monthId])
    : await query("SELECT * FROM attendance_sessions ORDER BY session_date ASC, created_at ASC");
  return rows.map((row) => numberFields(row, ["created_at"]));
}

export async function createAttendanceSession(monthId, sessionDate, label) {
  const id = uid();
  await query("INSERT INTO attendance_sessions (id, month_id, session_date, label, created_at) VALUES ($1, $2, $3, $4, $5)", [id, monthId, sessionDate, label || "", Date.now()]);
  const [row] = await query("SELECT * FROM attendance_sessions WHERE id = $1", [id]);
  return numberFields(row, ["created_at"]);
}

export async function updateAttendanceSession(id, sessionDate, label) {
  await query("UPDATE attendance_sessions SET session_date = $1, label = $2 WHERE id = $3", [sessionDate, label || "", id]);
  const [row] = await query("SELECT * FROM attendance_sessions WHERE id = $1", [id]);
  return numberFields(row, ["created_at"]);
}

export async function deleteAttendanceSession(id) {
  await query("DELETE FROM attendance_records WHERE session_id = $1", [id]);
  await query("DELETE FROM session_progress WHERE session_id = $1", [id]);
  await query("DELETE FROM attendance_sessions WHERE id = $1", [id]);
}

export async function listAttendanceRecords(monthId) {
  return query(`SELECT ar.student_id, ar.session_id, ar.status FROM attendance_records ar
    JOIN attendance_sessions s ON s.id = ar.session_id WHERE s.month_id = $1`, [monthId]);
}

export async function setAttendanceRecord(studentId, sessionId, status) {
  if (!status) return query("DELETE FROM attendance_records WHERE student_id = $1 AND session_id = $2", [studentId, sessionId]);
  await query(`INSERT INTO attendance_records (student_id, session_id, status) VALUES ($1, $2, $3)
    ON CONFLICT (student_id, session_id) DO UPDATE SET status = EXCLUDED.status`, [studentId, sessionId, status]);
}

export async function listSessionProgress(monthId) {
  return query(`SELECT sp.* FROM session_progress sp JOIN attendance_sessions s ON s.id = sp.session_id WHERE s.month_id = $1`, [monthId]);
}

export async function listStudentSessionProgress(studentId) {
  return (await query(`SELECT sp.*, s.month_id, s.session_date, s.label FROM session_progress sp
    JOIN attendance_sessions s ON s.id = sp.session_id WHERE sp.student_id = $1 ORDER BY s.session_date ASC, s.created_at ASC`, [studentId]))
    .map((row) => numberFields(row, ["participation_score", "homework_score", "updated_at"]));
}

export async function listStudentAttendance(studentId) {
  return (await query(`SELECT ar.*, s.month_id, s.session_date, s.label, s.created_at FROM attendance_records ar
    JOIN attendance_sessions s ON s.id = ar.session_id WHERE ar.student_id = $1 ORDER BY s.session_date ASC, s.created_at ASC`, [studentId]))
    .map((row) => numberFields(row, ["created_at"]));
}

export async function listStudentMonthlyProgress(studentId) {
  return (await query("SELECT * FROM student_progress WHERE student_id = $1 ORDER BY month_id", [studentId]))
    .map((row) => numberFields(row, ["participation_score", "homework_score", "updated_at"]));
}

function nullableNumber(value) {
  return value === "" || value == null ? null : Number(value);
}

export async function saveSessionProgress(studentId, sessionId, { participationScore, homeworkScore, notes }) {
  await query(`INSERT INTO session_progress (student_id, session_id, participation_score, homework_score, notes, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (student_id, session_id) DO UPDATE SET
    participation_score = EXCLUDED.participation_score, homework_score = EXCLUDED.homework_score,
    notes = EXCLUDED.notes, updated_at = EXCLUDED.updated_at`, [studentId, sessionId, nullableNumber(participationScore), nullableNumber(homeworkScore), notes || "", Date.now()]);
  const [row] = await query("SELECT * FROM session_progress WHERE student_id = $1 AND session_id = $2", [studentId, sessionId]);
  return numberFields(row, ["participation_score", "homework_score", "updated_at"]);
}

export async function listStudentProgress(monthId) {
  return (await query("SELECT * FROM student_progress WHERE month_id = $1", [monthId]))
    .map((row) => numberFields(row, ["participation_score", "homework_score", "updated_at"]));
}

export async function saveStudentProgress(studentId, monthId, { participationScore, homeworkScore, level, notes }) {
  await query(`INSERT INTO student_progress (student_id, month_id, participation_score, homework_score, level, notes, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (student_id, month_id) DO UPDATE SET
    participation_score = EXCLUDED.participation_score, homework_score = EXCLUDED.homework_score,
    level = EXCLUDED.level, notes = EXCLUDED.notes, updated_at = EXCLUDED.updated_at`, [studentId, monthId, nullableNumber(participationScore), nullableNumber(homeworkScore), level || "", notes || "", Date.now()]);
  const [row] = await query("SELECT * FROM student_progress WHERE student_id = $1 AND month_id = $2", [studentId, monthId]);
  return numberFields(row, ["participation_score", "homework_score", "updated_at"]);
}

export async function loadAll() {
  const [months, quizzes, students, submissions] = await Promise.all([listMonths(), listQuizzes(), listStudentsPublic(), listSubmissions()]);
  return { months, quizzes, students, submissions };
}

export async function importSnapshot(snapshot) {
  await ensureDatabase();
  const tables = ["settings", "students", "months", "quizzes", "submissions", "recordings", "attendance_sessions", "attendance_records", "student_progress", "session_progress"];
  const primaryKeys = {
    settings: ["key"], students: ["id"], months: ["id"], quizzes: ["id"],
    submissions: ["quiz_id", "student_id"], recordings: ["quiz_id", "student_id", "item_id"],
    attendance_sessions: ["id"], attendance_records: ["student_id", "session_id"],
    student_progress: ["student_id", "month_id"], session_progress: ["student_id", "session_id"],
  };
  for (const table of tables) {
    for (const row of snapshot[table] || []) {
      const columns = Object.keys(row);
      const values = columns.map((column) => row[column]);
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
      const updates = columns.filter((column) => !primaryKeys[table].includes(column)).map((column) => `${column} = EXCLUDED.${column}`).join(", ");
      const conflict = updates ? `DO UPDATE SET ${updates}` : "DO NOTHING";
      await client().query(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT (${primaryKeys[table].join(", ")}) ${conflict}`, values);
    }
  }
}
