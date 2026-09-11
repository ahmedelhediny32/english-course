import {
  getAdminAccount,
  getStudentByEmail,
  verifyPassword,
} from "../../../lib/db";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { role, email, password, name } = req.body || {};
  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanPassword = password || "";

  if (!cleanEmail || cleanPassword.length < 4) {
    return res.status(400).json({ ok: false, message: "Enter an email and a password with at least 4 characters" });
  }

  if (role === "teacher") {
    const account = getAdminAccount();
    const ok = cleanEmail === account.email && verifyPassword(cleanPassword, account.passwordHash);
    return res.status(200).json(ok
      ? { ok: true, user: { role: "teacher", email: account.email } }
      : { ok: false, message: "Wrong email or password" });
  }

  if (role !== "student") {
    return res.status(400).json({ ok: false, message: "Choose a user type" });
  }

  const existing = getStudentByEmail(cleanEmail);
  if (!existing || !existing.password_hash || !verifyPassword(cleanPassword, existing.password_hash)) {
    return res.status(200).json({ ok: false, message: "Wrong email or password. Ask your teacher for your account." });
  }
  return res.status(200).json({ ok: true, user: { role: "student", email: existing.email }, student: { id: existing.id, name: existing.name, email: existing.email } });
}
