import { useRouter } from "next/router";
import { ArrowUpRight, BookOpen, CheckCircle2, LogIn } from "lucide-react";
import { COLORS } from "../lib/ui";

export default function Home() {
  const router = useRouter();
  return (
    <div className="home-page" style={{ background: COLORS.paper, minHeight: "100vh" }}>
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="brand-mark"><BookOpen size={19} color="#fff" /></div><div><p className="text-sm font-semibold" style={{ color: COLORS.text }}>Quiz Notebook</p><p className="text-xs" style={{ color: COLORS.textMuted }}>English learning workspace</p></div></div>
          <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: COLORS.successSoft, color: COLORS.success }}>English course</span>
        </header>
        <main className="home-grid flex flex-1 items-center justify-center py-14">
          <section className="home-intro max-w-3xl text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: COLORS.success }}>Learn · practise · progress</p>
            <h1 className="home-title mb-5 text-4xl font-semibold leading-tight sm:text-6xl" style={{ color: COLORS.text }}>Every lesson, <em>tracked</em> with care.</h1>
            <p className="mx-auto mb-8 max-w-2xl text-base leading-7" style={{ color: COLORS.textMuted }}>One calm place for English quizzes, classroom sessions, feedback, and the small signs of progress that matter.</p>
            <button onClick={() => router.push("/login")} className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-semibold shadow-sm transition-transform hover:-translate-y-0.5" style={{ background: COLORS.ink, color: "#fff" }}><LogIn size={17} /> Enter workspace <ArrowUpRight size={16} /></button>
            <div className="mx-auto mt-12 grid max-w-2xl grid-cols-1 gap-3 text-left sm:grid-cols-3"><Feature delay="0s" label="Quizzes" text="Create, submit, and grade" /><Feature delay="0.08s" label="Class register" text="Track every session" /><Feature delay="0.16s" label="Reports" text="Share clear progress" /></div>
          </section>
        </main>
        <footer className="home-footer flex flex-wrap items-center justify-between gap-3 border-t pt-5 text-xs" style={{ borderColor: COLORS.border, color: COLORS.textMuted }}><span>Quiz Notebook</span><span className="designer-credit">Designed by Eng. Ahmed Elhediny</span></footer>
      </div>
    </div>
  );
}

function Feature({ label, text, delay }) {
  return <div className="home-feature rounded-xl border p-4" style={{ borderColor: COLORS.border, background: "rgba(255,255,255,0.72)", animationDelay: delay }}><CheckCircle2 size={16} style={{ color: COLORS.success }} /><p className="mt-3 text-sm font-semibold" style={{ color: COLORS.text }}>{label}</p><p className="mt-1 text-xs" style={{ color: COLORS.textMuted }}>{text}</p></div>;
}
