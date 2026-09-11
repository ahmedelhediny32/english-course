import { Award, BarChart3, BookOpenCheck, CalendarCheck, ClipboardList, FileText, MessageSquare, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { Card, Chip, ScoreBadge } from "./atoms";
import { COLORS, fmtDate } from "../lib/ui";

function Stat({ icon: Icon, label, value, hint, tone = COLORS.ink }) {
  return <Card className="flex min-h-[116px] flex-col justify-between"><div className="flex items-center justify-between"><span className="text-xs uppercase tracking-wide" style={{ color: COLORS.textMuted }}>{label}</span><Icon size={17} style={{ color: tone }} /></div><div><p className="mt-2 text-2xl font-semibold" style={{ color: tone }}>{value}</p><p className="text-xs" style={{ color: COLORS.textMuted }}>{hint}</p></div></Card>;
}

function Section({ icon: Icon, title, hint, children }) {
  return <Card><div className="mb-4 flex items-start gap-3"><div className="rounded-xl p-2" style={{ background: COLORS.successSoft, color: COLORS.success }}><Icon size={17} /></div><div><h3 className="font-semibold" style={{ color: COLORS.text }}>{title}</h3>{hint && <p className="text-xs" style={{ color: COLORS.textMuted }}>{hint}</p>}</div></div>{children}</Card>;
}

export function StudentProfile({ student, data, progress }) {
  const submissions = data.submissions.filter((item) => item.studentId === student.id);
  const graded = submissions.filter((item) => item.status === "graded" && item.maxScore > 0);
  const average = graded.length ? Math.round(graded.reduce((sum, item) => sum + (item.totalScore / item.maxScore) * 100, 0) / graded.length) : null;
  const feedback = submissions.filter((item) => item.feedback).sort((a, b) => (b.gradedAt || 0) - (a.gradedAt || 0));
  const sessions = progress?.sessionProgress || [];
  const attendance = progress?.attendance || [];
  const present = attendance.filter((item) => item.status === "present").length;
  const attendanceRate = attendance.length ? Math.round((present / attendance.length) * 100) : null;
  const participation = sessions.filter((item) => item.participation_score != null);
  const participationAverage = participation.length ? (participation.reduce((sum, item) => sum + Number(item.participation_score), 0) / participation.length).toFixed(1) : null;
  const homework = sessions.filter((item) => item.homework_score != null);
  const homeworkAverage = homework.length ? Math.round(homework.reduce((sum, item) => sum + Number(item.homework_score), 0) / homework.length) : null;
  const achievements = [
    graded.length > 0 && `Completed ${graded.length} graded quiz${graded.length === 1 ? "" : "zes"}`,
    average !== null && `Quiz average is ${average}%`,
    attendanceRate !== null && attendanceRate >= 80 && "Strong class attendance",
    homeworkAverage !== null && homeworkAverage >= 80 && "Consistent homework progress",
  ].filter(Boolean);

  return <div className="flex flex-col gap-5">
    <div className="profile-hero rounded-2xl border p-5" style={{ borderColor: COLORS.border }}><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: COLORS.success }}>Student profile</p><h2 className="mt-1 text-2xl font-semibold" style={{ color: COLORS.text }}>{student.name}</h2><p className="text-sm" style={{ color: COLORS.textMuted }}>{student.email || "Student account"}</p></div><div className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: COLORS.successSoft, color: COLORS.success }}>Active learner</div></div></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat icon={Award} label="Graded quizzes" value={graded.length} hint={`${submissions.length} total submissions`} tone={COLORS.success} /><Stat icon={TrendingUp} label="Quiz average" value={average === null ? "-" : `${average}%`} hint="across graded work" tone={COLORS.ink} /><Stat icon={CalendarCheck} label="Attendance" value={attendanceRate === null ? "-" : `${attendanceRate}%`} hint={`${attendance.length} recorded sessions`} tone={COLORS.warn} /><Stat icon={BookOpenCheck} label="Homework" value={homeworkAverage === null ? "-" : `${homeworkAverage}%`} hint={`${homework.length} session records`} tone={COLORS.gold} /></div>
    <Section icon={Award} title="Achievements" hint="Progress earned from work completed on the platform.">{achievements.length ? <div className="grid gap-2 sm:grid-cols-2">{achievements.map((item) => <div key={item} className="rounded-xl p-3 text-sm" style={{ background: COLORS.successSoft, color: COLORS.ink }}><Award size={15} className="mb-2" style={{ color: COLORS.success }} />{item}</div>)}</div> : <p className="text-sm" style={{ color: COLORS.textMuted }}>Complete quizzes and class sessions to build your achievements.</p>}</Section>
    <Section icon={BarChart3} title="Work on the platform" hint="A connected view of this student's activity."><div className="grid gap-3 sm:grid-cols-3"><div><p className="text-xs" style={{ color: COLORS.textMuted }}>Participation average</p><p className="mt-1 text-lg font-semibold" style={{ color: COLORS.text }}>{participationAverage ? `${participationAverage}/5` : "-"}</p></div><div><p className="text-xs" style={{ color: COLORS.textMuted }}>Sessions with feedback</p><p className="mt-1 text-lg font-semibold" style={{ color: COLORS.text }}>{sessions.filter((item) => item.notes).length}</p></div><div><p className="text-xs" style={{ color: COLORS.textMuted }}>Pending results</p><p className="mt-1 text-lg font-semibold" style={{ color: COLORS.text }}>{submissions.filter((item) => item.status !== "graded").length}</p></div></div></Section>
    <Section icon={MessageSquare} title="Teacher feedback" hint="Notes and comments connected to the student's work.">{feedback.length ? <div className="flex flex-col gap-2">{feedback.map((item) => { const quiz = data.quizzes.find((q) => q.id === item.quizId); return <div key={`${item.quizId}:${item.studentId}`} className="rounded-xl border p-3" style={{ borderColor: COLORS.border }}><div className="flex justify-between gap-3"><p className="text-sm font-semibold" style={{ color: COLORS.text }}>{quiz?.title || "Quiz"}</p><span className="text-xs" style={{ color: COLORS.textMuted }}>{quiz ? fmtDate(quiz.date) : ""}</span></div><p className="mt-2 whitespace-pre-wrap text-sm" style={{ color: COLORS.text }}>{item.feedback}</p></div>; })}</div> : <p className="text-sm" style={{ color: COLORS.textMuted }}>Your teacher has not added feedback yet.</p>}</Section>
  </div>;
}

export function TeacherProfile({ data }) {
  const graded = data.submissions.filter((item) => item.status === "graded");
  const pending = data.submissions.filter((item) => item.status !== "graded");
  const average = graded.length ? Math.round(graded.reduce((sum, item) => sum + (item.maxScore ? item.totalScore / item.maxScore * 100 : 0), 0) / graded.length) : null;
  const recent = data.submissions.slice().sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0)).slice(0, 6);
  return <div className="flex flex-col gap-5">
    <div className="profile-hero rounded-2xl border p-5" style={{ borderColor: COLORS.border }}><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: COLORS.success }}>Teacher profile</p><h2 className="mt-1 text-2xl font-semibold" style={{ color: COLORS.text }}>Your teaching workspace</h2><p className="text-sm" style={{ color: COLORS.textMuted }}>A complete overview of your classes, quizzes, grading, and reports.</p></div><div className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: COLORS.goldSoft, color: "#7A5C13" }}>Workspace owner</div></div></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat icon={Users} label="Students" value={data.students.length} hint="active accounts" tone={COLORS.ink} /><Stat icon={ClipboardList} label="Quizzes" value={data.quizzes.length} hint={`${data.months.length} months`} tone={COLORS.success} /><Stat icon={ShieldCheck} label="Graded work" value={graded.length} hint={`${pending.length} awaiting`} tone={COLORS.warn} /><Stat icon={TrendingUp} label="Class average" value={average === null ? "-" : `${average}%`} hint="graded submissions" tone={COLORS.gold} /></div>
    <Section icon={BarChart3} title="Teaching snapshot" hint="The main numbers across your workspace."><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl p-4" style={{ background: COLORS.paper }}><p className="text-xs" style={{ color: COLORS.textMuted }}>Months created</p><p className="mt-1 text-2xl font-semibold" style={{ color: COLORS.text }}>{data.months.length}</p></div><div className="rounded-xl p-4" style={{ background: COLORS.paper }}><p className="text-xs" style={{ color: COLORS.textMuted }}>Submitted work</p><p className="mt-1 text-2xl font-semibold" style={{ color: COLORS.text }}>{data.submissions.length}</p></div><div className="rounded-xl p-4" style={{ background: COLORS.paper }}><p className="text-xs" style={{ color: COLORS.textMuted }}>Completion rate</p><p className="mt-1 text-2xl font-semibold" style={{ color: COLORS.text }}>{data.submissions.length ? `${Math.round((graded.length / data.submissions.length) * 100)}%` : "-"}</p></div></div></Section>
    <Section icon={FileText} title="Recent activity" hint="The latest student work flowing through the platform.">{recent.length ? <div className="flex flex-col gap-2">{recent.map((item) => { const student = data.students.find((s) => s.id === item.studentId); const quiz = data.quizzes.find((q) => q.id === item.quizId); return <div key={`${item.quizId}:${item.studentId}`} className="flex items-center justify-between gap-3 rounded-xl border p-3" style={{ borderColor: COLORS.border }}><div><p className="text-sm font-semibold" style={{ color: COLORS.text }}>{student?.name || item.studentName}</p><p className="text-xs" style={{ color: COLORS.textMuted }}>{quiz?.title || "Quiz"} · {item.status === "graded" ? "Graded" : "Awaiting grading"}</p></div>{item.status === "graded" ? <ScoreBadge score={item.totalScore} max={item.maxScore} /> : <Chip tone="warn">Review</Chip>}</div>; })}</div> : <p className="text-sm" style={{ color: COLORS.textMuted }}>No student activity yet.</p>}</Section>
  </div>;
}
