import { DatabaseSync } from "node:sqlite";
import crypto from "crypto";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "app.db");

// Reuse a single connection across hot-reloads / serverless invocations.
let db = global.__quizNotebookDb;
if (!db) {
  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  global.__quizNotebookDb = db;
}

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  pin TEXT NOT NULL,
  email TEXT,
  password_hash TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS months (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  month_id TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  sections TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS submissions (
  quiz_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  submitted_at INTEGER NOT NULL,
  status TEXT NOT NULL,
  answers TEXT NOT NULL,
  scores TEXT NOT NULL,
  total_score REAL NOT NULL DEFAULT 0,
  max_score REAL NOT NULL DEFAULT 0,
  graded_at INTEGER,
  feedback TEXT DEFAULT '',
  PRIMARY KEY (quiz_id, student_id)
);
CREATE TABLE IF NOT EXISTS recordings (
  quiz_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (quiz_id, student_id, item_id)
);
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id TEXT PRIMARY KEY,
  month_id TEXT NOT NULL,
  session_date TEXT NOT NULL,
  label TEXT DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS attendance_records (
  student_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  status TEXT NOT NULL,
  PRIMARY KEY (student_id, session_id)
);
CREATE TABLE IF NOT EXISTS student_progress (
  student_id TEXT NOT NULL,
  month_id TEXT NOT NULL,
  participation_score REAL,
  homework_score REAL,
  level TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (student_id, month_id)
);
CREATE TABLE IF NOT EXISTS session_progress (
  student_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  participation_score REAL,
  homework_score REAL,
  notes TEXT DEFAULT '',
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (student_id, session_id)
);
`);

// Add account fields when opening a database created by an older version.
try { db.exec("ALTER TABLE students ADD COLUMN email TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE students ADD COLUMN password_hash TEXT"); } catch (e) {}

// Bootstrap default admin PIN.
const existingPin = db.prepare("SELECT value FROM settings WHERE key = 'admin_pin'").get();
if (!existingPin) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('admin_pin', '1234')").run();
}
if (!db.prepare("SELECT value FROM settings WHERE key = 'admin_email'").get()) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('admin_email', 'admin@example.com')").run();
}
if (!db.prepare("SELECT value FROM settings WHERE key = 'admin_password_hash'").get()) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('admin_password_hash', ?)").run(hashPassword("1234"));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------------- settings ---------------- */
export function getAdminPin() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'admin_pin'").get();
  return row ? row.value : "1234";
}
export function getAdminAccount() {
  const email = db.prepare("SELECT value FROM settings WHERE key = 'admin_email'").get();
  const passwordHash = db.prepare("SELECT value FROM settings WHERE key = 'admin_password_hash'").get();
  return { email: email ? email.value : "admin@example.com", passwordHash: passwordHash ? passwordHash.value : hashPassword("1234") };
}
export function updateAdminAccount(email, password) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('admin_email', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(email);
  if (password) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('admin_password_hash', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(hashPassword(password));
  }
  return getAdminAccount();
}
export function setAdminPin(pin) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('admin_pin', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(pin);
}

/* ---------------- students ---------------- */
export function listStudents() {
  return db.prepare("SELECT * FROM students ORDER BY name COLLATE NOCASE").all();
}
export function listStudentsPublic() {
  // Never send PINs to the client — this is what the dashboard/data feed uses.
  return db.prepare("SELECT id, name, email, created_at FROM students ORDER BY name COLLATE NOCASE").all();
}
export function getStudentByName(name) {
  return db.prepare("SELECT * FROM students WHERE lower(trim(name)) = lower(trim(?))").get(name);
}
export function getStudentByEmail(email) {
  return db.prepare("SELECT * FROM students WHERE lower(trim(email)) = lower(trim(?))").get(email);
}
export function getStudentById(id) {
  return db.prepare("SELECT * FROM students WHERE id = ?").get(id);
}
export function createStudent(name, pin) {
  const id = uid();
  db.prepare("INSERT INTO students (id, name, pin, created_at) VALUES (?, ?, ?, ?)").run(id, name, pin, Date.now());
  return getStudentById(id);
}
export function createStudentAccount(name, email, password) {
  const id = uid();
  db.prepare("INSERT INTO students (id, name, pin, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(id, name, "", email, hashPassword(password), Date.now());
  return getStudentById(id);
}
export function setStudentPin(id, pin) {
  db.prepare("UPDATE students SET pin = ? WHERE id = ?").run(pin, id);
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, key] = stored.split(":");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(key, "hex"), Buffer.from(derived, "hex"));
}

/* ---------------- months ---------------- */
export function listMonths() {
  return db.prepare("SELECT * FROM months ORDER BY date ASC").all();
}
export function createMonth(name, date) {
  const id = uid();
  db.prepare("INSERT INTO months (id, name, date, created_at) VALUES (?, ?, ?, ?)").run(id, name, date, Date.now());
  return { id, name, date, created_at: Date.now() };
}

/* ---------------- quizzes ---------------- */
function rowToQuiz(row) {
  if (!row) return null;
  return { id: row.id, monthId: row.month_id, title: row.title, date: row.date, sections: JSON.parse(row.sections) };
}
export function listQuizzes() {
  return db.prepare("SELECT * FROM quizzes ORDER BY date ASC").all().map(rowToQuiz);
}
export function getQuiz(id) {
  return rowToQuiz(db.prepare("SELECT * FROM quizzes WHERE id = ?").get(id));
}
export function saveQuiz(quiz) {
  const id = quiz.id || uid();
  db.prepare(`
    INSERT INTO quizzes (id, month_id, title, date, sections) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET month_id = excluded.month_id, title = excluded.title, date = excluded.date, sections = excluded.sections
  `).run(id, quiz.monthId, quiz.title, quiz.date, JSON.stringify(quiz.sections || []));
  return getQuiz(id);
}
export function deleteQuiz(id) {
  db.prepare("DELETE FROM quizzes WHERE id = ?").run(id);
  db.prepare("DELETE FROM submissions WHERE quiz_id = ?").run(id);
  db.prepare("DELETE FROM recordings WHERE quiz_id = ?").run(id);
}

/* ---------------- submissions ---------------- */
function rowToSubmission(row) {
  if (!row) return null;
  return {
    quizId: row.quiz_id,
    studentId: row.student_id,
    studentName: row.student_name,
    submittedAt: row.submitted_at,
    status: row.status,
    answers: JSON.parse(row.answers),
    scores: JSON.parse(row.scores),
    totalScore: row.total_score,
    maxScore: row.max_score,
    gradedAt: row.graded_at,
    feedback: row.feedback || "",
  };
}
export function listSubmissions() {
  return db.prepare("SELECT * FROM submissions").all().map(rowToSubmission);
}
export function getSubmission(quizId, studentId) {
  return rowToSubmission(db.prepare("SELECT * FROM submissions WHERE quiz_id = ? AND student_id = ?").get(quizId, studentId));
}
export function createSubmission(sub) {
  db.prepare(`
    INSERT INTO submissions (quiz_id, student_id, student_name, submitted_at, status, answers, scores, total_score, max_score, graded_at, feedback)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(sub.quizId, sub.studentId, sub.studentName, sub.submittedAt, sub.status, JSON.stringify(sub.answers), JSON.stringify(sub.scores || {}), sub.totalScore || 0, sub.maxScore || 0, sub.gradedAt || null, sub.feedback || "");
  return getSubmission(sub.quizId, sub.studentId);
}
export function gradeSubmission(quizId, studentId, { scores, totalScore, maxScore, feedback }) {
  db.prepare(`
    UPDATE submissions SET status = 'graded', scores = ?, total_score = ?, max_score = ?, graded_at = ?, feedback = ?
    WHERE quiz_id = ? AND student_id = ?
  `).run(JSON.stringify(scores || {}), totalScore || 0, maxScore || 0, Date.now(), feedback || "", quizId, studentId);
  return getSubmission(quizId, studentId);
}

/* ---------------- recordings ---------------- */
export function saveRecording(quizId, studentId, itemId, data) {
  db.prepare(`
    INSERT INTO recordings (quiz_id, student_id, item_id, data) VALUES (?, ?, ?, ?)
    ON CONFLICT(quiz_id, student_id, item_id) DO UPDATE SET data = excluded.data
  `).run(quizId, studentId, itemId, data);
}
export function getRecording(quizId, studentId, itemId) {
  const row = db.prepare("SELECT data FROM recordings WHERE quiz_id = ? AND student_id = ? AND item_id = ?").get(quizId, studentId, itemId);
  return row ? row.data : null;
}

/* ---------------- class register / progress ---------------- */
export function listAttendanceSessions(monthId) {
  if (monthId) return db.prepare("SELECT * FROM attendance_sessions WHERE month_id = ? ORDER BY session_date ASC, created_at ASC").all(monthId);
  return db.prepare("SELECT * FROM attendance_sessions ORDER BY session_date ASC, created_at ASC").all();
}
export function createAttendanceSession(monthId, sessionDate, label) {
  const id = uid();
  db.prepare("INSERT INTO attendance_sessions (id, month_id, session_date, label, created_at) VALUES (?, ?, ?, ?, ?)").run(id, monthId, sessionDate, label || "", Date.now());
  return db.prepare("SELECT * FROM attendance_sessions WHERE id = ?").get(id);
}
export function updateAttendanceSession(id, sessionDate, label) {
  db.prepare("UPDATE attendance_sessions SET session_date = ?, label = ? WHERE id = ?").run(sessionDate, label || "", id);
  return db.prepare("SELECT * FROM attendance_sessions WHERE id = ?").get(id);
}
export function deleteAttendanceSession(id) {
  db.prepare("DELETE FROM attendance_records WHERE session_id = ?").run(id);
  db.prepare("DELETE FROM attendance_sessions WHERE id = ?").run(id);
}
export function listAttendanceRecords(monthId) {
  return db.prepare(`
    SELECT ar.student_id, ar.session_id, ar.status
    FROM attendance_records ar
    JOIN attendance_sessions s ON s.id = ar.session_id
    WHERE s.month_id = ?
  `).all(monthId);
}
export function setAttendanceRecord(studentId, sessionId, status) {
  if (!status) {
    db.prepare("DELETE FROM attendance_records WHERE student_id = ? AND session_id = ?").run(studentId, sessionId);
  } else {
    db.prepare(`
      INSERT INTO attendance_records (student_id, session_id, status) VALUES (?, ?, ?)
      ON CONFLICT(student_id, session_id) DO UPDATE SET status = excluded.status
    `).run(studentId, sessionId, status);
  }
}
export function listSessionProgress(monthId) {
  return db.prepare(`
    SELECT sp.*
    FROM session_progress sp
    JOIN attendance_sessions s ON s.id = sp.session_id
    WHERE s.month_id = ?
  `).all(monthId);
}
export function listStudentSessionProgress(studentId) {
  return db.prepare(`
    SELECT sp.*, s.month_id, s.session_date, s.label
    FROM session_progress sp
    JOIN attendance_sessions s ON s.id = sp.session_id
    WHERE sp.student_id = ?
    ORDER BY s.session_date ASC, s.created_at ASC
  `).all(studentId);
}
export function listStudentAttendance(studentId) {
  return db.prepare(`
    SELECT ar.*, s.month_id, s.session_date, s.label
    FROM attendance_records ar
    JOIN attendance_sessions s ON s.id = ar.session_id
    WHERE ar.student_id = ?
    ORDER BY s.session_date ASC, s.created_at ASC
  `).all(studentId);
}
export function listStudentMonthlyProgress(studentId) {
  return db.prepare("SELECT * FROM student_progress WHERE student_id = ? ORDER BY month_id").all(studentId);
}
export function saveSessionProgress(studentId, sessionId, { participationScore, homeworkScore, notes }) {
  db.prepare(`
    INSERT INTO session_progress (student_id, session_id, participation_score, homework_score, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(student_id, session_id) DO UPDATE SET
      participation_score = excluded.participation_score,
      homework_score = excluded.homework_score,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `).run(studentId, sessionId, participationScore === "" ? null : participationScore, homeworkScore === "" ? null : homeworkScore, notes || "", Date.now());
  return db.prepare("SELECT * FROM session_progress WHERE student_id = ? AND session_id = ?").get(studentId, sessionId);
}
export function listStudentProgress(monthId) {
  return db.prepare("SELECT * FROM student_progress WHERE month_id = ?").all(monthId);
}
export function saveStudentProgress(studentId, monthId, { participationScore, homeworkScore, level, notes }) {
  db.prepare(`
    INSERT INTO student_progress (student_id, month_id, participation_score, homework_score, level, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(student_id, month_id) DO UPDATE SET
      participation_score = excluded.participation_score,
      homework_score = excluded.homework_score,
      level = excluded.level,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `).run(studentId, monthId, participationScore === "" ? null : participationScore, homeworkScore === "" ? null : homeworkScore, level || "", notes || "", Date.now());
  return db.prepare("SELECT * FROM student_progress WHERE student_id = ? AND month_id = ?").get(studentId, monthId);
}

/* ---------------- aggregate ---------------- */
export function loadAll() {
  return {
    months: listMonths(),
    quizzes: listQuizzes(),
    students: listStudentsPublic(),
    submissions: listSubmissions(),
  };
}
