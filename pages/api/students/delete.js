import { deleteStudent } from "../../../lib/db";
import { verifyAdminToken } from "../../../lib/admin-token";

export default async function handler(req, res) {
  if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!verifyAdminToken(token)) return res.status(401).json({ error: "Your teacher session expired. Sign in again." });

  const studentId = String((req.body && req.body.studentId) || "").trim();
  if (!studentId) return res.status(400).json({ error: "studentId is required" });

  try {
    const deleted = await deleteStudent(studentId);
    if (!deleted) return res.status(404).json({ error: "Student not found" });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not delete student data" });
  }
}