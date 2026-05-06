import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Translations } from "../i18n";

interface Props {
  t: Translations;
  file: string; model: string; language: string; format: string; outputFolder: string;
  onDone: (text: string, path: string) => void;
  onCancel: () => void;
}

type Stage = "loading" | "transcribing" | "saving";

const STAGE_ORDER: Stage[] = ["loading", "transcribing", "saving"];
const STAGE_PROGRESS: Record<Stage, number> = {
  loading: 15,
  transcribing: 55,
  saving: 92,
};

export default function ProgressView({ t, file, model, language, format, outputFolder, onDone, onCancel }: Props) {
  const [stage, setStage] = useState<Stage>("loading");
  const [progress, setProgress] = useState(5);
  const [error, setError] = useState("");
  const startRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const unsub = listen<{ stage: Stage; progress: number }>("transcribe-progress", (e) => {
      if (!cancelled) {
        setStage(e.payload.stage);
        setProgress(e.payload.progress);
      }
    });

    invoke<{ text: string; path: string }>("transcribe", {
      file, model, language, format, outputFolder: outputFolder || null,
    })
      .then(({ text, path }) => { if (!cancelled) onDone(text, path); })
      .catch((e) => { if (!cancelled) setError(String(e)); });

    return () => { cancelled = true; unsub.then(fn => fn()); };
  // Props are stable for the lifetime of this component — it mounts once per transcription
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stageLabel: Record<Stage, string> = {
    loading: t.stageLoading,
    transcribing: t.stageTranscribing,
    saving: t.stageSaving,
  };

  const currentIdx = STAGE_ORDER.indexOf(stage);
  const displayProgress = error ? 0 : Math.max(progress, STAGE_PROGRESS[stage] ?? 5);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32 }}>

      {/* Spinner / error icon */}
      <div style={{ position: "relative", width: 72, height: 72, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 36, lineHeight: 1 }}>{error ? "❌" : "🎙"}</span>
        {!error && (
          <>
            <svg style={{ position: "absolute", inset: 0, animation: "spin 2s linear infinite" }} viewBox="0 0 72 72" fill="none">
              <circle cx="36" cy="36" r="33" stroke="#2a2a4a" strokeWidth="3" />
              <circle cx="36" cy="36" r="33" stroke="url(#g)" strokeWidth="3"
                strokeDasharray="207" strokeDashoffset={207 - (207 * displayProgress / 100)}
                strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="72" y2="72" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#7c3aed" />
                  <stop offset="1" stopColor="#2563eb" />
                </linearGradient>
              </defs>
            </svg>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </>
        )}
      </div>

      {/* Stage info */}
      <div style={{ textAlign: "center" }}>
        {error ? (
          <>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: "#ef4444" }}>{t.errorTitle}</p>
            <p style={{ color: "#ef444488", fontSize: 12, maxWidth: 340, lineHeight: 1.6 }}>{error}</p>
          </>
        ) : (
          <>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{stageLabel[stage]}</p>
            <p style={{ color: "#5050a0", fontSize: 12 }}>{model} · {fmt(elapsed)}</p>
          </>
        )}
      </div>

      {/* Step indicators */}
      {!error && (
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {STAGE_ORDER.map((s, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            return (
              <div key={s} style={{ display: "flex", alignItems: "center" }}>
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                  minWidth: 70,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    background: done ? "#22d97a" : active ? "linear-gradient(135deg,#7c3aed,#2563eb)" : "#1e1e38",
                    border: `2px solid ${done ? "#22d97a" : active ? "transparent" : "#2a2a4a"}`,
                    fontSize: 13, fontWeight: 700,
                    color: done || active ? "#fff" : "#404060",
                    transition: "all 0.4s",
                    boxShadow: active ? "0 0 12px rgba(124,58,237,0.5)" : done ? "0 0 8px rgba(34,217,122,0.4)" : "none",
                  }}>
                    {done ? "✓" : i + 1}
                  </div>
                  <span style={{ fontSize: 9, color: done ? "#22d97a" : active ? "#a78bfa" : "#404060", fontWeight: active ? 700 : 400, whiteSpace: "nowrap", transition: "all 0.4s" }}>
                    {stageLabel[s]}
                  </span>
                </div>
                {i < STAGE_ORDER.length - 1 && (
                  <div style={{
                    width: 24, height: 2, marginBottom: 16,
                    background: done ? "#22d97a44" : "#1e1e38",
                    transition: "background 0.4s",
                  }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Progress bar */}
      {!error && (
        <div style={{ width: "100%", maxWidth: 360 }}>
          <div style={{ background: "#1e1e38", borderRadius: 999, height: 6, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 999,
              background: "linear-gradient(90deg, #7c3aed, #9b6dff, #2563eb)",
              width: `${displayProgress}%`,
              transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
              boxShadow: "0 0 10px rgba(139,92,246,0.5)",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
            <span style={{ color: "#5050a0", fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{displayProgress}%</span>
          </div>
        </div>
      )}

      <button className="btn-ghost" onClick={onCancel}>
        {error ? t.btnBack : t.btnCancel}
      </button>
    </div>
  );
}
