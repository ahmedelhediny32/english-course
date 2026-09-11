import { useState } from "react";
import { useRouter } from "next/router";
import { ArrowRight, GraduationCap } from "lucide-react";
import { Btn, Card, Input } from "../../components/atoms";
import { COLORS } from "../../lib/ui";
import { studentLogin } from "../../lib/api";
import { setStudentSession } from "../../lib/session";

export default function StudentLoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!name.trim() || pin.trim().length < 4) {
      setErr("Enter your name and a PIN with at least 4 digits");
      return;
    }
    setBusy(true);
    const res = await studentLogin(name.trim(), pin.trim());
    setBusy(false);
    if (res.ok) {
      setStudentSession(res.student);
      router.push("/student");
    } else {
      setErr(res.message || "Something went wrong");
    }
  }

  return (
    <div style={{ background: COLORS.paper, minHeight: "100vh" }}>
      <div className="mx-auto max-w-sm px-4 pt-16">
        <button onClick={() => router.push("/")} className="mb-6 inline-flex items-center gap-1 text-sm" style={{ color: COLORS.textMuted }}><ArrowRight size={16} className="rotate-180" /> Back</button>
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <GraduationCap size={18} style={{ color: COLORS.ink }} />
            <h2 className="font-semibold" style={{ color: COLORS.text }}>Student Login</h2>
          </div>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs" style={{ color: COLORS.textMuted }}>Full name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="mb-1 block text-xs" style={{ color: COLORS.textMuted }}>PIN (4 digits) — pick one the first time and remember it</label>
              <Input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} />
            </div>
            {err && <p className="text-xs" style={{ color: COLORS.danger }}>{err}</p>}
            <Btn type="submit" disabled={busy}>{busy ? "Checking…" : "Log in"}</Btn>
          </form>
        </Card>
      </div>
    </div>
  );
}
