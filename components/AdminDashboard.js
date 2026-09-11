import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import * as XLSX from "xlsx";
import {
  Plus, Check, Award, BarChart3, ClipboardList, ClipboardCheck, Users, Settings as SettingsIcon, UserRound,
  CircleDot, KeyRound, ArrowRight,
} from "lucide-react";
import { Btn, Card, Chip, EmptyState, Header, Input, ScoreBadge } from "./atoms";
import { COLORS, fmtDate, monthStats, exportExcel } from "../lib/ui";
import { loadAllData, addMonth, changeAdminAccount, resetStudentPinApi, createStudentAccountApi } from "../lib/api";
import GradingView from "./GradingView";
import QuizEditor from "./QuizEditor";
import ClassRegister from "./ClassRegister";
import { TeacherProfile } from "./ProfileViews";

export default function AdminDashboard({ onLogout }) {
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [selMonth, setSelMonth] = useState(null);
  const [selQuiz, setSelQuiz] = useState(null);
  const [editingQuiz, setEditingQuiz] = useState(null); // "new" or quiz object
  const [selStudent, setSelStudent] = useState(null);
  const [openGrade, setOpenGrade] = useState(null);
  const [loadError, setLoadError] = useState("");

  async function refresh() {
    try {
      const d = await loadAllData();
      setData(d);
      setLoadError("");
      if (selMonth) setSelMonth(d.months.find((m) => m.id === selMonth.id) || null);
      if (selQuiz) setSelQuiz(d.quizzes.find((q) => q.id === selQuiz.id) || null);
      if (selStudent) setSelStudent(d.students.find((s) => s.id === selStudent.id) || null);
    } catch (e) {
      setLoadError("Could not load dashboard data. Refresh the page and try again.");
    }
  }
  useEffect(() => { refresh(); }, []);

  if (!data) return <div className="p-10 text-center text-sm" style={{ color: loadError ? COLORS.danger : COLORS.textMuted }}>{loadError || "Loading…"}</div>;

  const TABS = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "months", label: "Months & Quizzes", icon: ClipboardList },
    { key: "students", label: "Students", icon: Users },
    { key: "register", label: "Class Register", icon: ClipboardCheck },
    { key: "profile", label: "My Profile", icon: UserRound },
    { key: "settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <>
      <Header roleLabel="Teacher dashboard" name="Admin" onLogout={onLogout} tabs={TABS} activeTab={tab}
        onTab={(k) => { setTab(k); setSelMonth(null); setSelQuiz(null); setEditingQuiz(null); setSelStudent(null); setOpenGrade(null); }} />
      <div className="mx-auto max-w-5xl px-4 py-6">
        {tab === "overview" && (
          <AdminOverview data={data} goToGrade={(quiz, month, studentId) => { setTab("months"); setSelMonth(month); setSelQuiz(quiz); setOpenGrade(studentId); }} />
        )}

        {tab === "months" && (
          editingQuiz ? (
            <QuizEditor monthId={selMonth.id} existing={editingQuiz === "new" ? null : editingQuiz} onCancel={() => setEditingQuiz(null)} onSaved={async () => { setEditingQuiz(null); await refresh(); }} />
          ) : selQuiz ? (
            <QuizSubmissionsList quiz={selQuiz} data={data} openGrade={openGrade} setOpenGrade={setOpenGrade} onBack={() => { setSelQuiz(null); setOpenGrade(null); }} onEdit={() => setEditingQuiz(selQuiz)} onGraded={refresh} />
          ) : selMonth ? (
            <QuizzesInMonth month={selMonth} data={data} onBack={() => setSelMonth(null)} onOpenQuiz={(q) => setSelQuiz(q)} onNewQuiz={() => setEditingQuiz("new")} />
          ) : (
            <MonthsManager data={data} onOpenMonth={(m) => setSelMonth(m)} onAdded={refresh} />
          )
        )}

        {tab === "students" && (
          selStudent ? (
            <StudentProfileAdmin student={selStudent} data={data} onBack={() => setSelStudent(null)} onChanged={refresh} />
          ) : (
            <StudentsManager data={data} onOpen={(s) => setSelStudent(s)} />
          )
        )}

        {tab === "register" && <ClassRegister data={data} onChanged={refresh} />}

        {tab === "profile" && <TeacherProfile data={data} />}

        {tab === "settings" && <SettingsPanel onStudentCreated={refresh} />}
      </div>
    </>
  );
}

function AdminOverview({ data, goToGrade }) {
  const stats = monthStats(data);
  const pending = data.submissions.filter((s) => s.status === "submitted").sort((a, b) => a.submittedAt - b.submittedAt);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Students", value: data.students.length, icon: Users },
          { label: "Quizzes", value: data.quizzes.length, icon: ClipboardList },
          { label: "Awaiting grading", value: pending.length, icon: CircleDot },
          { label: "Months", value: data.months.length, icon: BarChart3 },
        ].map((s) => (
          <Card key={s.label} className="flex flex-col items-center gap-1 py-5">
            <s.icon size={18} style={{ color: COLORS.ink }} />
            <span className="text-2xl font-bold" style={{ color: COLORS.text }}>{s.value}</span>
            <span className="text-xs" style={{ color: COLORS.textMuted }}>{s.label}</span>
          </Card>
        ))}
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: COLORS.text }}>Average performance, month by month</p>
          <Btn variant="gold" onClick={() => exportExcel(data, XLSX)}><Award size={15} /> Download Excel file</Btn>
        </div>
        {stats.filter((s) => s.pct !== null).length === 0 ? (
          <EmptyState icon={BarChart3} title="Not enough grades yet" hint="Once you grade the first quizzes, the month-by-month comparison will show up here." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => v + "%"} />
              <Line type="monotone" dataKey="pct" stroke={COLORS.ink} strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card>
        <p className="mb-3 text-sm font-semibold" style={{ color: COLORS.text }}>Needs grading now</p>
        {pending.length === 0 ? (
          <p className="text-sm" style={{ color: COLORS.textMuted }}>Nothing needs grading — you're all caught up 👌</p>
        ) : (
          <div className="flex flex-col divide-y" style={{ borderColor: COLORS.border }}>
            {pending.map((p) => {
              const quiz = data.quizzes.find((q) => q.id === p.quizId);
              const month = quiz && data.months.find((m) => m.id === quiz.monthId);
              return (
                <div key={p.quizId + p.studentId} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" style={{ color: COLORS.text }}>{p.studentName} — {quiz ? quiz.title : ""}</p>
                    <p className="text-xs" style={{ color: COLORS.textMuted }}>{month ? month.name : ""} · {fmtDate(quiz && quiz.date)}</p>
                  </div>
                  <Btn variant="ghost" onClick={() => goToGrade(quiz, month, p.studentId)}>Grade now</Btn>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function MonthsManager({ data, onOpenMonth, onAdded }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  async function add() {
    if (!name.trim()) return;
    await addMonth(name.trim(), date);
    setName(""); setAdding(false);
    onAdded();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: COLORS.text }}>Months</h2>
        <Btn onClick={() => setAdding((v) => !v)}><Plus size={15} /> Add month</Btn>
      </div>

      {adding && (
        <Card>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[160px] flex-1">
              <label className="mb-1 block text-xs" style={{ color: COLORS.textMuted }}>Month name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. September 2026" autoFocus />
            </div>
            <div>
              <label className="mb-1 block text-xs" style={{ color: COLORS.textMuted }}>Date (for ordering)</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <Btn onClick={add}><Check size={15} /> Save</Btn>
          </div>
        </Card>
      )}

      {data.months.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No months yet" hint="Start by adding the first month so you can add quizzes inside it." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.months.map((m) => {
            const quizzes = data.quizzes.filter((q) => q.monthId === m.id);
            const stat = monthStats(data).find((s) => s.id === m.id);
            return (
              <button key={m.id} onClick={() => onOpenMonth(m)} className="flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-transform hover:-translate-y-0.5" style={{ borderColor: COLORS.border, background: COLORS.surface }}>
                <div className="flex w-full items-center justify-between">
                  <p className="font-semibold" style={{ color: COLORS.text }}>{m.name}</p>
                  {stat && stat.pct !== null && <ScoreBadge score={stat.pct} max={100} hideFraction />}
                </div>
                <p className="text-xs" style={{ color: COLORS.textMuted }}>{fmtDate(m.date)} · {quizzes.length} quizzes</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QuizzesInMonth({ month, data, onBack, onOpenQuiz, onNewQuiz }) {
  const quizzes = data.quizzes.filter((q) => q.monthId === month.id).sort((a, b) => new Date(a.date) - new Date(b.date));
  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="inline-flex w-fit items-center gap-1 text-sm" style={{ color: COLORS.textMuted }}><ArrowRight size={16} className="rotate-180" /> Back to months</button>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: COLORS.text }}>{month.name}</h2>
        <Btn onClick={onNewQuiz}><Plus size={15} /> Add quiz</Btn>
      </div>
      {quizzes.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No quizzes in this month yet" action={<Btn onClick={onNewQuiz}><Plus size={15} /> Add first quiz</Btn>} />
      ) : (
        <div className="flex flex-col gap-2">
          {quizzes.map((q) => {
            const subs = data.submissions.filter((s) => s.quizId === q.id);
            const graded = subs.filter((s) => s.status === "graded").length;
            return (
              <button key={q.id} onClick={() => onOpenQuiz(q)} className="flex items-center justify-between rounded-xl border px-4 py-3 text-left" style={{ borderColor: COLORS.border, background: COLORS.surface }}>
                <div>
                  <p className="font-medium" style={{ color: COLORS.text }}>{q.title}</p>
                  <p className="text-xs" style={{ color: COLORS.textMuted }}>{fmtDate(q.date)} · {(q.sections || []).length} sections</p>
                </div>
                <Chip tone={graded === subs.length && subs.length > 0 ? "success" : "muted"}>{subs.length} submitted · {graded} graded</Chip>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QuizSubmissionsList({ quiz, data, openGrade, setOpenGrade, onBack, onEdit, onGraded }) {
  const rows = data.students.map((st) => {
    const sub = data.submissions.find((s) => s.quizId === quiz.id && s.studentId === st.id) || null;
    return { student: st, sub };
  });
  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="inline-flex w-fit items-center gap-1 text-sm" style={{ color: COLORS.textMuted }}><ArrowRight size={16} className="rotate-180" /> Back to quizzes</button>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: COLORS.text }}>{quiz.title}</h2>
          <p className="text-xs" style={{ color: COLORS.textMuted }}>{fmtDate(quiz.date)}</p>
        </div>
        <Btn variant="ghost" onClick={onEdit}>Edit quiz</Btn>
      </div>

      <div className="flex flex-col gap-2">
        {rows.map(({ student, sub }) => (
          <div key={student.id} className="rounded-xl border" style={{ borderColor: COLORS.border, background: COLORS.surface }}>
            <button onClick={() => setOpenGrade(openGrade === student.id ? null : student.id)} className="flex w-full items-center justify-between px-4 py-3 text-left">
              <p className="font-medium" style={{ color: COLORS.text }}>{student.name}</p>
              {!sub ? (
                <Chip>Not submitted</Chip>
              ) : sub.status === "graded" ? (
                <ScoreBadge score={sub.totalScore} max={sub.maxScore} />
              ) : (
                <Chip tone="warn">Awaiting grading</Chip>
              )}
            </button>
            {openGrade === student.id && (
              <div className="border-t p-4" style={{ borderColor: COLORS.border }}>
                <GradingView quiz={quiz} submission={sub} onSaved={onGraded} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentsManager({ data, onOpen }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function create() {
    const result = await createStudentAccountApi(name, email, password);
    if (!result.ok) { setMessage(result.error || "Could not create student"); return; }
    setName(""); setEmail(""); setPassword(""); setAdding(false); setMessage("Student account created");
    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold" style={{ color: COLORS.text }}>Students</h2><Btn onClick={() => setAdding((v) => !v)}><Plus size={15} /> Add student</Btn></div>
      {adding && <Card><div className="grid gap-2 sm:grid-cols-3"><Input placeholder="Student name" value={name} onChange={(e) => setName(e.target.value)} /><Input type="email" placeholder="Student email" value={email} onChange={(e) => setEmail(e.target.value)} /><Input placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} /></div><Btn className="mt-3" onClick={create}>Create account</Btn>{message && <p className="mt-2 text-xs" style={{ color: COLORS.danger }}>{message}</p>}</Card>}
      {message && !adding && <p className="text-xs" style={{ color: COLORS.success }}>{message}</p>}
      {data.students.length === 0 ? (
        <EmptyState icon={Users} title="No students registered yet" hint="They'll show up here as soon as someone logs in from the “I'm a Student” screen." />
      ) : (
        <div className="flex flex-col gap-2">
          {data.students.map((s) => {
            const subs = data.submissions.filter((x) => x.studentId === s.id);
            const graded = subs.filter((x) => x.status === "graded");
            const last = graded.sort((a, b) => b.gradedAt - a.gradedAt)[0];
            return (
              <button key={s.id} onClick={() => onOpen(s)} className="flex items-center justify-between rounded-xl border px-4 py-3 text-left" style={{ borderColor: COLORS.border, background: COLORS.surface }}>
                <div>
                  <p className="font-medium" style={{ color: COLORS.text }}>{s.name}</p>
                  <p className="text-xs" style={{ color: COLORS.textMuted }}>{s.email || "No email account"} · {subs.length} quizzes submitted</p>
                </div>
                {last ? <ScoreBadge score={last.totalScore} max={last.maxScore} /> : <Chip>No grades yet</Chip>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StudentProfileAdmin({ student, data, onBack, onChanged }) {
  const [openQuiz, setOpenQuiz] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [newPin, setNewPin] = useState("");
  const stats = monthStats(data, student.id);
  const subs = data.submissions
    .filter((s) => s.studentId === student.id)
    .map((s) => ({ sub: s, quiz: data.quizzes.find((q) => q.id === s.quizId) }))
    .filter((x) => x.quiz)
    .sort((a, b) => new Date(b.quiz.date) - new Date(a.quiz.date));

  async function resetPin() {
    if (newPin.trim().length < 4) return;
    await resetStudentPinApi(student.id, newPin.trim());
    setResetting(false); setNewPin("");
    onChanged();
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="inline-flex w-fit items-center gap-1 text-sm" style={{ color: COLORS.textMuted }}><ArrowRight size={16} className="rotate-180" /> Back to students</button>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: COLORS.text }}>{student.name}</h2>
        {!resetting ? (
          <Btn variant="ghost" onClick={() => setResetting(true)}><KeyRound size={14} /> Reset PIN</Btn>
        ) : (
          <div className="flex items-center gap-2">
            <Input placeholder="New PIN" value={newPin} onChange={(e) => setNewPin(e.target.value)} className="w-32" />
            <Btn onClick={resetPin}>Save</Btn>
          </div>
        )}
      </div>

      <Card>
        <p className="mb-3 text-sm font-semibold" style={{ color: COLORS.text }}>Month-by-month performance</p>
        {stats.filter((s) => s.pct !== null).length === 0 ? (
          <p className="text-sm" style={{ color: COLORS.textMuted }}>Not enough grades yet for this student.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.filter((s) => s.count > 0)}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => v + "%"} />
              <Bar dataKey="pct" fill={COLORS.ink} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="flex flex-col gap-2">
        {subs.map(({ sub, quiz }) => (
          <div key={quiz.id} className="rounded-xl border" style={{ borderColor: COLORS.border, background: COLORS.surface }}>
            <button onClick={() => setOpenQuiz(openQuiz === quiz.id ? null : quiz.id)} className="flex w-full items-center justify-between px-4 py-3 text-left">
              <div>
                <p className="font-medium" style={{ color: COLORS.text }}>{quiz.title}</p>
                <p className="text-xs" style={{ color: COLORS.textMuted }}>{fmtDate(quiz.date)}</p>
              </div>
              {sub.status === "graded" ? <ScoreBadge score={sub.totalScore} max={sub.maxScore} /> : <Chip tone="warn">Awaiting grading</Chip>}
            </button>
            {openQuiz === quiz.id && (
              <div className="border-t p-4" style={{ borderColor: COLORS.border }}>
                <GradingView quiz={quiz} submission={sub} onSaved={onChanged} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel({ onStudentCreated }) {
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [studentMsg, setStudentMsg] = useState("");
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [accountMsg, setAccountMsg] = useState("");
  const [updatingAccount, setUpdatingAccount] = useState(false);

  async function createStudent() {
    setStudentMsg("");
    setCreatingStudent(true);
    const result = await createStudentAccountApi(studentName.trim(), studentEmail.trim(), studentPassword);
    setCreatingStudent(false);
    if (!result.ok) {
      setStudentMsg(result.error || "Could not create student account");
      return;
    }
    setStudentName("");
    setStudentEmail("");
    setStudentPassword("");
    setStudentMsg("Student account created successfully");
    onStudentCreated && onStudentCreated();
  }

  async function updateTeacherAccount() {
    setAccountMsg("");
    setUpdatingAccount(true);
    const result = await changeAdminAccount(teacherEmail.trim(), teacherPassword);
    setUpdatingAccount(false);
    if (!result.ok) {
      setAccountMsg(result.message || "Could not update teacher account");
      return;
    }
    setTeacherPassword("");
    setAccountMsg("Teacher account updated successfully");
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold" style={{ color: COLORS.text }}>Settings</h2>
      <Card className="max-w-sm">
        <p className="mb-1 text-sm font-semibold" style={{ color: COLORS.text }}>Teacher account</p>
        <p className="mb-3 text-xs leading-5" style={{ color: COLORS.textMuted }}>Change the email you use to log in. Leave the password empty to keep the current password.</p>
        <div className="flex flex-col gap-2">
          <Input type="email" placeholder="New teacher email" value={teacherEmail} onChange={(e) => setTeacherEmail(e.target.value)} />
          <Input type="password" placeholder="New password (optional)" value={teacherPassword} onChange={(e) => setTeacherPassword(e.target.value)} />
          <Btn onClick={updateTeacherAccount} disabled={updatingAccount || (!teacherEmail.trim() && !teacherPassword) || (teacherPassword.length > 0 && teacherPassword.length < 4)}>{updatingAccount ? "Updating..." : "Update teacher account"}</Btn>
        </div>
        {accountMsg && <p className="mt-2 text-xs" style={{ color: accountMsg.includes("successfully") ? COLORS.success : COLORS.danger }}>{accountMsg}</p>}
      </Card>
      <Card className="max-w-sm">
        <p className="mb-1 text-sm font-semibold" style={{ color: COLORS.text }}>Create student login</p>
        <p className="mb-3 text-xs leading-5" style={{ color: COLORS.textMuted }}>Create the credentials and give the student the email and password to use on the Login page.</p>
        <div className="flex flex-col gap-2">
          <Input placeholder="Student name" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
          <Input type="email" placeholder="Student email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} />
          <Input type="password" placeholder="Student password" value={studentPassword} onChange={(e) => setStudentPassword(e.target.value)} />
          <Btn onClick={createStudent} disabled={creatingStudent || !studentName.trim() || !studentEmail.trim() || studentPassword.length < 4}>{creatingStudent ? "Creating..." : "Create student account"}</Btn>
        </div>
        {studentMsg && <p className="mt-2 text-xs" style={{ color: studentMsg.includes("successfully") ? COLORS.success : COLORS.danger }}>{studentMsg}</p>}
      </Card>
      <Card className="max-w-sm">
        <p className="mb-1 text-sm font-semibold" style={{ color: COLORS.text }}>Important note</p>
        <p className="text-xs leading-6" style={{ color: COLORS.textMuted }}>
          Security is designed for a private class workspace. Keep account credentials private and share each student's login only with them.
        </p>
      </Card>
    </div>
  );
}
