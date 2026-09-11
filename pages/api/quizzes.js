import { listQuizzes, saveQuiz, deleteQuiz } from "../../lib/db";

export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json(listQuizzes());
  }
  if (req.method === "POST") {
    const { id, monthId, title, date, sections } = req.body || {};
    if (!monthId || !title || !title.trim() || !date) {
      return res.status(400).json({ error: "monthId, title and date are required" });
    }
    const quiz = saveQuiz({ id, monthId, title: title.trim(), date, sections: sections || [] });
    return res.status(200).json(quiz);
  }
  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id is required" });
    deleteQuiz(id);
    return res.status(200).json({ ok: true });
  }
  res.status(405).json({ error: "Method not allowed" });
}
