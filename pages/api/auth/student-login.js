import { getStudentByName, createStudent } from "../../../lib/db";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { name, pin } = req.body || {};
  const cleanName = (name || "").trim();
  const cleanPin = (pin || "").trim();
  if (!cleanName || cleanPin.length < 4) {
    return res.status(400).json({ ok: false, reason: "invalid", message: "Enter a name and a PIN with at least 4 digits" });
  }

  const existing = getStudentByName(cleanName);
  if (existing) {
    if (existing.pin === cleanPin) {
      return res.status(200).json({ ok: true, student: { id: existing.id, name: existing.name } });
    }
    return res.status(409).json({ ok: false, reason: "wrong_pin", message: "That name is already registered with a different PIN. Ask your teacher to reset it." });
  }

  const created = createStudent(cleanName, cleanPin);
  res.status(200).json({ ok: true, student: { id: created.id, name: created.name } });
}
