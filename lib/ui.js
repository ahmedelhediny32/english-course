export const COLORS = {
  ink: "#1B3B36",
  inkDark: "#0F2622",
  paper: "#EEF1EF",
  surface: "#FFFFFF",
  gold: "#C79A3D",
  goldSoft: "#EFE1BE",
  success: "#3F7D58",
  successSoft: "#E1EEE4",
  warn: "#C87F2B",
  warnSoft: "#F6E7D6",
  danger: "#B34B3C",
  dangerSoft: "#F5E1DD",
  text: "#1E2422",
  textMuted: "#5B655F",
  border: "#DADFDA",
};

export const SECTION_TYPES = [
  { key: "vocab", label: "Word Translation", hint: "Write a word in Arabic — the student answers in English.", defaultMax: 2 },
  { key: "recording", label: "Pronunciation Recording", hint: "Pick words — the student records themselves saying them.", defaultMax: 5 },
  { key: "reading", label: "Reading Passage (Recording)", hint: "Write a passage — the student records themselves reading it aloud.", defaultMax: 10 },
  { key: "essay", label: "Written Response", hint: "An open question — the student types their answer.", defaultMax: 10 },
];

export function sectionMeta(type) {
  return SECTION_TYPES.find((s) => s.key === type) || SECTION_TYPES[0];
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
  } catch (e) {
    return d;
  }
}

export function scoreColor(pct) {
  if (pct >= 85) return COLORS.success;
  if (pct >= 60) return COLORS.warn;
  return COLORS.danger;
}

export function looksCorrect(ans, correct) {
  if (!ans || !correct) return null;
  const norm = (s) => s.trim().toLowerCase().replace(/[^a-z ]/g, "");
  const a = norm(ans), b = norm(correct);
  if (!a || !b) return null;
  return a === b;
}

export function quizMaxScore(quiz) {
  return (quiz.sections || []).reduce((sum, sec) => sum + (sec.items || []).reduce((s2, it) => s2 + (Number(it.maxScore) || 0), 0), 0);
}

export function monthStats(data, studentId) {
  return data.months
    .map((m) => {
      const quizzesInMonth = data.quizzes.filter((q) => q.monthId === m.id);
      let subs = data.submissions.filter((s) => quizzesInMonth.some((q) => q.id === s.quizId) && s.status === "graded");
      if (studentId) subs = subs.filter((s) => s.studentId === studentId);
      const total = subs.reduce((a, s) => a + (s.totalScore || 0), 0);
      const max = subs.reduce((a, s) => a + (s.maxScore || 0), 0);
      const pct = max > 0 ? Math.round((total / max) * 100) : null;
      return { id: m.id, name: m.name, date: m.date, pct, count: subs.length };
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function exportExcel(data, XLSX) {
  const rows = data.submissions
    .slice()
    .sort((a, b) => (a.studentName || "").localeCompare(b.studentName || ""))
    .map((sub) => {
      const quiz = data.quizzes.find((q) => q.id === sub.quizId);
      const month = quiz && data.months.find((m) => m.id === quiz.monthId);
      const pct = sub.status === "graded" && sub.maxScore ? Math.round((sub.totalScore / sub.maxScore) * 100) : "";
      return {
        Student: sub.studentName || "",
        Month: month ? month.name : "",
        Quiz: quiz ? quiz.title : "",
        Date: quiz ? quiz.date : "",
        Status: sub.status === "graded" ? "Graded" : "Awaiting grading",
        Score: sub.status === "graded" ? sub.totalScore : "",
        "Out of": sub.status === "graded" ? sub.maxScore : "",
        "Percentage %": pct,
      };
    });
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 20 }, { wch: 16 }, { wch: 24 }, { wch: 14 }, { wch: 16 }, { wch: 10 }, { wch: 8 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Grades");
  XLSX.writeFile(wb, "student_grades.xlsx");
}
