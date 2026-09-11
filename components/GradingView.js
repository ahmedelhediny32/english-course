import { useState, useEffect } from "react";
import { Check, CircleCheck, ClipboardList } from "lucide-react";
import { Btn, Card, Chip, ScoreBadge, TextArea, EmptyState } from "./atoms";
import { COLORS, sectionMeta, quizMaxScore, looksCorrect } from "../lib/ui";
import { getRecordingApi, gradeSubmissionApi } from "../lib/api";

export default function GradingView({ quiz, submission, readOnly, onSaved }) {
  const [scores, setScores] = useState({});
  const [feedback, setFeedback] = useState("");
  const [recordings, setRecordings] = useState({});
  const [loadingRec, setLoadingRec] = useState(true);
  const [saving, setSaving] = useState(false);

  const subKey = submission ? `${submission.quizId}:${submission.studentId}` : null;

  useEffect(() => {
    setScores((submission && submission.scores) || {});
    setFeedback((submission && submission.feedback) || "");
  }, [subKey]);

  useEffect(() => {
    let cancelled = false;
    async function loadRecs() {
      if (!submission) { setLoadingRec(false); return; }
      setLoadingRec(true);
      const entries = {};
      for (const sec of quiz.sections || []) {
        if (sec.type !== "recording" && sec.type !== "reading") continue;
        for (const item of sec.items || []) {
          const ans = submission.answers && submission.answers[item.id];
          if (ans && ans.hasRecording) {
            entries[item.id] = await getRecordingApi(quiz.id, submission.studentId, item.id);
          }
        }
      }
      if (!cancelled) { setRecordings(entries); setLoadingRec(false); }
    }
    loadRecs();
    return () => { cancelled = true; };
  }, [subKey, quiz.id]);

  if (!submission) {
    return <EmptyState icon={ClipboardList} title="Hasn't submitted this quiz yet" hint="It'll show up here as soon as the student submits their answers." />;
  }

  const maxTotal = quizMaxScore(quiz);
  const totalNow = Object.values(scores).reduce((a, v) => a + (Number(v) || 0), 0);

  async function save() {
    setSaving(true);
    await gradeSubmissionApi({ quizId: submission.quizId, studentId: submission.studentId, scores, totalScore: totalNow, maxScore: maxTotal, feedback });
    setSaving(false);
    onSaved && onSaved();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Chip tone={submission.status === "graded" ? "success" : "warn"}>
          {submission.status === "graded" ? "Graded" : "Awaiting grading"}
        </Chip>
        <ScoreBadge score={totalNow} max={maxTotal} size="lg" />
      </div>

      {(quiz.sections || []).map((sec) => (
        <Card key={sec.id}>
          <p className="mb-3 text-sm font-semibold" style={{ color: COLORS.ink }}>{sec.title || sectionMeta(sec.type).label}</p>
          <div className="flex flex-col gap-4">
            {(sec.items || []).map((item) => {
              const ans = (submission.answers && submission.answers[item.id]) || {};
              return (
                <div key={item.id} className="border-t pt-3 first:border-t-0 first:pt-0" style={{ borderColor: COLORS.border }}>
                  {sec.type === "vocab" && (
                    <div className="flex flex-col gap-1">
                      <p className="text-sm" style={{ color: COLORS.textMuted }}>Word: <span dir="rtl" className="font-semibold" style={{ color: COLORS.text }}>{item.arabic}</span></p>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="rounded-md px-2 py-1" style={{ background: COLORS.paper, color: COLORS.text }}>{ans.text || "—"}</span>
                        {looksCorrect(ans.text, item.english) === true && <CircleCheck size={16} style={{ color: COLORS.success }} />}
                        {looksCorrect(ans.text, item.english) === false && <span className="text-xs" style={{ color: COLORS.textMuted }}>Correct: {item.english}</span>}
                      </div>
                    </div>
                  )}
                  {(sec.type === "recording" || sec.type === "reading") && (
                    <div className="flex flex-col gap-2">
                      {sec.type === "recording" ? (
                        <p className="text-sm" style={{ color: COLORS.textMuted }}>Word: <span className="font-semibold" style={{ color: COLORS.text }}>{item.prompt}</span></p>
                      ) : (
                        <p className="rounded-lg p-3 text-sm leading-7" style={{ background: COLORS.paper, color: COLORS.text }}>{item.passage}</p>
                      )}
                      {loadingRec ? (
                        <p className="text-xs" style={{ color: COLORS.textMuted }}>Loading recording…</p>
                      ) : recordings[item.id] ? (
                        <audio controls src={recordings[item.id]} className="h-10" style={{ maxWidth: 320 }} />
                      ) : (
                        <p className="text-xs" style={{ color: COLORS.danger }}>No recording</p>
                      )}
                    </div>
                  )}
                  {sec.type === "essay" && (
                    <div className="flex flex-col gap-1">
                      <p className="text-sm" style={{ color: COLORS.textMuted }}>{item.prompt}</p>
                      <p className="rounded-lg p-2 text-sm" style={{ background: COLORS.paper, color: COLORS.text }}>{ans.text || "—"}</p>
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs" style={{ color: COLORS.textMuted }}>Score</span>
                    {readOnly ? (
                      <span className="text-sm font-semibold" style={{ color: COLORS.text }}>{scores[item.id] ?? 0} / {item.maxScore}</span>
                    ) : (
                      <>
                        <input
                          type="number"
                          min={0}
                          max={item.maxScore}
                          step="0.5"
                          value={scores[item.id] ?? ""}
                          onChange={(e) => setScores((s) => ({ ...s, [item.id]: e.target.value === "" ? 0 : Number(e.target.value) }))}
                          className="w-20 rounded-lg border px-2 py-1 text-sm outline-none"
                          style={{ borderColor: COLORS.border }}
                        />
                        <span className="text-xs" style={{ color: COLORS.textMuted }}>/ {item.maxScore}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      <Card>
        <label className="mb-1 block text-xs font-semibold" style={{ color: COLORS.text }}>Teacher summary and mistakes</label>
        {readOnly ? (
          <p className="text-sm" style={{ color: COLORS.text }}>{feedback || "—"}</p>
        ) : (
          <TextArea rows={3} placeholder="Write strengths, mistakes, and what the student should practise next..." value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        )}
      </Card>

      {!readOnly && <Btn onClick={save} disabled={saving}><Check size={16} /> {saving ? "Saving…" : "Save grade"}</Btn>}
    </div>
  );
}
