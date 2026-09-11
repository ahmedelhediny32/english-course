import {
  listAttendanceSessions,
  createAttendanceSession,
  updateAttendanceSession,
  deleteAttendanceSession,
  listAttendanceRecords,
  setAttendanceRecord,
  listStudentProgress,
  saveStudentProgress,
  listSessionProgress,
  saveSessionProgress,
  listStudentSessionProgress,
  listStudentAttendance,
  listStudentMonthlyProgress,
} from "../../lib/db";

export default function handler(req, res) {
  try {
    if (req.method === "GET") {
      const studentId = String(req.query.studentId || "");
      if (studentId) {
        return res.status(200).json({
          attendance: listStudentAttendance(studentId),
          sessionProgress: listStudentSessionProgress(studentId),
          progress: listStudentMonthlyProgress(studentId),
        });
      }
      const monthId = String(req.query.monthId || "");
      if (!monthId) return res.status(400).json({ error: "monthId is required" });
      return res.status(200).json({
        sessions: listAttendanceSessions(monthId),
        attendance: listAttendanceRecords(monthId),
        progress: listStudentProgress(monthId),
        sessionProgress: listSessionProgress(monthId),
      });
    }

    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const { kind } = req.body || {};

    if (kind === "session") {
      const { id, monthId, sessionDate, label } = req.body;
      if (!monthId || !sessionDate) return res.status(400).json({ error: "monthId and sessionDate are required" });
      const session = id
        ? updateAttendanceSession(id, sessionDate, label)
        : createAttendanceSession(monthId, sessionDate, label);
      return res.status(200).json({ ok: true, session });
    }

    if (kind === "delete-session") {
      if (!req.body.sessionId) return res.status(400).json({ error: "sessionId is required" });
      deleteAttendanceSession(req.body.sessionId);
      return res.status(200).json({ ok: true });
    }

    if (kind === "attendance") {
      const { studentId, sessionId, status } = req.body;
      if (!studentId || !sessionId || !["present", "absent", "late", "excused", ""].includes(status)) {
        return res.status(400).json({ error: "studentId, sessionId, and a valid status are required" });
      }
      setAttendanceRecord(studentId, sessionId, status);
      return res.status(200).json({ ok: true });
    }

    if (kind === "student") {
      const { studentId, monthId, participationScore, homeworkScore, level, notes } = req.body;
      if (!studentId || !monthId) return res.status(400).json({ error: "studentId and monthId are required" });
      const progress = saveStudentProgress(studentId, monthId, { participationScore, homeworkScore, level, notes });
      return res.status(200).json({ ok: true, progress });
    }

    if (kind === "session-student") {
      const { studentId, sessionId, participationScore, homeworkScore, notes } = req.body;
      if (!studentId || !sessionId) return res.status(400).json({ error: "studentId and sessionId are required" });
      const progress = saveSessionProgress(studentId, sessionId, { participationScore, homeworkScore, notes });
      return res.status(200).json({ ok: true, progress });
    }

    return res.status(400).json({ error: "Unknown progress operation" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to update progress" });
  }
}
