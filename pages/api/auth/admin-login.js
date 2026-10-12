import { getAdminPin } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { pin } = req.body || {};
  const ok = typeof pin === "string" && pin === await getAdminPin();
  res.status(200).json({ ok });
}
