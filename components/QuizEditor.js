import { useState } from "react";
import { ArrowRight, Check, Plus, X } from "lucide-react";
import { Btn, Card, Chip, ConfirmDelete, Input, TextArea } from "./atoms";
import { COLORS, SECTION_TYPES, sectionMeta, uid } from "../lib/ui";
import { saveQuizApi, deleteQuizApi } from "../lib/api";

function SectionItemsList({ section, onAdd, onRemove }) {
  const meta = sectionMeta(section.type);
  const [arabic, setArabic] = useState("");
  const [english, setEnglish] = useState("");
  const [prompt, setPrompt] = useState("");
  const [passage, setPassage] = useState("");
  const [maxScore, setMaxScore] = useState(meta.defaultMax);
  const [error, setError] = useState("");

  function submit() {
    if (section.type === "vocab") {
      if (!arabic.trim() || !english.trim()) {
        setError("Enter both the Arabic word and its English answer.");
        return;
      }
      onAdd({ id: uid(), arabic: arabic.trim(), english: english.trim(), maxScore });
      setArabic(""); setEnglish("");
    } else if (section.type === "recording") {
      if (!prompt.trim()) { setError("Enter the word to pronounce."); return; }
      onAdd({ id: uid(), prompt: prompt.trim(), maxScore });
      setPrompt("");
    } else if (section.type === "reading") {
      if (!passage.trim()) { setError("Enter the reading passage."); return; }
      onAdd({ id: uid(), passage: passage.trim(), maxScore });
      setPassage("");
    } else if (section.type === "essay") {
      if (!prompt.trim()) { setError("Enter the question text."); return; }
      onAdd({ id: uid(), prompt: prompt.trim(), maxScore });
      setPrompt("");
    }
    setError("");
  }

  return (
    <div className="flex flex-col gap-3">
      {(section.items || []).map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2" style={{ background: COLORS.paper }}>
          <div className="min-w-0 flex-1 text-sm" style={{ color: COLORS.text }}>
            {section.type === "vocab" && <span><span dir="rtl">{item.arabic}</span> <span style={{ color: COLORS.textMuted }}>→ {item.english}</span></span>}
            {section.type === "recording" && <span>{item.prompt}</span>}
            {section.type === "reading" && <span className="line-clamp-1">{item.passage}</span>}
            {section.type === "essay" && <span className="line-clamp-1">{item.prompt}</span>}
          </div>
          <span className="shrink-0 text-xs" style={{ color: COLORS.textMuted }}>{item.maxScore} pts</span>
          <button onClick={() => onRemove(item.id)} className="shrink-0 rounded p-1 hover:bg-red-50" style={{ color: COLORS.danger }}><X size={14} /></button>
        </div>
      ))}

      <div className="flex flex-wrap items-end gap-2 border-t pt-3" style={{ borderColor: COLORS.border }}>
        {section.type === "vocab" && (
          <>
            <Input dir="rtl" placeholder="Word (Arabic)" value={arabic} onChange={(e) => setArabic(e.target.value)} className="max-w-[160px]" />
            <Input placeholder="English answer" value={english} onChange={(e) => setEnglish(e.target.value)} className="max-w-[160px]" />
          </>
        )}
        {section.type === "recording" && (
          <Input placeholder="Word to pronounce" value={prompt} onChange={(e) => setPrompt(e.target.value)} className="max-w-[220px]" />
        )}
        {section.type === "reading" && (
          <TextArea placeholder="Passage text" value={passage} onChange={(e) => setPassage(e.target.value)} rows={2} className="max-w-md" />
        )}
        {section.type === "essay" && (
          <Input placeholder="Question text" value={prompt} onChange={(e) => setPrompt(e.target.value)} className="max-w-md" />
        )}
        <div className="flex items-center gap-1">
          <label className="text-xs" style={{ color: COLORS.textMuted }}>Points</label>
          <input type="number" min={0} value={maxScore} onChange={(e) => setMaxScore(Number(e.target.value))} className="w-16 rounded-lg border px-2 py-2 text-sm" style={{ borderColor: COLORS.border }} />
        </div>
        <Btn variant="ghost" onClick={submit}><Plus size={14} /> Add</Btn>
      </div>
      {error && <p className="text-xs" style={{ color: COLORS.danger }}>{error}</p>}
    </div>
  );
}

export default function QuizEditor({ monthId, existing, onCancel, onSaved }) {
  const [title, setTitle] = useState((existing && existing.title) || "");
  const [date, setDate] = useState((existing && existing.date) || new Date().toISOString().slice(0, 10));
  const [sections, setSections] = useState((existing && existing.sections) || []);
  const [newSectionType, setNewSectionType] = useState("vocab");
  const [saving, setSaving] = useState(false);

  function addSection() {
    const meta = sectionMeta(newSectionType);
    setSections((s) => [...s, { id: uid(), type: newSectionType, title: meta.label, items: [] }]);
  }
  function removeSection(id) { setSections((s) => s.filter((x) => x.id !== id)); }
  function updateSection(id, patch) { setSections((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x))); }
  function addItem(sectionId, item) {
    setSections((s) => s.map((x) => (x.id === sectionId ? { ...x, items: [...x.items, item] } : x)));
  }
  function removeItem(sectionId, itemId) {
    setSections((s) => s.map((x) => (x.id === sectionId ? { ...x, items: x.items.filter((i) => i.id !== itemId) } : x)));
  }

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    await saveQuizApi({ id: existing && existing.id, monthId, title: title.trim(), date, sections });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onCancel} className="inline-flex w-fit items-center gap-1 text-sm" style={{ color: COLORS.textMuted }}><ArrowRight size={16} className="rotate-180" /> Back</button>
      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs" style={{ color: COLORS.textMuted }}>Quiz title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Unit 3 vocabulary quiz" />
          </div>
          <div>
            <label className="mb-1 block text-xs" style={{ color: COLORS.textMuted }}>Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
      </Card>

      {sections.map((sec) => (
        <Card key={sec.id}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <Input value={sec.title} onChange={(e) => updateSection(sec.id, { title: e.target.value })} className="max-w-xs font-semibold" />
            <div className="flex items-center gap-2">
              <Chip>{sectionMeta(sec.type).label}</Chip>
              <ConfirmDelete onConfirm={() => removeSection(sec.id)} />
            </div>
          </div>
          <SectionItemsList section={sec} onAdd={(item) => addItem(sec.id, item)} onRemove={(itemId) => removeItem(sec.id, itemId)} />
        </Card>
      ))}

      <Card>
        <p className="mb-2 text-sm font-semibold" style={{ color: COLORS.text }}>Add a new section</p>
        <div className="flex flex-wrap items-center gap-2">
          <select value={newSectionType} onChange={(e) => setNewSectionType(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: COLORS.border }}>
            {SECTION_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <Btn variant="ghost" onClick={addSection}><Plus size={15} /> Add section</Btn>
        </div>
        <p className="mt-2 text-xs" style={{ color: COLORS.textMuted }}>{sectionMeta(newSectionType).hint}</p>
      </Card>

      <div className="flex items-center gap-2">
        <Btn onClick={save} disabled={saving || !title.trim()}><Check size={16} /> {saving ? "Saving…" : "Save quiz"}</Btn>
        {existing && <ConfirmDelete label="Delete quiz" onConfirm={async () => { await deleteQuizApi(existing.id); onSaved(); }} />}
      </div>
    </div>
  );
}
