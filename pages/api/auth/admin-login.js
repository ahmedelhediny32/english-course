import { getAdminAccount, getAdminPin } from "../../../lib/db";
import { createAdminToken } from "../../../lib/admin-token";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { pin } = req.body || {};
  const ok = typeof pin === "string" && pin === await getAdminPin();
  if (!ok) return res.status(200).json({ ok: false });
  const account = await getAdminAccount();
  return res.status(200).json({ ok: true, user: { role: "teacher", email: account.email, adminToken: createAdminToken(account.email) } });
}
