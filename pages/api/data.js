import { loadAll } from "../../lib/db";

export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    res.status(200).json(loadAll());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load data" });
  }
}
