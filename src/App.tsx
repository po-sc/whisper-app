import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { T, Locale } from "./i18n";
import DropZone from "./components/DropZone";
import Controls from "./components/Controls";
import ProgressView from "./components/ProgressView";
import ResultView from "./components/ResultView";
import ModelManager from "./components/ModelManager";

export type Screen = "main" | "progress" | "result";

function App() {
  const [locale, setLocale] = useState<Locale>("ru");
  const [showModels, setShowModels] = useState(false);
  const [screen, setScreen] = useState<Screen>("main");
  const [file, setFile] = useState("");
  const [fileName, setFileName] = useState("");
  const [model, setModel] = useState("turbo");
  const [language, setLanguage] = useState("ru");
  const [format, setFormat] = useState("txt");
  const [outputFolder, setOutputFolder] = useState("");
  const [result, setResult] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [downloadedModels, setDownloadedModels] = useState<string[]>([]);

  const loadModelStatus = async () => {
    try {
      const status = await invoke<Record<string, boolean>>("get_model_status");
      const downloaded = Object.entries(status).filter(([, v]) => v).map(([k]) => k);
      setDownloadedModels(downloaded);
      // If current model not downloaded, switch to first available
      if (downloaded.length > 0 && !downloaded.includes(model)) {
        setModel(downloaded[0]);
      }
    } catch {}
  };

  useEffect(() => { loadModelStatus(); }, []);

  const t = T[locale];

  const handleReset = () => {
    setFile(""); setFileName(""); setResult(""); setOutputPath("");
    setScreen("main");
  };

  return (
    <div className="app">
      <header className="header">
        <span className="header-title">🎙 {t.title}</span>
        <div className="header-actions">
          <div className="lang-toggle">
            <button className={`lang-btn ${locale === "ru" ? "active" : ""}`} onClick={() => setLocale("ru")}>RU</button>
            <button className={`lang-btn ${locale === "en" ? "active" : ""}`} onClick={() => setLocale("en")}>EN</button>
          </div>
        </div>
      </header>

      {screen === "main" && (
        <>
          <DropZone t={t} file={file} fileName={fileName}
            onFile={(p, n) => { setFile(p); setFileName(n); }} />
          <Controls t={t} model={model} language={language} format={format}
            outputFolder={outputFolder}
            onModel={setModel} onLanguage={setLanguage} onFormat={setFormat}
            onOutputFolder={setOutputFolder} downloadedModels={downloadedModels}
            onOpenModels={() => setShowModels(true)} />
          <button className="btn-primary" disabled={!file} onClick={() => setScreen("progress")}>
            {t.btnTranscribe}
          </button>
        </>
      )}

      {screen === "progress" && (
        <ProgressView t={t} file={file} model={model} language={language}
          format={format} outputFolder={outputFolder}
          onDone={(text, path) => { setResult(text); setOutputPath(path); setScreen("result"); }}
          onCancel={handleReset} />
      )}

      {screen === "result" && (
        <ResultView t={t} text={result} outputPath={outputPath} onNew={handleReset} />
      )}

      {showModels && <ModelManager t={t} onClose={() => { setShowModels(false); loadModelStatus(); }} />}
    </div>
  );
}

export default App;
