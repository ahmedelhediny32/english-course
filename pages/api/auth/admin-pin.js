import { getAdminAccount, setAdminPin, updateAdminAccount } from "../../../lib/db";

// Note: this intentionally never exposes the current PIN over the network —
// only lets the admin dashboard set a new one. Anyone could call this API
// directly (there's no real session system here), so treat it the same way
// as the rest of this app's security: fine for a private class tool, not a
// public site.
export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { pin, email, password } = req.body || {};
  if (email || password) {
    const cleanEmail = (email || getAdminAccount().email).trim().toLowerCase();
    if (!cleanEmail.includes("@") || (password && password.length < 4)) {
      return res.status(400).json({ error: "Enter a valid email and a password of at least 4 characters" });
    }
    updateAdminAccount(cleanEmail, password || "");
    return res.status(200).json({ ok: true });
  }
  if (typeof pin !== "string" || pin.trim().length < 4) {
    return res.status(400).json({ error: "PIN must be at least 4 digits" });
  }
  setAdminPin(pin.trim());
  res.status(200).json({ ok: true, pin: pin.trim() });
}
