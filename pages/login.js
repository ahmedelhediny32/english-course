import { useState } from "react";
import { useRouter } from "next/router";
import { ArrowRight, BookOpen, GraduationCap, Settings } from "lucide-react";
import { Btn, Card, Input } from "../components/atoms";
import { loginAccount } from "../lib/api";
import { setAdminSession, setStudentSession, setUserSession } from "../lib/session";
import { COLORS } from "../lib/ui";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result = await loginAccount(role, email, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.message || "Could not log in");
      return;
    }
    setUserSession(result.user);
    if (role === "teacher") {
      setAdminSession(true);
      router.push("/admin");
    } else {
      setStudentSession(result.student);
      router.push("/student");
    }
  }

  return (
    <div className="login-page" style={{ background: COLORS.paper, minHeight: "100vh" }}>
      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-5 py-8 sm:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="hidden lg:block"><button onClick={() => router.push("/")} className="mb-12 inline-flex items-center gap-1 text-sm" style={{ color: COLORS.textMuted }}><ArrowRight size={16} className="rotate-180" /> Back</button><div className="brand-mark mb-5"><BookOpen size={20} color="#fff" /></div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: COLORS.success }}>Welcome back</p><h1 className="max-w-md text-5xl font-semibold leading-tight" style={{ color: COLORS.text }}>Pick up where your class left off.</h1><p className="mt-5 max-w-md text-sm leading-7" style={{ color: COLORS.textMuted }}>Use the account provided by your teacher to access quizzes, class progress, and feedback.</p></div>
          <div className="mx-auto w-full max-w-md"><button onClick={() => router.push("/")} className="mb-5 inline-flex items-center gap-1 text-sm lg:hidden" style={{ color: COLORS.textMuted }}><ArrowRight size={16} className="rotate-180" /> Back</button><Card className="login-card">
          <div className="mb-6 flex items-center gap-3"><div className="brand-mark small"><BookOpen size={17} color="#fff" /></div><div><h2 className="font-semibold" style={{ color: COLORS.text }}>Sign in to Quiz Notebook</h2><p className="text-xs" style={{ color: COLORS.textMuted }}>Use your workspace account</p></div></div>
          <div className="mb-5 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setRole("student")} className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: role === "student" ? COLORS.ink : COLORS.border, background: role === "student" ? COLORS.successSoft : COLORS.surface, color: COLORS.text }}><GraduationCap size={16} /> Student</button>
            <button type="button" onClick={() => setRole("teacher")} className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: role === "teacher" ? COLORS.ink : COLORS.border, background: role === "teacher" ? COLORS.goldSoft : COLORS.surface, color: COLORS.text }}><Settings size={16} /> Teacher</button>
          </div>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div><label className="mb-1 block text-xs" style={{ color: COLORS.textMuted }}>Email</label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></div>
            <div><label className="mb-1 block text-xs" style={{ color: COLORS.textMuted }}>Password</label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            {error && <p className="text-xs" style={{ color: COLORS.danger }}>{error}</p>}
            <Btn type="submit" disabled={busy}>{busy ? "Checking…" : "Log in"}</Btn>
            {role === "student" && <p className="text-xs" style={{ color: COLORS.textMuted }}>Use the email and password given to you by your teacher.</p>}
            {role === "teacher" && <p className="text-xs" style={{ color: COLORS.textMuted }}>Use your teacher account credentials.</p>}
          </form>
          </Card></div>
        </div>
      </div>
    </div>
  );
}