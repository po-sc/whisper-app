import { useState } from "react";
import { Translations } from "../i18n";

interface Props {
  t: Translations;
  text: string;
  outputPath: string;
  onNew: () => void;
}

export default function ResultView({ t, text, outputPath, onNew }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontWeight: 600, fontSize: 15 }}>
          <span style={{ color: "var(--green)" }}>✓</span> {t.resultTitle}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-ghost" onClick={handleCopy} style={{ color: copied ? "var(--green)" : undefined }}>
            {copied ? t.btnCopied : t.btnCopy}
          </button>
          <button onClick={onNew} style={{
            padding: "7px 14px", borderRadius: "var(--radius-sm)", border: "none",
            background: "linear-gradient(135deg, var(--accent), var(--accent2))",
            color: "white", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
          }}>
            {t.btnNewFile}
          </button>
        </div>
      </div>

      <div style={{
        flex: 1, background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", padding: "14px 16px",
        overflowY: "auto", fontSize: 13, lineHeight: 1.75,
        whiteSpace: "pre-wrap", userSelect: "text", minHeight: 0,
        color: text ? "var(--text)" : "var(--muted)",
      }}>
        {text || "—"}
      </div>

      {outputPath && (
        <p style={{ color: "var(--muted)", fontSize: 11, flexShrink: 0 }}>
          {t.savedTo} {outputPath}
        </p>
      )}
    </div>
  );
}
