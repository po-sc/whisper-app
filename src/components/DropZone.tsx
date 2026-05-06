import { useState, useCallback } from "react";
import { Translations } from "../i18n";

interface Props {
  t: Translations;
  file: string;
  fileName: string;
  onFile: (path: string, name: string) => void;
}

const ACCEPTED = [".mov", ".mp4", ".mp3", ".wav", ".m4a", ".aiff", ".avi", ".mkv"];

export default function DropZone({ t, file, fileName, onFile }: Props) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (!f) return;
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED.includes(ext)) return;
    onFile((f as any).path || f.name, f.name);
  }, [onFile]);

  const handleClick = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ACCEPTED.join(",");
    input.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (!f) return;
      onFile((f as any).path || f.name, f.name);
    };
    input.click();
  }, [onFile]);

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      style={{
        flex: 1,
        border: `2px dashed ${dragging ? "#9b6dff" : file ? "#22d97a" : "#32325a"}`,
        borderRadius: 14,
        background: dragging ? "rgba(155,109,255,0.06)" : file ? "rgba(34,217,122,0.05)" : "#16162a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        cursor: "pointer",
        transition: "all 0.2s",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow */}
      {(dragging || file) && (
        <div style={{
          position: "absolute",
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: file ? "rgba(16,185,129,0.08)" : "rgba(139,92,246,0.1)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }} />
      )}

      <span style={{ fontSize: 38, position: "relative" }}>{file ? "✅" : dragging ? "🎯" : "🎬"}</span>

      {file ? (
        <>
          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--green)", position: "relative" }}>{fileName}</span>
          <span style={{ color: "var(--muted)", fontSize: 12, position: "relative" }}>{t.dropChange}</span>
        </>
      ) : (
        <>
          <span style={{ fontWeight: 600, fontSize: 15, position: "relative" }}>{t.dropTitle}</span>
          <span style={{ color: "var(--muted)", fontSize: 13, position: "relative" }}>{t.dropSub}</span>
          <span style={{ color: "var(--border)", fontSize: 11, marginTop: 4, position: "relative", letterSpacing: "0.05em" }}>
            {t.dropFormats}
          </span>
        </>
      )}
    </div>
  );
}
