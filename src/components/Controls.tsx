import { invoke } from "@tauri-apps/api/core";
import { Translations } from "../i18n";

interface Props {
  t: Translations;
  model: string; language: string; format: string; outputFolder: string;
  downloadedModels: string[];
  onModel: (v: string) => void; onLanguage: (v: string) => void;
  onFormat: (v: string) => void; onOutputFolder: (v: string) => void;
  onOpenModels: () => void;
}

const ALL_MODELS = [
  { value: "tiny",     label: "Tiny — 75 MB" },
  { value: "base",     label: "Base — 145 MB" },
  { value: "small",    label: "Small — 465 MB" },
  { value: "medium",   label: "Medium — 1.5 GB" },
  { value: "turbo",    label: "Turbo — 809 MB ★" },
  { value: "large-v2", label: "Large v2 — 3 GB" },
  { value: "large-v3", label: "Large v3 — 3 GB" },
];

export default function Controls({ t, model, language, format, outputFolder, downloadedModels, onModel, onLanguage, onFormat, onOutputFolder, onOpenModels }: Props) {
  const langOptions = Object.entries(t.langs).map(([v, l]) => ({ value: v, label: l }));
  const fmtOptions  = Object.entries(t.formats).map(([v, l]) => ({ value: v, label: l }));
  const modelOptions = downloadedModels.length > 0
    ? ALL_MODELS.filter(m => downloadedModels.includes(m.value))
    : ALL_MODELS;

  const pickFolder = async () => {
    try {
      const folder = await invoke<string | null>("pick_output_folder");
      if (folder) onOutputFolder(folder);
    } catch {}
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>

      {/* Row 1: Model + download button, Language, Format */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>

        <Field label={t.labelModel}>
          <div style={{ display: "flex", gap: 6 }}>
            <Select value={model} options={modelOptions} onChange={onModel} />
            <button onClick={onOpenModels} title={t.modelsTitle} style={{
              flexShrink: 0,
              width: 34,
              background: "#1e1e38",
              border: "1px solid #32325a",
              borderRadius: 8,
              color: "#9b6dff",
              fontSize: 15,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#9b6dff")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#32325a")}
            >
              ⬇
            </button>
          </div>
        </Field>

        <Field label={t.labelLang}>
          <Select value={language} options={langOptions} onChange={onLanguage} />
        </Field>

        <Field label={t.labelFormat}>
          <Select value={format} options={fmtOptions} onChange={onFormat} />
        </Field>
      </div>

      {/* Row 2: Output folder */}
      <Field label={t.labelOutput}>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{
            flex: 1,
            background: "#18182a",
            border: "1px solid #32325a",
            borderRadius: 9,
            padding: "8px 10px",
            fontSize: 12,
            color: outputFolder ? "#e8e8f8" : "#5050a0",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {outputFolder || t.outputDefault}
          </div>
          <button onClick={pickFolder} style={{
            padding: "8px 14px",
            background: "#1e1e38",
            border: "1px solid #32325a",
            borderRadius: 9,
            color: "#c0c0e8",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
            transition: "all 0.15s",
          }}>
            {t.btnChooseFolder}
          </button>
        </div>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 10, color: "#6060a0", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function Select({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        flex: 1,
        background: "#18182a",
        border: "1px solid #32325a",
        borderRadius: 9,
        color: "#e8e8f8",
        padding: "8px 26px 8px 10px",
        fontSize: 12,
        fontFamily: "inherit",
        cursor: "pointer",
        outline: "none",
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%236060a0' d='M5 6L0 0h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 9px center",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} style={{ background: "#22223a", color: "#e8e8f8" }}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
