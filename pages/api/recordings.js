import { saveRecording, getRecording } from "../../lib/db";

export const config = {
  api: {
    bodyParser: { sizeLimit: "15mb" }, // audio as base64 can be a few MB per clip
  },
};

export default function handler(req, res) {
  if (req.method === "GET") {
    const { quizId, studentId, itemId } = req.query;
    if (!quizId || !studentId || !itemId) return res.status(400).json({ error: "quizId, studentId, itemId required" });
    const data = getRecording(quizId, studentId, itemId);
    return res.status(200).json({ data });
  }
  if (req.method === "POST") {
    const { quizId, studentId, itemId, data } = req.body || {};
    if (!quizId || !studentId || !itemId || !data) return res.status(400).json({ error: "quizId, studentId, itemId, data required" });
    saveRecording(quizId, studentId, itemId, data);
    return res.status(200).json({ ok: true });
  }
  res.status(405).json({ error: "Method not allowed" });
}
