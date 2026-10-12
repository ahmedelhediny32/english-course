import { gradeSubmission, getSubmission } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { quizId, studentId, scores, totalScore, maxScore, feedback } = req.body || {};
  if (!quizId || !studentId) return res.status(400).json({ error: "quizId and studentId are required" });
  if (!await getSubmission(quizId, studentId)) return res.status(404).json({ error: "Submission not found" });

  const updated = await gradeSubmission(quizId, studentId, { scores, totalScore, maxScore, feedback });
  res.status(200).json(updated);
}
