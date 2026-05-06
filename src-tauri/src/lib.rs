use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
struct ProgressPayload {
    stage: String,
    progress: u32,
}

fn whisper_cache_dir() -> PathBuf {
    dirs::home_dir().unwrap_or_default().join(".cache").join("whisper")
}

fn python3() -> &'static str { "/usr/bin/python3" }

// ── Model status ────────────────────────────────────────────────────────────

#[tauri::command]
fn get_model_status() -> HashMap<String, bool> {
    let cache = whisper_cache_dir();
    let files = [
        ("tiny",     "tiny.pt"),
        ("base",     "base.pt"),
        ("small",    "small.pt"),
        ("medium",   "medium.pt"),
        ("turbo",    "large-v3-turbo.pt"),
        ("large-v2", "large-v2.pt"),
        ("large-v3", "large-v3.pt"),
    ];
    files.iter().map(|(name, file)| {
        (name.to_string(), cache.join(file).exists())
    }).collect()
}

// ── Download model ───────────────────────────────────────────────────────────

#[tauri::command]
async fn download_model(app: AppHandle, model: String) -> Result<(), String> {
    let script = format!(
        r#"
import whisper, sys

class Progress:
    def __init__(self):
        self.last = -1
    def __call__(self, t):
        def hook(b=1, bsize=1, tsize=None):
            if tsize:
                pct = int(100 * b * bsize / tsize)
                if pct != self.last:
                    self.last = pct
                    print(f"PROGRESS:{{pct}}", flush=True)
        return hook

import torch._six
original = torch.hub.download_url_to_file
def patched(url, dst, *args, **kwargs):
    p = Progress()
    kwargs['progress'] = True
    original(url, dst, *args, **kwargs)

whisper.load_model("{model}")
print("DONE", flush=True)
"#,
        model = model
    );

    let mut child = std::process::Command::new(python3())
        .args(["-c", &script])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| e.to_string())?;

    use std::io::{BufRead, BufReader};
    let stdout = child.stdout.take().unwrap();
    let reader = BufReader::new(stdout);
    let mut progress = 0u32;

    for line in reader.lines().flatten() {
        if let Some(pct) = line.strip_prefix("PROGRESS:") {
            if let Ok(p) = pct.trim().parse::<u32>() {
                progress = p;
                let _ = app.emit("download-progress", serde_json::json!({ "progress": p }));
            }
        }
    }

    child.wait().map_err(|e| e.to_string())?;

    // Emit 100% on completion
    let _ = app.emit("download-progress", serde_json::json!({ "progress": 100u32 }));
    Ok(())
}

// ── Pick output folder ───────────────────────────────────────────────────────

#[tauri::command]
async fn pick_output_folder() -> Option<String> {
    rfd::AsyncFileDialog::new()
        .pick_folder()
        .await
        .map(|f| f.path().to_string_lossy().to_string())
}

// ── Transcribe ───────────────────────────────────────────────────────────────

#[derive(Serialize)]
struct TranscribeResult {
    text: String,
    path: String,
}

#[tauri::command]
async fn transcribe(
    app: AppHandle,
    file: String,
    model: String,
    language: String,
    format: String,
    output_folder: Option<String>,
) -> Result<TranscribeResult, String> {
    let emit = |stage: &str, progress: u32| {
        let _ = app.emit("transcribe-progress", ProgressPayload {
            stage: stage.to_string(), progress,
        });
    };

    emit("loading", 5);

    let input_path = Path::new(&file);
    let ext = match format.as_str() { "srt" => "srt", "vtt" => "vtt", "json" => "json", _ => "txt" };

    let output_path = match output_folder {
        Some(ref folder) => {
            let stem = input_path.file_stem().unwrap_or_default().to_string_lossy();
            PathBuf::from(folder).join(format!("{}.{}", stem, ext))
        }
        None => input_path.with_extension(ext),
    };

    let script = dirs::home_dir()
        .unwrap_or_default()
        .join("Documents/CLAUDE/whisper-transcription/transcribe.py");

    emit("transcribing", 25);

    let output = std::process::Command::new(python3())
        .arg(&script)
        .arg(&file)
        .arg("--model").arg(&model)
        .arg("--language").arg(&language)
        .arg("--format").arg(&format)
        .arg("--output").arg(output_path.to_str().unwrap_or("output.txt"))
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("Python not found: {e}"))?;

    emit("saving", 90);

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(format!("{err}"));
    }

    let text = std::fs::read_to_string(&output_path)
        .unwrap_or_else(|_| String::from_utf8_lossy(&output.stdout).to_string());

    emit("saving", 100);

    Ok(TranscribeResult {
        text,
        path: output_path.to_string_lossy().to_string(),
    })
}

// ── Entry point ──────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            transcribe,
            get_model_status,
            download_model,
            pick_output_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
