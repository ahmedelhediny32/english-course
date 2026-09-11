import { listMonths, createMonth } from "../../lib/db";

export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json(listMonths());
  }
  if (req.method === "POST") {
    const { name, date } = req.body || {};
    if (!name || !name.trim() || !date) return res.status(400).json({ error: "name and date are required" });
    const month = createMonth(name.trim(), date);
    return res.status(200).json(month);
  }
  res.status(405).json({ error: "Method not allowed" });
}
