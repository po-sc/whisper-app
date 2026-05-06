import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Translations } from "../i18n";

interface Props {
  t: Translations;
  file: string; model: string; language: string; format: string; outputFolder: string;
  onDone: (text: string, path: string) => void;
  onCancel: () => void;
}

type Stage = "loading" | "extracting" | "transcribing" | "saving";

export default function ProgressView({ t, file, model, language, format, outputFolder, onDone, onCancel }: Props) {
  const [stage, setStage] = useState<Stage>("loading");
  const [progress, setProgress] = useState(5);
  const [error, setError] = useState("");

  const stageLabel: Record<Stage, string> = {
    loading: t.stageLoading,
    extracting: t.stageExtracting,
    transcribing: t.stageTranscribing,
    saving: t.stageSaving,
  };

  useEffect(() => {
    let cancelled = false;
    const unsub = listen<{ stage: Stage; progress: number }>("transcribe-progress", (e) => {
      if (!cancelled) { setStage(e.payload.stage); setProgress(e.payload.progress); }
    });

    invoke<{ text: string; path: string }>("transcribe", { file, model, language, format, outputFolder: outputFolder || null })
      .then(({ text, path }) => { if (!cancelled) onDone(text, path); })
      .catch((e) => { if (!cancelled) setError(String(e)); });

    return () => { cancelled = true; unsub.then(fn => fn()); };
  }, []);

  const emoji = error ? "❌" : stage === "transcribing" ? "🎙" : stage === "loading" ? "⚙️" : "🔄";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28 }}>
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 56, lineHeight: 1 }}>{emoji}</div>
        {!error && (
          <div style={{
            position: "absolute", inset: -8,
            borderRadius: "50%",
            border: "2px solid transparent",
            borderTopColor: "var(--accent)",
            animation: "spin 1s linear infinite",
          }} />
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>

      <div style={{ textAlign: "center", width: "100%" }}>
        <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
          {error ? t.errorTitle : stageLabel[stage]}
        </p>
        {error && <p style={{ color: "var(--red)", fontSize: 12, maxWidth: 360, margin: "0 auto" }}>{error}</p>}
      </div>

      {!error && (
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ background: "var(--surface2)", borderRadius: 999, height: 6, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 999,
              background: "linear-gradient(90deg, var(--accent), var(--accent2))",
              width: `${progress}%`,
              transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
              boxShadow: "0 0 8px rgba(139,92,246,0.5)",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ color: "var(--muted)", fontSize: 11 }}>{model}</span>
            <span style={{ color: "var(--muted)", fontSize: 11 }}>{progress}%</span>
          </div>
        </div>
      )}

      <button className="btn-ghost" onClick={onCancel}>
        {error ? t.btnBack : t.btnCancel}
      </button>
    </div>
  );
}
