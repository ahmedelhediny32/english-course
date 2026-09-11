import { createSubmission, getSubmission } from "../../../lib/db";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { quizId, studentId, studentName, answers, maxScore } = req.body || {};
  if (!quizId || !studentId || !answers) return res.status(400).json({ error: "quizId, studentId and answers are required" });

  if (getSubmission(quizId, studentId)) {
    return res.status(409).json({ error: "This quiz was already submitted" });
  }

  const submission = createSubmission({
    quizId, studentId, studentName: studentName || "",
    submittedAt: Date.now(), status: "submitted",
    answers, scores: {}, totalScore: 0, maxScore: maxScore || 0,
    gradedAt: null, feedback: "",
  });
  res.status(200).json(submission);
}
