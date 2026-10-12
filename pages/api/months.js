import { listMonths, createMonth, deleteMonth } from "../../lib/db";
import { verifyAdminToken } from "../../lib/admin-token";

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json(await listMonths());
  }
  if (req.method === "POST") {
    const { name, date } = req.body || {};
    if (!name || !name.trim() || !date) return res.status(400).json({ error: "name and date are required" });
    const month = await createMonth(name.trim(), date);
    return res.status(200).json(month);
  }
  if (req.method === "DELETE") {
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!verifyAdminToken(token)) return res.status(401).json({ error: "Your teacher session expired. Sign in again." });
    const id = String((req.body && req.body.id) || req.query.id || "").trim();
    if (!id) return res.status(400).json({ error: "Month id is required" });
    try {
      const deleted = await deleteMonth(id);
      if (!deleted) return res.status(404).json({ error: "Month not found" });
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Could not delete month data" });
    }
  }
  res.status(405).json({ error: "Method not allowed" });
}
