import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, ClipboardCheck, FileText, FolderPlus, Printer, Trash2 } from "lucide-react";
import { Btn, Card, Chip, EmptyState, Input, TextArea } from "./atoms";
import { addMonth, gradeSubmissionApi, loadProgressApi, saveProgressApi } from "../lib/api";
import { COLORS, fmtDate } from "../lib/ui";

const STATUS_CYCLE = ["", "present", "absent", "late"];
const STATUS_LABELS = { "": "-", present: "P", absent: "A", late: "L" };
const STATUS_COLORS = {
  "": { background: COLORS.paper, color: COLORS.textMuted },
  present: { background: COLORS.successSoft, color: COLORS.success },
  absent: { background: COLORS.dangerSoft, color: COLORS.danger },
  late: { background: COLORS.warnSoft, color: COLORS.warn },
};
function asNumber(value) {
  return value === "" || value === null || value === undefined ? null : Number(value);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}


function attendanceFor(studentId, sessions, attendance) {
  const values = sessions.map((session) => attendance[studentId + ":" + session.id]).filter(Boolean);
  if (!values.length) return null;
  const points = values.reduce((sum, status) => sum + (status === "present" ? 1 : status === "late" ? 0.5 : status === "excused" ? 1 : 0), 0);
  return Math.round((points / values.length) * 100);
}

function scoreTone(score) {
  if (score === null) return "muted";
  if (score >= 80) return "success";
  if (score >= 60) return "warn";
  return "danger";
}

export default function ClassRegister({ data, onChanged }) {
  const [monthId, setMonthId] = useState(data.months[0] ? data.months[0].id : "");
  const [register, setRegister] = useState({ sessions: [], attendance: {}, progress: {}, sessionProgress: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newLabel, setNewLabel] = useState("");
  const [reportStudentId, setReportStudentId] = useState("");
  const [newMonthName, setNewMonthName] = useState("");
  const [newMonthDate, setNewMonthDate] = useState(new Date().toISOString().slice(0, 10));
  const [addingMonth, setAddingMonth] = useState(false);

  const load = async () => {
    if (!monthId) return;
    setLoading(true);
    try {
      const result = await loadProgressApi(monthId);
      const attendance = {};
      result.attendance.forEach((item) => { attendance[item.student_id + ":" + item.session_id] = item.status; });
      const progress = {};
      result.progress.forEach((item) => { progress[item.student_id] = item; });
      const sessionProgress = {};
      (result.sessionProgress || []).forEach((item) => { sessionProgress[item.student_id + ":" + item.session_id] = item; });
      setRegister({ sessions: result.sessions, attendance, progress, sessionProgress });
      setError("");
    } catch (e) {
      setError("Could not load the class register.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [monthId]);

  async function addSession() {
    if (!monthId || !newDate) return;
    const result = await saveProgressApi({ kind: "session", monthId, sessionDate: newDate, label: newLabel });
    if (!result.ok) { setError(result.error || "Could not add session"); return; }
    setNewLabel("");
    await load();
  }

  async function updateSession(session, patch) {
    const next = { ...session, ...patch };
    setRegister((value) => ({ ...value, sessions: value.sessions.map((item) => item.id === session.id ? next : item) }));
    const result = await saveProgressApi({ kind: "session", id: session.id, monthId: session.month_id, sessionDate: next.session_date, label: next.label });
    if (!result.ok) setError(result.error || "Could not update session");
  }

  async function createMonth() {
    if (!newMonthName.trim() || !newMonthDate) return;
    const month = await addMonth(newMonthName.trim(), newMonthDate);
    setNewMonthName("");
    setMonthId(month.id);
    if (onChanged) await onChanged();
  }

  async function removeSession(sessionId) {
    if (!window.confirm("Remove this session and its attendance records?")) return;
    await saveProgressApi({ kind: "delete-session", sessionId });
    await load();
  }

  async function setAttendance(studentId, sessionId) {
    const key = studentId + ":" + sessionId;
    const current = register.attendance[key] || "";
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];
    setRegister((value) => ({ ...value, attendance: { ...value.attendance, [key]: next } }));
    await saveProgressApi({ kind: "attendance", studentId, sessionId, status: next });
  }

  async function updateStudent(studentId, field, value) {
    const current = register.progress[studentId] || {};
    const next = { ...current, [field]: value };
    setRegister((state) => ({ ...state, progress: { ...state.progress, [studentId]: next } }));
    await saveProgressApi({ kind: "student", studentId, monthId, participationScore: next.participation_score ?? "", homeworkScore: next.homework_score ?? "", level: next.level || "", notes: next.notes || "" });
  }

  async function updateSessionStudent(studentId, sessionId, field, value) {
    const key = studentId + ":" + sessionId;
    const current = register.sessionProgress[key] || {};
    const next = { ...current, [field]: value };
    setRegister((state) => ({ ...state, sessionProgress: { ...state.sessionProgress, [key]: next } }));
    await saveProgressApi({ kind: "session-student", studentId, sessionId, participationScore: next.participation_score ?? "", homeworkScore: next.homework_score ?? "", notes: next.notes || "" });
  }

  const selectedMonth = data.months.find((month) => month.id === monthId);
  const rows = useMemo(() => data.students.map((student) => {
    const progress = register.progress[student.id] || {};
    const attendance = attendanceFor(student.id, register.sessions, register.attendance);
    const sessionValues = register.sessions.map((session) => register.sessionProgress[student.id + ":" + session.id] || {});
    const participationValues = sessionValues.map((value) => asNumber(value.participation_score)).filter((value) => value !== null);
    const homeworkValues = sessionValues.map((value) => asNumber(value.homework_score)).filter((value) => value !== null);
    const participation = participationValues.length ? clamp(participationValues.reduce((sum, value) => sum + value, 0) / participationValues.length, 0, 5) : null;
    const homework = homeworkValues.length ? Math.round(clamp(homeworkValues.reduce((sum, value) => sum + value, 0) / homeworkValues.length, 0, 100)) : null;
    const scores = [attendance, participation === null ? null : participation * 20, homework].filter((score) => score !== null);
    const overall = scores.length ? Math.round(clamp(scores.reduce((sum, score) => sum + score, 0) / scores.length, 0, 100)) : null;
    return { student, progress, attendance, participation, homework, overall };
  }), [data, monthId, register]);

  if (!data.months.length) return <Card className="register-empty"><div className="flex items-start gap-3"><FolderPlus size={22} style={{ color: COLORS.success }} /><div><h2 className="font-semibold" style={{ color: COLORS.text }}>Start your class register</h2><p className="mt-1 text-sm" style={{ color: COLORS.textMuted }}>Create the first month, then add sessions and track every student from this screen.</p><div className="mt-4 flex flex-wrap items-end gap-2"><Input placeholder="Month name, e.g. September" value={newMonthName} onChange={(e) => setNewMonthName(e.target.value)} /><Input type="date" value={newMonthDate} onChange={(e) => setNewMonthDate(e.target.value)} /><Btn onClick={createMonth}><FolderPlus size={15} /> Add month</Btn></div></div></div></Card>;

  const average = (field) => {
    const values = rows.map((row) => row[field]).filter((value) => value !== null);
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
  };
  const averageOverall = average("overall");
  const atRisk = rows.filter((row) => row.overall !== null && row.overall < 60).length;
  const reportStudent = rows.find((row) => row.student.id === reportStudentId) || null;

  return (
    <div className="class-register flex flex-col gap-4">
      <div className="register-hero flex flex-wrap items-end justify-between gap-3 rounded-2xl p-5">
        <div>
          <div className="mb-1 flex items-center gap-2"><ClipboardCheck size={18} style={{ color: COLORS.accent || COLORS.success }} /><h2 className="text-xl font-semibold" style={{ color: COLORS.text }}>Class Register</h2></div>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>Set up the month first, then add its class sessions below.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="step-label">1</span><label className="text-xs font-semibold" style={{ color: COLORS.text }}>Month</label>
          <select value={monthId} onChange={(e) => setMonthId(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: COLORS.border }}>
            {data.months.map((month) => <option key={month.id} value={month.id}>{month.name}</option>)}
          </select>
          <Btn variant="ghost" onClick={() => setAddingMonth((value) => !value)}><FolderPlus size={15} /> Add month</Btn>
        </div>
      </div>

      {addingMonth && <Card><div className="flex flex-wrap items-end gap-2"><div className="min-w-[180px] flex-1"><label className="mb-1 block text-xs" style={{ color: COLORS.textMuted }}>Month name</label><Input placeholder="e.g. October 2026" value={newMonthName} onChange={(e) => setNewMonthName(e.target.value)} /></div><div><label className="mb-1 block text-xs" style={{ color: COLORS.textMuted }}>Start date</label><Input type="date" value={newMonthDate} onChange={(e) => setNewMonthDate(e.target.value)} /></div><Btn onClick={async () => { await createMonth(); setAddingMonth(false); }}><FolderPlus size={15} /> Save month</Btn></div></Card>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Students" value={rows.length} hint="in this class" />
        <SummaryCard label="Avg. progress" value={averageOverall === null ? "-" : averageOverall + "%"} hint="attendance + participation + homework" tone={scoreTone(averageOverall)} />
        <SummaryCard label="Attendance" value={average("attendance") === null ? "-" : average("attendance") + "%"} hint="monthly average" tone={scoreTone(average("attendance"))} />
        <SummaryCard label="Needs attention" value={atRisk} hint="below 60%" tone={atRisk ? "danger" : "success"} />
      </div>

      <Card>
        <div className="mb-3 flex items-center gap-2"><span className="step-label">2</span><div><p className="font-semibold" style={{ color: COLORS.text }}>Add sessions to {selectedMonth ? selectedMonth.name : "this month"}</p><p className="text-xs" style={{ color: COLORS.textMuted }}>Each session will appear automatically in attendance, participation, and homework.</p></div></div>
        <div className="flex flex-wrap items-end gap-2">
          <div><label className="mb-1 block text-xs" style={{ color: COLORS.textMuted }}>Session date</label><Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} /></div>
          <div className="min-w-[180px] flex-1"><label className="mb-1 block text-xs" style={{ color: COLORS.textMuted }}>Session name</label><Input placeholder="e.g. Week 2 - speaking" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} /></div>
          <Btn onClick={addSession}><CalendarPlus size={15} /> Add session</Btn>
        </div>
        <div className="flex flex-wrap gap-2 text-xs" style={{ color: COLORS.textMuted }}>
          <span><b style={{ color: COLORS.success }}>P</b> Present</span><span><b style={{ color: COLORS.danger }}>A</b> Absent</span><span><b style={{ color: COLORS.warn }}>L</b> Late</span><span>- Not recorded</span>
        </div>
      </Card>

      {error && <p className="text-sm" style={{ color: COLORS.danger }}>{error}</p>}
      {loading ? <p className="p-8 text-center text-sm" style={{ color: COLORS.textMuted }}>Loading register...</p> : data.students.length === 0 ? <EmptyState icon={ClipboardCheck} title="Add students first" hint="Students created by the teacher will appear in this register." /> : <>
        <AttendanceSection rows={rows} sessions={register.sessions} attendance={register.attendance} onAttendance={setAttendance} onUpdateSession={updateSession} onRemoveSession={removeSession} />
        <ParticipationSection rows={rows} sessions={register.sessions} sessionProgress={register.sessionProgress} onUpdate={updateSessionStudent} />
        <HomeworkSection rows={rows} sessions={register.sessions} sessionProgress={register.sessionProgress} onUpdate={updateSessionStudent} />
        <ProgressSection rows={rows} onReport={setReportStudentId} />
      </>}
      <Card className="report-launch no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="font-semibold" style={{ color: COLORS.text }}>Student report</p><p className="text-xs" style={{ color: COLORS.textMuted }}>Open a complete progress summary and print it as a PDF.</p></div>
          <div className="flex items-center gap-2"><select value={reportStudentId} onChange={(e) => setReportStudentId(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: COLORS.border }}><option value="">Choose a student</option>{data.students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select><Btn disabled={!reportStudentId} onClick={() => document.getElementById("student-report")?.scrollIntoView({ behavior: "smooth" })}><FileText size={15} /> Open report</Btn></div>
        </div>
      </Card>
      {reportStudent && <StudentReport row={reportStudent} month={selectedMonth} sessions={register.sessions} attendance={register.attendance} sessionProgress={register.sessionProgress} data={data} onClose={() => setReportStudentId("")} />}
      {selectedMonth && <p className="text-xs" style={{ color: COLORS.textMuted }}>All register fields are saved as you change them. Use Months &amp; Quizzes for exam creation and grading.</p>}
    </div>
  );
}

function SummaryCard({ label, value, hint, tone = "muted" }) {
  const color = tone === "success" ? COLORS.success : tone === "warn" ? COLORS.warn : tone === "danger" ? COLORS.danger : COLORS.text;
  return <Card className="summary-card"><p className="text-xs uppercase tracking-wide" style={{ color: COLORS.textMuted }}>{label}</p><p className="mt-1 text-2xl font-semibold" style={{ color }}>{value}</p><p className="text-xs" style={{ color: COLORS.textMuted }}>{hint}</p></Card>;
}

function SectionTitle({ icon: Icon, title, hint }) {
  return <div className="mb-4 flex items-start gap-3"><div className="rounded-xl p-2" style={{ background: COLORS.successSoft, color: COLORS.success }}><Icon size={17} /></div><div><h3 className="font-semibold" style={{ color: COLORS.text }}>{title}</h3><p className="text-xs" style={{ color: COLORS.textMuted }}>{hint}</p></div></div>;
}

function AttendanceSection({ rows, sessions, attendance, onAttendance, onUpdateSession, onRemoveSession }) {
  return <Card><SectionTitle icon={ClipboardCheck} title="Attendance" hint="Each session is one column. Edit its date and name in the same header box." /><div className="overflow-x-auto"><table className="min-w-[680px] w-full table-auto text-sm"><thead><tr className="border-b text-left" style={{ borderColor: COLORS.border }}><th className="p-1">Student</th>{sessions.map((session) => <th key={session.id} className="w-[112px] p-1 text-center"><SessionHeader session={session} onUpdate={onUpdateSession} onRemove={onRemoveSession} /></th>)}<th className="w-[70px] p-1 text-center">Rate</th></tr></thead><tbody>{rows.map((row) => <tr key={row.student.id} className="border-b" style={{ borderColor: COLORS.border }}><td className="p-2 font-medium">{row.student.name}</td>{sessions.map((session) => { const status = attendance[row.student.id + ":" + session.id] || ""; return <td key={session.id} className="p-2 text-center"><button onClick={() => onAttendance(row.student.id, session.id)} className="h-8 w-9 rounded-md border font-mono text-xs font-semibold" style={{ ...STATUS_COLORS[status], borderColor: STATUS_COLORS[status].color }}>{STATUS_LABELS[status]}</button></td>; })}<td className="p-2 text-center"><Chip tone={scoreTone(row.attendance)}>{row.attendance === null ? "-" : row.attendance + "%"}</Chip></td></tr>)}</tbody></table></div></Card>;
}

function SessionHeader({ session, onUpdate, onRemove }) {
  function editSession() {
    const label = window.prompt("Session name", session.label || "Session");
    if (label === null) return;
    const date = window.prompt("Session date (YYYY-MM-DD)", session.session_date);
    if (date === null) return;
    onUpdate(session, { label: label.trim() || "Session", session_date: date });
  }

  return <div className="session-header-plain mx-auto flex w-[108px] cursor-pointer flex-col items-center gap-0.5" title="Double-click to edit session" onDoubleClick={editSession}><div className="text-xs font-semibold" style={{ color: COLORS.text }}>{session.label || "Session"}</div><div className="text-[11px] font-normal" style={{ color: COLORS.textMuted }}>{fmtDate(session.session_date)}</div><button title="Remove session" onClick={() => onRemove(session.id)} className="mt-0.5" style={{ color: COLORS.danger }}><Trash2 size={13} /></button></div>;
}

function ParticipationSection({ rows, sessions, sessionProgress, onUpdate }) {
  return <Card><SectionTitle icon={FileText} title="Participation" hint="One horizontal column per session. Record each student from 0 to 5." />{sessions.length === 0 ? <p className="text-sm" style={{ color: COLORS.textMuted }}>Add a session above to start recording participation.</p> : <div className="overflow-x-auto"><table className="min-w-[720px] w-full text-sm"><thead><tr className="border-b text-left" style={{ borderColor: COLORS.border }}><th className="p-2">Student</th>{sessions.map((session) => <th key={session.id} className="p-2 text-center"><div className="truncate">{session.label || "Session"}</div><div className="text-xs font-normal" style={{ color: COLORS.textMuted }}>{fmtDate(session.session_date)}</div><div className="text-xs font-normal" style={{ color: COLORS.textMuted }}>/ 5</div></th>)}<th className="p-2 text-center">Average</th></tr></thead><tbody>{rows.map((row) => <tr key={row.student.id} className="border-b" style={{ borderColor: COLORS.border }}><td className="p-2 font-medium">{row.student.name}</td>{sessions.map((session) => { const item = sessionProgress[row.student.id + ":" + session.id] || {}; return <td key={session.id} className="p-2"><Input type="number" min="0" max="5" step="0.5" value={item.participation_score ?? ""} onChange={(e) => onUpdate(row.student.id, session.id, "participation_score", e.target.value)} /></td>; })}<td className="p-2 text-center"><Chip tone={scoreTone(row.participation === null ? null : row.participation * 20)}>{row.participation === null ? "-" : row.participation.toFixed(1)}</Chip></td></tr>)}</tbody></table></div>}</Card>;
}

function HomeworkSection({ rows, sessions, sessionProgress, onUpdate }) {
  return <Card><SectionTitle icon={FileText} title="Homework" hint="One horizontal column per session. Add the score and a short note in the same cell." />{sessions.length === 0 ? <p className="text-sm" style={{ color: COLORS.textMuted }}>Add a session above to start recording homework.</p> : <div className="overflow-x-auto"><table className="min-w-[900px] w-full text-sm"><thead><tr className="border-b text-left" style={{ borderColor: COLORS.border }}><th className="p-2">Student</th>{sessions.map((session) => <th key={session.id} className="min-w-[210px] p-2 text-center"><div className="truncate">{session.label || "Session"}</div><div className="text-xs font-normal" style={{ color: COLORS.textMuted }}>{fmtDate(session.session_date)} · /100</div></th>)}<th className="p-2 text-center">Average</th></tr></thead><tbody>{rows.map((row) => <tr key={row.student.id} className="border-b" style={{ borderColor: COLORS.border }}><td className="p-2 font-medium">{row.student.name}</td>{sessions.map((session) => { const item = sessionProgress[row.student.id + ":" + session.id] || {}; return <td key={session.id} className="p-2"><div className="flex items-center gap-1"><Input type="number" min="0" max="100" placeholder="Score" value={item.homework_score ?? ""} onChange={(e) => onUpdate(row.student.id, session.id, "homework_score", e.target.value)} /><Input placeholder="Note" value={item.notes || ""} onChange={(e) => onUpdate(row.student.id, session.id, "notes", e.target.value)} /></div></td>; })}<td className="p-2 text-center"><Chip tone={scoreTone(row.homework)}>{row.homework === null ? "-" : row.homework + "%"}</Chip></td></tr>)}</tbody></table></div>}</Card>;
}

function ProgressSection({ rows, onReport }) {
  return <Card><SectionTitle icon={FileText} title="Progress summary" hint="This summary is linked to the sections above and updates automatically." /><div className="grid gap-2 sm:grid-cols-2">{rows.map((row) => <div key={row.student.id} className="flex items-center justify-between gap-3 rounded-xl border p-3" style={{ borderColor: COLORS.border }}><div><p className="text-sm font-medium" style={{ color: COLORS.text }}>{row.student.name}</p><p className="text-xs" style={{ color: COLORS.textMuted }}>Attendance {row.attendance === null ? "-" : row.attendance + "%"} · Participation {row.participation === null ? "-" : row.participation + "/5"} · Homework {row.homework === null ? "-" : row.homework + "%"}</p></div><div className="flex items-center gap-2"><Chip tone={scoreTone(row.overall)}>{row.overall === null ? "No data" : row.overall + "%"}</Chip><button title="Open report" onClick={() => onReport(row.student.id)} className="rounded-lg p-2" style={{ color: COLORS.ink }}><FileText size={15} /></button></div></div>)}</div></Card>;
}

function RegisterRow({ row, register, onAttendance, onUpdate, onReport }) {
  const { student, progress } = row;
  return (
    <tr className="border-t" style={{ borderColor: COLORS.border, background: COLORS.surface }}>
      <td className="p-3 align-top"><button onClick={() => onReport(student.id)} className="text-left"><div className="font-medium" style={{ color: COLORS.ink }}>{student.name}</div><div className="text-xs" style={{ color: COLORS.textMuted }}>{student.email || "Open report"}</div></button></td>
      {register.sessions.map((session) => { const status = register.attendance[student.id + ":" + session.id] || ""; return <td key={session.id} className="p-2 text-center align-top"><button onClick={() => onAttendance(student.id, session.id)} className="h-8 w-9 rounded-md border font-mono text-xs font-semibold" style={{ ...STATUS_COLORS[status], borderColor: STATUS_COLORS[status].color }}>{STATUS_LABELS[status]}</button></td>; })}
      <td className="p-2 text-center align-top"><Chip tone={scoreTone(row.attendance)}>{row.attendance === null ? "-" : row.attendance + "%"}</Chip></td>
      <td className="p-2 align-top"><Input type="number" min="0" max="5" step="0.5" value={progress.participation_score ?? ""} onChange={(e) => onUpdate(student.id, "participation_score", e.target.value)} /></td>
      <td className="p-2 align-top"><Input type="number" min="0" max="100" value={progress.homework_score ?? ""} onChange={(e) => onUpdate(student.id, "homework_score", e.target.value)} /></td>
      <td className="p-2 text-center align-top"><Chip tone={scoreTone(row.overall)}>{row.overall === null ? "-" : row.overall + "%"}</Chip></td>
      <td className="p-2 align-top"><div className="flex items-center gap-2"><Input placeholder="Progress notes" value={progress.notes || ""} onChange={(e) => onUpdate(student.id, "notes", e.target.value)} /><button title="Open report" onClick={() => onReport(student.id)} className="rounded-lg p-2" style={{ color: COLORS.ink }}><FileText size={15} /></button></div></td>
    </tr>
  );
}

function StudentReport({ row, month, sessions, attendance, sessionProgress, data, onClose }) {
  const { student, progress } = row;
  const quizRows = data.quizzes.filter((quiz) => quiz.monthId === month.id).map((quiz) => {
    const submission = data.submissions.find((item) => item.quizId === quiz.id && item.studentId === student.id);
    return { quiz, submission };
  });
  const present = sessions.filter((session) => attendance[student.id + ":" + session.id] === "present").length;
  const absent = sessions.filter((session) => attendance[student.id + ":" + session.id] === "absent").length;
  const late = sessions.filter((session) => attendance[student.id + ":" + session.id] === "late").length;
  return <section id="student-report" className="student-report rounded-2xl border p-6" style={{ borderColor: COLORS.border, background: COLORS.surface }}>
    <div className="no-print mb-4 flex justify-end gap-2"><Btn variant="ghost" onClick={onClose}>Close</Btn><Btn onClick={() => window.print()}><Printer size={15} /> Print / Save PDF</Btn></div>
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b pb-5" style={{ borderColor: COLORS.border }}><div><p className="text-xs uppercase tracking-widest" style={{ color: COLORS.success }}>Progress report</p><h3 className="mt-1 text-2xl font-semibold" style={{ color: COLORS.text }}>{student.name}</h3><p className="text-sm" style={{ color: COLORS.textMuted }}>{student.email || ""} · {month.name}</p></div><div className="rounded-xl px-5 py-3 text-right" style={{ background: COLORS.successSoft }}><p className="text-xs" style={{ color: COLORS.textMuted }}>Monthly progress</p><p className="text-lg font-semibold" style={{ color: COLORS.success }}>{row.overall === null ? "No score yet" : row.overall + "%"}</p><p className="text-sm font-medium" style={{ color: COLORS.text }}>Based on register data</p></div></div>
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><ReportMetric label="Attendance" value={row.attendance === null ? "-" : row.attendance + "%"} /><ReportMetric label="Participation" value={row.participation === null ? "-" : row.participation + "/5"} /><ReportMetric label="Homework" value={row.homework === null ? "-" : row.homework + "%"} /><ReportMetric label="Progress" value={row.overall === null ? "-" : row.overall + "%"} /></div>
    <div className="mb-6 grid gap-5 sm:grid-cols-2"><div><h4 className="report-heading">Attendance history</h4><p className="text-sm" style={{ color: COLORS.textMuted }}>{present} present · {late} late · {absent} absent across {sessions.length} sessions.</p><div className="mt-3 flex flex-wrap gap-2">{sessions.length ? sessions.map((session) => <span key={session.id} className="rounded-lg px-2 py-1 text-xs" style={{ background: STATUS_COLORS[attendance[student.id + ":" + session.id] || ""].background, color: STATUS_COLORS[attendance[student.id + ":" + session.id] || ""].color }}>{fmtDate(session.session_date)}: {STATUS_LABELS[attendance[student.id + ":" + session.id] || ""]}</span>) : <span className="text-sm" style={{ color: COLORS.textMuted }}>No sessions recorded.</span>}</div></div><div><h4 className="report-heading">Teacher notes</h4><p className="whitespace-pre-wrap text-sm" style={{ color: COLORS.text }}>{progress.notes || "No notes yet."}</p></div></div>
    <h4 className="report-heading">Session-by-session record</h4><div className="mb-6 overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr className="border-b text-left" style={{ borderColor: COLORS.border }}><th className="py-2">Session</th><th className="py-2">Attendance</th><th className="py-2">Participation</th><th className="py-2">Homework</th><th className="py-2">Note</th></tr></thead><tbody>{sessions.length ? sessions.map((session) => { const key = student.id + ":" + session.id; const item = sessionProgress[key] || {}; return <tr key={session.id} className="border-b" style={{ borderColor: COLORS.border }}><td className="py-2"><b>{session.label || "Session"}</b><br /><span className="text-xs" style={{ color: COLORS.textMuted }}>{fmtDate(session.session_date)}</span></td><td className="py-2">{STATUS_LABELS[attendance[key] || ""]}</td><td className="py-2">{item.participation_score === null || item.participation_score === undefined || item.participation_score === "" ? "-" : `${clamp(Number(item.participation_score), 0, 5)}/5`}</td><td className="py-2">{item.homework_score === null || item.homework_score === undefined || item.homework_score === "" ? "-" : `${clamp(Number(item.homework_score), 0, 100)}%`}</td><td className="py-2">{item.notes || "-"}</td></tr>; }) : <tr><td className="py-3" colSpan="5">No sessions recorded.</td></tr>}</tbody></table></div>
    <h4 className="report-heading">Quiz results and teacher notes</h4><div className="flex flex-col gap-3">{quizRows.length ? quizRows.map(({ quiz, submission }) => <QuizReport quiz={quiz} submission={submission} key={quiz.id} />) : <p className="text-sm" style={{ color: COLORS.textMuted }}>No quizzes in this month.</p>}</div>
  </section>;
}

function QuizReport({ quiz, submission }) {
  const answers = submission?.answers || {};
  const [feedback, setFeedback] = useState(submission?.feedback || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const questionCount = (quiz.sections || []).reduce((sum, section) => sum + (section.items || []).length, 0);
  const answeredCount = Object.values(answers).filter((answer) => answer && (answer.text || answer.hasRecording)).length;
  const percentage = submission?.maxScore > 0 ? Math.round((submission.totalScore / submission.maxScore) * 100) : null;
  async function saveFeedback() {
    if (!submission) return;
    setSaving(true);
    await gradeSubmissionApi({ quizId: submission.quizId, studentId: submission.studentId, scores: submission.scores || {}, totalScore: submission.totalScore || 0, maxScore: submission.maxScore || 0, feedback });
    setSaving(false);
    setSaved(true);
  }
  return <div className="rounded-xl border p-4" style={{ borderColor: COLORS.border }}><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold" style={{ color: COLORS.text }}>{quiz.title}</p><p className="text-xs" style={{ color: COLORS.textMuted }}>{fmtDate(quiz.date)} · {submission ? submission.status === "graded" ? "Graded" : "Awaiting grading" : "Not submitted"}</p></div><Chip tone={submission?.status === "graded" ? "success" : "muted"}>{submission?.status === "graded" ? `${submission.totalScore}/${submission.maxScore}${percentage === null ? "" : ` · ${percentage}%`}` : "-"}</Chip></div>{submission && <p className="mt-3 text-sm" style={{ color: COLORS.textMuted }}>Answered {answeredCount} of {questionCount} questions.</p>}{submission ? <div className="mt-3"><label className="mb-1 block text-xs font-semibold" style={{ color: COLORS.text }}>Teacher summary and mistakes</label><TextArea rows={3} placeholder="Write the student's strengths, mistakes, and what to practise next..." value={feedback} onChange={(e) => { setFeedback(e.target.value); setSaved(false); }} /><div className="mt-2 flex items-center justify-between gap-2"><p className="text-xs" style={{ color: saved ? COLORS.success : COLORS.textMuted }}>{saved ? "Note saved successfully." : "This note is saved with the quiz and shown in the report."}</p>{saved ? <span className="text-xs font-semibold" style={{ color: COLORS.success }}>Saved</span> : <Btn variant="ghost" onClick={saveFeedback} disabled={saving}>{saving ? "Saving..." : "Save note"}</Btn>}</div></div> : <p className="mt-3 text-sm" style={{ color: COLORS.textMuted }}>The student has not submitted this quiz yet.</p>}</div>;
}

function ReportMetric({ label, value }) { return <div className="rounded-xl p-3" style={{ background: COLORS.paper }}><p className="text-xs" style={{ color: COLORS.textMuted }}>{label}</p><p className="mt-1 text-lg font-semibold" style={{ color: COLORS.text }}>{value}</p></div>; }
