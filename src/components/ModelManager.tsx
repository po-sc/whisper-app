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
  { name: "tiny",     file: "tiny.pt",           size: "75 MB" },
  { name: "base",     file: "base.pt",           size: "145 MB" },
  { name: "small",    file: "small.pt",          size: "465 MB" },
  { name: "medium",   file: "medium.pt",         size: "1.5 GB" },
  { name: "turbo",    file: "large-v3-turbo.pt", size: "809 MB" },
  { name: "large-v2", file: "large-v2.pt",       size: "3 GB" },
  { name: "large-v3", file: "large-v3.pt",       size: "3 GB" },
];

export default function ModelManager({ t, onClose }: Props) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);

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

  const handleDelete = async (name: string) => {
    setDeleting(name);
    try {
      await invoke("delete_model", { model: name });
      await loadStatus();
    } catch (e) {
      console.error(e);
    }
    setDeleting(null);
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
              isDeleting={deleting === m.name}
              progress={downloading === m.name ? downloadProgress : 0}
              onDownload={() => handleDownload(m.name)}
              onDelete={() => handleDelete(m.name)}
              disabled={(!!downloading && downloading !== m.name) || !!deleting}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ModelRow({ model, t, isDownloading, isDeleting, progress, onDownload, onDelete, disabled }: {
  model: ModelInfo; t: Translations;
  isDownloading: boolean; isDeleting: boolean;
  progress: number; onDownload: () => void; onDelete: () => void; disabled: boolean;
}) {
  const isRecommended = model.name === "turbo";

  return (
    <div style={{
      background: model.downloaded ? "rgba(34,217,122,0.04)" : "#16162a",
      border: `1px solid ${model.downloaded ? "rgba(34,217,122,0.18)" : "#2a2a4a"}`,
      borderRadius: 10,
      padding: "12px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Status dot */}
        <div style={{
          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
          background: model.downloaded ? "#22d97a" : isDownloading ? "#9b6dff" : "#2a2a4a",
          boxShadow: model.downloaded ? "0 0 6px #22d97a66" : isDownloading ? "0 0 6px #9b6dff66" : "none",
          transition: "all 0.3s",
        }} />

        {/* Name */}
        <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{model.name}</span>

        {isRecommended && (
          <span style={{ fontSize: 10, background: "rgba(139,92,246,0.2)", color: "#9b6dff", padding: "1px 7px", borderRadius: 20, fontWeight: 700 }}>
            ★ rec
          </span>
        )}

        <span style={{ color: "#5050a0", fontSize: 12, flexShrink: 0 }}>{model.size}</span>

        {/* Action */}
        {model.downloaded ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span style={{
              fontSize: 11, color: "#22d97a", fontWeight: 700,
              background: "rgba(34,217,122,0.12)", padding: "4px 10px",
              borderRadius: 20, border: "1px solid rgba(34,217,122,0.2)",
            }}>
              ✓ {t.modelDownloaded}
            </span>
            <button
              onClick={onDelete}
              disabled={isDeleting || disabled}
              title={t.modelDelete}
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: isDeleting || disabled ? "#50506a" : "#ef4444",
                fontSize: 14, cursor: isDeleting || disabled ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s", flexShrink: 0, padding: 0,
              }}
              onMouseEnter={e => { if (!isDeleting && !disabled) e.currentTarget.style.background = "rgba(239,68,68,0.22)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
            >
              {isDeleting ? "…" : "🗑"}
            </button>
          </div>
        ) : isDownloading ? (
          <span style={{ fontSize: 12, color: "#9b6dff", flexShrink: 0, fontWeight: 700, minWidth: 40, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {progress > 0 ? `${progress}%` : "..."}
          </span>
        ) : (
          <button onClick={onDownload} disabled={disabled} style={{
            padding: "5px 14px",
            background: disabled ? "#1a1a2a" : "linear-gradient(135deg, #7c3aed, #2563eb)",
            border: "none", borderRadius: 8,
            color: disabled ? "#404060" : "#fff",
            fontSize: 12, fontWeight: 600,
            cursor: disabled ? "not-allowed" : "pointer",
            fontFamily: "inherit", flexShrink: 0,
            opacity: disabled ? 0.5 : 1,
          }}>
            ⬇ {t.modelDownload}
          </button>
        )}
      </div>

      {/* Progress bar */}
      {isDownloading && (
        <div>
          <div style={{ background: "#1e1e38", borderRadius: 999, height: 5, overflow: "hidden", position: "relative" }}>
            {progress > 0 ? (
              <div style={{
                height: "100%", borderRadius: 999,
                background: "linear-gradient(90deg, #7c3aed, #9b6dff, #2563eb)",
                width: `${progress}%`,
                transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
                boxShadow: "0 0 10px rgba(139,92,246,0.6)",
              }} />
            ) : (
              <>
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(90deg, transparent 0%, #7c3aed 40%, #9b6dff 60%, transparent 100%)",
                  animation: "shimmer 1.4s ease infinite",
                }} />
                <style>{`@keyframes shimmer { 0%{transform:translateX(-150%)} 100%{transform:translateX(250%)} }`}</style>
              </>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
            <span style={{ fontSize: 10, color: "#5050a0" }}>{t.modelDownloading}</span>
            {progress > 0 && (
              <span style={{ fontSize: 10, color: "#7070b0", fontVariantNumeric: "tabular-nums" }}>{progress} / 100</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
