import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Translations } from "../i18n";

interface ModelInfo {
  name: string;
  file: string;
  size: string;
  downloaded: boolean;
}

interface Props {
  t: Translations;
  onClose: () => void;
}

const MODEL_LIST: Omit<ModelInfo, "downloaded">[] = [
  { name: "tiny",     file: "tiny.pt",             size: "75 MB" },
  { name: "base",     file: "base.pt",             size: "145 MB" },
  { name: "small",    file: "small.pt",            size: "465 MB" },
  { name: "medium",   file: "medium.pt",           size: "1.5 GB" },
  { name: "turbo",    file: "large-v3-turbo.pt",   size: "809 MB" },
  { name: "large-v2", file: "large-v2.pt",         size: "3 GB" },
  { name: "large-v3", file: "large-v3.pt",         size: "3 GB" },
];

export default function ModelManager({ t, onClose }: Props) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    loadStatus();
    const unsub = listen<{ progress: number }>("download-progress", (e) => {
      setDownloadProgress(e.payload.progress);
    });
    return () => { unsub.then(fn => fn()); };
  }, []);

  const loadStatus = async () => {
    const status = await invoke<Record<string, boolean>>("get_model_status");
    setModels(MODEL_LIST.map(m => ({ ...m, downloaded: status[m.name] ?? false })));
  };

  const handleDownload = async (name: string) => {
    setDownloading(name);
    setDownloadProgress(0);
    try {
      await invoke("download_model", { model: name });
      await loadStatus();
    } catch (e) {
      console.error(e);
    }
    setDownloading(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">⊞ {t.modelsTitle}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {models.map(m => (
            <ModelRow
              key={m.name}
              model={m}
              t={t}
              isDownloading={downloading === m.name}
              progress={downloading === m.name ? downloadProgress : 0}
              onDownload={() => handleDownload(m.name)}
              disabled={!!downloading && downloading !== m.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ModelRow({ model, t, isDownloading, progress, onDownload, disabled }: {
  model: ModelInfo; t: Translations; isDownloading: boolean;
  progress: number; onDownload: () => void; disabled: boolean;
}) {
  const isRecommended = model.name === "turbo";

  return (
    <div style={{
      background: model.downloaded ? "rgba(34,217,122,0.05)" : "#16162a",
      border: `1px solid ${model.downloaded ? "rgba(34,217,122,0.2)" : "#2a2a4a"}`,
      borderRadius: 10,
      padding: "12px 14px",
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}>
      {/* Status dot */}
      <div style={{
        width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
        background: model.downloaded ? "var(--green)" : isDownloading ? "var(--accent)" : "var(--border)",
        boxShadow: model.downloaded ? "0 0 6px var(--green)" : isDownloading ? "0 0 6px var(--accent)" : "none",
      }} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: isDownloading ? 6 : 0 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{model.name}</span>
          {isRecommended && (
            <span style={{ fontSize: 10, background: "rgba(139,92,246,0.2)", color: "var(--accent)", padding: "1px 6px", borderRadius: 20, fontWeight: 600 }}>
              ★ rec
            </span>
          )}
          <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: "auto" }}>{model.size}</span>
        </div>

        {isDownloading && (
          <div>
            <div style={{ background: "var(--border)", borderRadius: 999, height: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 999,
                background: "linear-gradient(90deg, var(--accent), var(--accent2))",
                width: progress > 0 ? `${progress}%` : "30%",
                transition: progress > 0 ? "width 0.3s" : "none",
                animation: progress === 0 ? "indeterminate 1.5s ease infinite" : "none",
              }} />
            </div>
            <style>{`@keyframes indeterminate { 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} }`}</style>
          </div>
        )}
      </div>

      {/* Action */}
      {model.downloaded ? (
        <span style={{
          fontSize: 11, color: "#22d97a", fontWeight: 700, flexShrink: 0,
          background: "rgba(34,217,122,0.12)", padding: "4px 10px",
          borderRadius: 20, border: "1px solid rgba(34,217,122,0.25)",
        }}>
          ✓ {t.modelDownloaded}
        </span>
      ) : isDownloading ? (
        <span style={{ fontSize: 11, color: "#c0c0e0", flexShrink: 0, fontWeight: 600 }}>
          {progress > 0 ? `${progress}%` : "..."}
        </span>
      ) : (
        <button onClick={onDownload} disabled={disabled} style={{
          padding: "6px 14px",
          background: disabled ? "#1a1a2a" : "linear-gradient(135deg, #7c3aed, #2563eb)",
          border: "none",
          borderRadius: 8,
          color: disabled ? "#505070" : "#ffffff",
          fontSize: 12, fontWeight: 600,
          cursor: disabled ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          flexShrink: 0,
          transition: "opacity 0.15s",
          opacity: disabled ? 0.5 : 1,
        }}>
          ⬇ {t.modelDownload}
        </button>
      )}
    </div>
  );
}
