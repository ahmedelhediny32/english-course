import { setStudentPin, getStudentById } from "../../../lib/db";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { studentId, pin } = req.body || {};
  if (!studentId || typeof pin !== "string" || pin.trim().length < 4) {
    return res.status(400).json({ error: "studentId and a PIN of at least 4 digits are required" });
  }
  if (!getStudentById(studentId)) return res.status(404).json({ error: "Student not found" });
  setStudentPin(studentId, pin.trim());
  res.status(200).json({ ok: true });
}
