import { createStudentAccount, getStudentByEmail } from "../../../lib/db";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { name, email, password } = req.body || {};
  const cleanName = (name || "").trim();
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanName || !cleanEmail || !cleanEmail.includes("@") || typeof password !== "string" || password.length < 4) {
    return res.status(400).json({ ok: false, error: "Name, valid email, and a password of at least 4 characters are required" });
  }
  if (getStudentByEmail(cleanEmail)) return res.status(409).json({ ok: false, error: "This email is already registered" });
  const student = createStudentAccount(cleanName, cleanEmail, password);
  res.status(200).json({ ok: true, student: { id: student.id, name: student.name, email: student.email } });
}