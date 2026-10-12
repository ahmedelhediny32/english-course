import { loadAll } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    res.status(200).json(await loadAll());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load data" });
  }
}
