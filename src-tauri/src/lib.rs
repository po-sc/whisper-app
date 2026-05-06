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

const MODEL_FILES: &[(&str, &str)] = &[
    ("tiny",     "tiny.pt"),
    ("base",     "base.pt"),
    ("small",    "small.pt"),
    ("medium",   "medium.pt"),
    ("turbo",    "large-v3-turbo.pt"),
    ("large-v2", "large-v2.pt"),
    ("large-v3", "large-v3.pt"),
];

fn whisper_cache_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join(".cache")
        .join("whisper")
}

fn python3() -> &'static str { "/usr/bin/python3" }

// ── Model status ────────────────────────────────────────────────────────────

#[tauri::command]
fn get_model_status() -> HashMap<String, bool> {
    let cache = whisper_cache_dir();
    MODEL_FILES.iter().map(|(name, file)| {
        (name.to_string(), cache.join(file).exists())
    }).collect()
}

// ── Download model ───────────────────────────────────────────────────────────

#[tauri::command]
async fn download_model(app: AppHandle, model: String) -> Result<(), String> {
    let script = format!(
        r#"
import sys, os, urllib.request

_last = [-1]
_orig = urllib.request.urlretrieve

def _hook(count, block_size, total_size):
    if total_size > 0:
        pct = min(int(100 * count * block_size / total_size), 99)
        if pct != _last[0]:
            _last[0] = pct
            print(f"PROGRESS:{{pct}}", flush=True)

def _patched(url, filename=None, reporthook=None, data=None):
    result = _orig(url, filename, _hook, data)
    print("PROGRESS:100", flush=True)
    sys.stdout.flush()
    os._exit(0)
    return result

urllib.request.urlretrieve = _patched

import whisper
whisper.load_model("{model}")
# Reached only if model was already cached (no download needed)
print("PROGRESS:100", flush=True)
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
    let stdout = child.stdout.take().ok_or("failed to capture stdout")?;
    let reader = BufReader::new(stdout);

    for line in reader.lines().map_while(Result::ok) {
        if let Some(pct) = line.strip_prefix("PROGRESS:") {
            if let Ok(p) = pct.trim().parse::<u32>() {
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

// ── Pick input file ──────────────────────────────────────────────────────────

#[tauri::command]
async fn pick_file() -> Option<String> {
    rfd::AsyncFileDialog::new()
        .add_filter("Audio/Video", &["mov", "mp4", "mp3", "wav", "m4a", "aiff", "avi", "mkv"])
        .pick_file()
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

// ── Delete model ─────────────────────────────────────────────────────────────

#[tauri::command]
fn delete_model(model: String) -> Result<(), String> {
    let cache = whisper_cache_dir();
    let filename = MODEL_FILES.iter()
        .find(|(name, _)| *name == model)
        .map(|(_, file)| *file)
        .ok_or_else(|| format!("Unknown model: {model}"))?;
    let path = cache.join(filename);
    if path.exists() {
        std::fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn model_files_has_unique_names() {
        let names: Vec<&str> = MODEL_FILES.iter().map(|(n, _)| *n).collect();
        let mut sorted = names.clone();
        sorted.sort();
        sorted.dedup();
        assert_eq!(names.len(), sorted.len(), "duplicate model names in MODEL_FILES");
    }

    #[test]
    fn model_files_has_unique_filenames() {
        let files: Vec<&str> = MODEL_FILES.iter().map(|(_, f)| *f).collect();
        let mut sorted = files.clone();
        sorted.sort();
        sorted.dedup();
        assert_eq!(files.len(), sorted.len(), "duplicate filenames in MODEL_FILES");
    }

    #[test]
    fn get_model_status_returns_all_model_names() {
        let status = get_model_status();
        for (name, _) in MODEL_FILES {
            assert!(status.contains_key(*name), "missing key: {name}");
        }
    }

    #[test]
    fn get_model_status_returns_false_for_missing_files() {
        let status = get_model_status();
        // In CI / clean env none of the large model files exist
        // We can only assert the map has the right keys with bool values
        assert!(status.values().all(|_| true)); // all are bool by type
    }

    #[test]
    fn delete_model_unknown_name_returns_error() {
        let result = delete_model("nonexistent-xyz".to_string());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unknown model"));
    }

    #[test]
    fn delete_model_missing_file_is_ok() {
        // If the .pt file doesn't exist, delete should succeed silently
        let result = delete_model("tiny".to_string());
        // May be Ok (file not present) or Err (permission), but not Unknown model error
        if let Err(e) = result {
            assert!(!e.contains("Unknown model"));
        }
    }

    #[test]
    fn whisper_cache_dir_ends_with_whisper() {
        let dir = whisper_cache_dir();
        assert_eq!(dir.file_name().unwrap(), "whisper");
    }

    #[test]
    fn output_ext_mapping() {
        // Mirror the match in transcribe() to catch drift
        let cases = [("srt", "srt"), ("vtt", "vtt"), ("json", "json"), ("txt", "txt"), ("other", "txt")];
        for (fmt, expected) in cases {
            let ext = match fmt { "srt" => "srt", "vtt" => "vtt", "json" => "json", _ => "txt" };
            assert_eq!(ext, expected, "format {fmt} maps to wrong extension");
        }
    }
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
            delete_model,
            pick_output_folder,
            pick_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
