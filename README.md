# Whisper App

Десктоп-приложение для транскрипции аудио и видео в текст. Тёмная тема, двуязычный UI (RU/EN), встроенный менеджер моделей.

**Стек:** Tauri v2 · React 19 · TypeScript · Rust · OpenAI Whisper (Python)

---

## Возможности

- Drag & drop или выбор файла через системный диалог (полный путь через rfd)
- Форматы: MOV, MP4, MP3, WAV, M4A, AIFF, AVI, MKV
- Менеджер моделей: скачать / удалить модели whisper прямо из приложения
- Прогресс загрузки с реальным % (без зависания на загрузке весов в RAM)
- Вывод в TXT, SRT, VTT, JSON
- Выбор папки назначения
- Копирование результата в буфер обмена

## Требования

- macOS (Tauri v2)
- Python 3.x по пути `/usr/bin/python3`
- `openai-whisper`: `pip install openai-whisper`
- `ffmpeg` (для видеофайлов)
- Транскрипционный скрипт: `~/Documents/CLAUDE/whisper-transcription/transcribe.py`

## Разработка

```bash
npm install
npm run tauri dev
```

## Тесты

```bash
# Frontend (Vitest + Testing Library) — 18 тестов
npm test

# Rust unit-тесты — 8 тестов
cd src-tauri && cargo test

# TypeScript type check
npx tsc --noEmit

# Rust lint (строгий режим)
cd src-tauri && cargo clippy -- -D warnings
```

## Сборка релиза

```bash
npm run tauri build
```

Бинарник ~5–8 MB. Модели whisper хранятся в `~/.cache/whisper/` и не входят в сборку.

## Модели

| Модель | Размер | |
|---|---|---|
| tiny | 75 MB | |
| base | 145 MB | |
| small | 465 MB | |
| medium | 1.5 GB | |
| **turbo** | **809 MB** | **★ рекомендуется** |
| large-v2 | 3 GB | |
| large-v3 | 3 GB | максимальная точность |

## Архитектура

```
src/
  App.tsx               — роутинг между экранами (main / progress / result)
  i18n.ts               — переводы RU/EN, типизированы через Record<Locale, Translations>
  components/
    DropZone.tsx        — drag & drop + pick_file через Rust rfd (полный путь)
    Controls.tsx        — модель / язык / формат / папка вывода
    ModelManager.tsx    — скачать/удалить, прогресс-бар с %, shimmer-анимация
    ProgressView.tsx    — шаги с чекмарками, круговой SVG-прогресс, таймер
    ResultView.tsx      — показ и копирование результата
  test/                 — Vitest тесты (i18n, ResultView, DropZone)

src-tauri/src/lib.rs    — Rust команды:
  get_model_status      — проверяет .pt файлы в ~/.cache/whisper/
  download_model        — скачивает через Python/whisper, прогресс по stdout
  delete_model          — удаляет .pt файл из кэша
  pick_file             — нативный диалог выбора аудио/видео (rfd)
  pick_output_folder    — нативный диалог выбора папки (rfd)
  transcribe            — запускает transcribe.py, стримит прогресс через события
```
