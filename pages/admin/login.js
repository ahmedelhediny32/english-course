import { useState } from "react";
import { useRouter } from "next/router";
import { ArrowRight, KeyRound } from "lucide-react";
import { Btn, Card, Input } from "../../components/atoms";
import { COLORS } from "../../lib/ui";
import { adminLogin } from "../../lib/api";
import { setAdminSession } from "../../lib/session";

export default function AdminLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const ok = await adminLogin(pin);
    setBusy(false);
    if (ok) {
      setAdminSession(true);
      router.push("/admin");
    } else {
      setErr("Wrong PIN");
    }
  }

  return (
    <div style={{ background: COLORS.paper, minHeight: "100vh" }}>
      <div className="mx-auto max-w-sm px-4 pt-16">
        <button onClick={() => router.push("/")} className="mb-6 inline-flex items-center gap-1 text-sm" style={{ color: COLORS.textMuted }}><ArrowRight size={16} className="rotate-180" /> Back</button>
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <KeyRound size={18} style={{ color: COLORS.ink }} />
            <h2 className="font-semibold" style={{ color: COLORS.text }}>Teacher Login</h2>
          </div>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <Input type="password" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} autoFocus />
            {err && <p className="text-xs" style={{ color: COLORS.danger }}>{err}</p>}
            <Btn type="submit" disabled={busy}>{busy ? "Checking…" : "Log in"}</Btn>
            <p className="text-xs" style={{ color: COLORS.textMuted }}>First time? The default PIN is 1234 — you can change it from Settings after logging in.</p>
          </form>
        </Card>
      </div>
    </div>
  );
}
