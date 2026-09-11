import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowRight, BarChart3, Check, ClipboardList, MessageSquare, UserRound } from "lucide-react";
import { Btn, Card, Chip, EmptyState, Header, Input, ScoreBadge, TextArea } from "./atoms";
import { COLORS, fmtDate, monthStats, quizMaxScore, sectionMeta } from "../lib/ui";
import { loadAllData, loadStudentProgressApi, submitQuizApi, saveRecordingApi } from "../lib/api";
import AudioRecorder from "./AudioRecorder";
import GradingView from "./GradingView";
import { StudentProfile } from "./ProfileViews";

export default function StudentDashboard({ student, onLogout }) {
  const [tab, setTab] = useState("available");
  const [data, setData] = useState(null);
  const [taking, setTaking] = useState(null);
  const [openResult, setOpenResult] = useState(null);
  const [toast, setToast] = useState("");
  const [studentProgress, setStudentProgress] = useState(null);

  async function refresh() {
    const [allData, progress] = await Promise.all([loadAllData(), loadStudentProgressApi(student.id)]);
    setData(allData);
    setStudentProgress(progress);
  }
  useEffect(() => { refresh(); }, []);

  if (!data) return <div className="p-10 text-center text-sm" style={{ color: COLORS.textMuted }}>Loading…</div>;

  const TABS = [
    { key: "available", label: "Available Quizzes", icon: ClipboardList },
    { key: "results", label: "My Results", icon: BarChart3 },
    { key: "profile", label: "My Profile", icon: UserRound },
  ];

  const doneQuizIds = new Set(data.submissions.filter((s) => s.studentId === student.id).map((s) => s.quizId));
  const available = data.quizzes.filter((q) => !doneQuizIds.has(q.id)).sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <>
      <Header roleLabel="Student" name={student.name} onLogout={onLogout} tabs={TABS} activeTab={tab} onTab={(k) => { setTab(k); setTaking(null); setOpenResult(null); }} />
      <div className="mx-auto max-w-3xl px-4 py-6">
        {toast && <div className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ background: COLORS.successSoft, color: COLORS.success }}>{toast}</div>}

        {taking ? (
          <TakeQuiz
            quiz={taking}
            student={student}
            onCancel={() => setTaking(null)}
            onSubmitted={async () => { setTaking(null); setToast("Quiz submitted successfully — it'll be graded soon."); await refresh(); setTimeout(() => setToast(""), 3500); }}
          />
        ) : tab === "available" ? (
          available.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No new quizzes right now" hint="As soon as your teacher adds a new quiz, it'll show up here." />
          ) : (
            <div className="flex flex-col gap-2">
              {available.map((q) => {
                const month = data.months.find((m) => m.id === q.monthId);
                return (
                  <div key={q.id} className="flex items-center justify-between rounded-xl border px-4 py-3" style={{ borderColor: COLORS.border, background: COLORS.surface }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium" style={{ color: COLORS.text }}>{q.title}</p>
                        <Chip tone="gold">New</Chip>
                      </div>
                      <p className="text-xs" style={{ color: COLORS.textMuted }}>{month ? month.name : ""} · {fmtDate(q.date)}</p>
                    </div>
                    <Btn onClick={() => setTaking(q)}>Start</Btn>
                  </div>
                );
              })}
            </div>
          )
        ) : tab === "results" ? (
          <MyResults data={data} student={student} studentProgress={studentProgress} openResult={openResult} setOpenResult={setOpenResult} />
        ) : (
          <StudentProfile student={student} data={data} progress={studentProgress} />
        )}
      </div>
    </>
  );
}

function TakeQuiz({ quiz, student, onCancel, onSubmitted }) {
  const [answers, setAnswers] = useState({});
  const [recordings, setRecordings] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function setText(itemId, text) { setAnswers((a) => ({ ...a, [itemId]: text })); }

  async function submit() {
    setSubmitting(true);
    const answerMap = {};
    for (const sec of quiz.sections || []) {
      for (const item of sec.items || []) {
        if (sec.type === "vocab" || sec.type === "essay") {
          answerMap[item.id] = { type: sec.type, text: answers[item.id] || "" };
        } else {
          const rec = recordings[item.id];
          if (rec) await saveRecordingApi(quiz.id, student.id, item.id, rec);
          answerMap[item.id] = { type: sec.type, hasRecording: !!rec };
        }
      }
    }
    await submitQuizApi({
      quizId: quiz.id, studentId: student.id, studentName: student.name,
      answers: answerMap, maxScore: quizMaxScore(quiz),
    });
    setSubmitting(false);
    onSubmitted();
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onCancel} className="inline-flex w-fit items-center gap-1 text-sm" style={{ color: COLORS.textMuted }}><ArrowRight size={16} className="rotate-180" /> Back</button>
      <div>
        <h2 className="text-lg font-semibold" style={{ color: COLORS.text }}>{quiz.title}</h2>
        <p className="text-xs" style={{ color: COLORS.textMuted }}>{fmtDate(quiz.date)}</p>
      </div>

      {(quiz.sections || []).map((sec) => (
        <Card key={sec.id}>
          <p className="mb-3 text-sm font-semibold" style={{ color: COLORS.ink }}>{sec.title || sectionMeta(sec.type).label}</p>
          <div className="flex flex-col gap-4">
            {(sec.items || []).map((item) => (
              <div key={item.id} className="border-t pt-3 first:border-t-0 first:pt-0" style={{ borderColor: COLORS.border }}>
                {sec.type === "vocab" && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-sm" style={{ color: COLORS.textMuted }}>Translate the word:</p>
                    <p dir="rtl" className="text-lg font-semibold" style={{ color: COLORS.text }}>{item.arabic}</p>
                    <Input placeholder="Type the English word" value={answers[item.id] || ""} onChange={(e) => setText(item.id, e.target.value)} />
                  </div>
                )}
                {sec.type === "recording" && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-sm" style={{ color: COLORS.textMuted }}>Record yourself saying:</p>
                    <p className="text-lg font-semibold" style={{ color: COLORS.text }}>{item.prompt}</p>
                    <AudioRecorder value={recordings[item.id]} onChange={(v) => setRecordings((r) => ({ ...r, [item.id]: v }))} />
                  </div>
                )}
                {sec.type === "reading" && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-sm" style={{ color: COLORS.textMuted }}>Record yourself reading the passage:</p>
                    <p className="rounded-lg p-3 text-sm leading-7" style={{ background: COLORS.paper, color: COLORS.text }}>{item.passage}</p>
                    <AudioRecorder value={recordings[item.id]} onChange={(v) => setRecordings((r) => ({ ...r, [item.id]: v }))} />
                  </div>
                )}
                {sec.type === "essay" && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-sm" style={{ color: COLORS.text }}>{item.prompt}</p>
                    <TextArea rows={3} value={answers[item.id] || ""} onChange={(e) => setText(item.id, e.target.value)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Btn onClick={submit} disabled={submitting}><Check size={16} /> {submitting ? "Submitting…" : "Submit quiz"}</Btn>
    </div>
  );
}

function MyResults({ data, student, studentProgress, openResult, setOpenResult }) {
  const stats = monthStats(data, student.id).filter((s) => s.count > 0);
  const subs = data.submissions
    .filter((s) => s.studentId === student.id)
    .map((s) => ({ sub: s, quiz: data.quizzes.find((q) => q.id === s.quizId) }))
    .filter((x) => x.quiz)
    .sort((a, b) => new Date(b.quiz.date) - new Date(a.quiz.date));

  return (
    <div className="flex flex-col gap-4">
      <StudentFeedback progress={studentProgress} months={data.months} />
      <Card>
        <p className="mb-3 text-sm font-semibold" style={{ color: COLORS.text }}>My progress, month by month</p>
        {stats.length === 0 ? (
          <p className="text-sm" style={{ color: COLORS.textMuted }}>Not enough grades yet — keep going! 💪</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => v + "%"} />
              <Line type="monotone" dataKey="pct" stroke={COLORS.success} strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {subs.length === 0 ? (
        <EmptyState icon={ClipboardList} title="You haven't submitted any quiz yet" />
      ) : (
        <div className="flex flex-col gap-2">
          {subs.map(({ sub, quiz }) => (
            <div key={quiz.id} className="rounded-xl border" style={{ borderColor: COLORS.border, background: COLORS.surface }}>
              <button onClick={() => setOpenResult(openResult === quiz.id ? null : quiz.id)} className="flex w-full items-center justify-between px-4 py-3 text-left">
                <div>
                  <p className="font-medium" style={{ color: COLORS.text }}>{quiz.title}</p>
                  <p className="text-xs" style={{ color: COLORS.textMuted }}>{fmtDate(quiz.date)}</p>
                </div>
                {sub.status === "graded" ? <ScoreBadge score={sub.totalScore} max={sub.maxScore} /> : <Chip tone="warn">Awaiting grading</Chip>}
              </button>
              {openResult === quiz.id && (
                <div className="border-t p-4" style={{ borderColor: COLORS.border }}>
                  <GradingView quiz={quiz} submission={sub} readOnly onSaved={() => {}} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentFeedback({ progress, months }) {
  if (!progress) return null;
  const attendanceBySession = {};
  (progress.attendance || []).forEach((item) => { attendanceBySession[item.session_id] = item.status; });
  const notes = (progress.sessionProgress || []).filter((item) => item.notes || item.participation_score != null || item.homework_score != null);
  const monthlyNotes = progress.progress || [];
  if (!notes.length && !monthlyNotes.some((item) => item.notes)) return null;
  return <Card><div className="mb-4 flex items-start gap-2"><MessageSquare size={18} style={{ color: COLORS.success }} /><div><p className="font-semibold" style={{ color: COLORS.text }}>Teacher feedback</p><p className="text-xs" style={{ color: COLORS.textMuted }}>Your teacher's notes and session progress.</p></div></div><div className="flex flex-col gap-3">{notes.map((item) => { const month = months.find((value) => value.id === item.month_id); return <div key={item.session_id} className="rounded-xl border p-3" style={{ borderColor: COLORS.border, background: COLORS.paper }}><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold" style={{ color: COLORS.text }}>{item.label || "Class session"}</p><p className="text-xs" style={{ color: COLORS.textMuted }}>{month ? month.name + " · " : ""}{fmtDate(item.session_date)} · {attendanceBySession[item.session_id] === "present" ? "Present" : attendanceBySession[item.session_id] === "late" ? "Late" : attendanceBySession[item.session_id] === "absent" ? "Absent" : "Not recorded"}</p></div><div className="text-right text-xs" style={{ color: COLORS.textMuted }}>{item.participation_score !== null && item.participation_score !== undefined ? `Participation ${item.participation_score}/5` : ""}{item.homework_score !== null && item.homework_score !== undefined ? ` · Homework ${item.homework_score}%` : ""}</div></div>{item.notes && <p className="mt-2 whitespace-pre-wrap text-sm" style={{ color: COLORS.text }}>{item.notes}</p>}</div>; })}{monthlyNotes.filter((item) => item.notes).map((item) => <div key={item.month_id} className="rounded-xl border p-3" style={{ borderColor: COLORS.border, background: COLORS.paper }}><p className="text-xs font-semibold" style={{ color: COLORS.textMuted }}>Monthly note · {months.find((value) => value.id === item.month_id)?.name || "Month"}</p><p className="mt-1 whitespace-pre-wrap text-sm" style={{ color: COLORS.text }}>{item.notes}</p></div>)}</div></Card>;
}
