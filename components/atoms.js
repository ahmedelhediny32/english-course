import { useState, useEffect } from "react";
import { Trash2, BookOpen, LogOut } from "lucide-react";
import { COLORS, scoreColor } from "../lib/ui";

export function Btn({ children, onClick, variant = "primary", type = "button", className = "", disabled, title }) {
  const base = "inline-flex items-center gap-1.5 justify-center rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed active:opacity-80";
  const styles = {
    primary: { background: COLORS.ink, color: "#fff" },
    gold: { background: COLORS.gold, color: "#2b2109" },
    ghost: { background: "transparent", color: COLORS.ink, border: `1px solid ${COLORS.border}` },
    danger: { background: COLORS.danger, color: "#fff" },
    subtle: { background: COLORS.paper, color: COLORS.ink },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} className={base + " " + className} style={styles[variant]}>
      {children}
    </button>
  );
}

export function Input(props) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={"w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-800/40 " + className}
      style={{ borderColor: COLORS.border, color: COLORS.text }}
    />
  );
}

export function TextArea(props) {
  const { className = "", ...rest } = props;
  return (
    <textarea
      {...rest}
      className={"w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-800/40 " + className}
      style={{ borderColor: COLORS.border, color: COLORS.text }}
    />
  );
}

export function Card({ children, className = "", style = {} }) {
  return (
    <div className={"rounded-2xl border p-4 " + className} style={{ background: COLORS.surface, borderColor: COLORS.border, ...style }}>
      {children}
    </div>
  );
}

export function Chip({ children, tone = "muted" }) {
  const tones = {
    muted: { background: COLORS.paper, color: COLORS.textMuted },
    success: { background: COLORS.successSoft, color: COLORS.success },
    warn: { background: COLORS.warnSoft, color: COLORS.warn },
    danger: { background: COLORS.dangerSoft, color: COLORS.danger },
    gold: { background: COLORS.goldSoft, color: "#7A5C13" },
  };
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium" style={tones[tone]}>
      {children}
    </span>
  );
}

export function ScoreBadge({ score, max, size = "md", hideFraction = false }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  const big = size === "lg";
  return (
    <div className="flex items-baseline gap-1.5">
      <span style={{ fontSize: big ? 30 : 18, fontWeight: 700, color: scoreColor(pct) }}>{pct}%</span>
      {!hideFraction && <span className="text-xs" style={{ color: COLORS.textMuted }}>({score}/{max})</span>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: COLORS.paper }}>
        <Icon size={22} style={{ color: COLORS.textMuted }} />
      </div>
      <p className="font-semibold" style={{ color: COLORS.text }}>{title}</p>
      {hint && <p className="max-w-xs text-sm" style={{ color: COLORS.textMuted }}>{hint}</p>}
      {action}
    </div>
  );
}

export function ConfirmDelete({ onConfirm, label = "Delete" }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  if (!armed) {
    return (
      <button onClick={() => setArmed(true)} title={label} className="rounded-lg p-2 hover:bg-red-50" style={{ color: COLORS.danger }}>
        <Trash2 size={16} />
      </button>
    );
  }
  return (
    <button onClick={onConfirm} className="rounded-lg px-2 py-1 text-xs font-medium text-white" style={{ background: COLORS.danger }}>
      Click to confirm
    </button>
  );
}

export function Header({ roleLabel, name, onLogout, tabs, activeTab, onTab }) {
  return (
    <div className="sticky top-0 z-10 border-b" style={{ background: COLORS.surface, borderColor: COLORS.border }}>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: COLORS.ink }}>
            <BookOpen size={16} color="#fff" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-4" style={{ color: COLORS.text }}>Quiz Notebook</p>
            <p className="text-xs leading-4" style={{ color: COLORS.textMuted }}>{roleLabel} — {name}</p>
          </div>
        </div>
        <button onClick={onLogout} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium" style={{ color: COLORS.textMuted }}>
          <LogOut size={14} /> Log out
        </button>
      </div>
      {tabs && (
        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => onTab(t.key)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium"
              style={activeTab === t.key ? { background: COLORS.ink, color: "#fff" } : { color: COLORS.textMuted }}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
