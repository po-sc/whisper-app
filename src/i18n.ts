export type Locale = "ru" | "en";

export type Translations = {
  title: string;
  dropTitle: string;
  dropSub: string;
  dropFormats: string;
  dropChange: string;
  labelModel: string;
  labelLang: string;
  labelFormat: string;
  labelOutput: string;
  outputDefault: string;
  btnChooseFolder: string;
  btnTranscribe: string;
  btnCancel: string;
  btnBack: string;
  btnCopy: string;
  btnCopied: string;
  btnNewFile: string;
  stageLoading: string;
  stageExtracting: string;
  stageTranscribing: string;
  stageSaving: string;
  resultTitle: string;
  savedTo: string;
  errorTitle: string;
  modelsTitle: string;
  modelDownloaded: string;
  modelDownload: string;
  modelDownloading: string;
  modelDelete: string;
  modelDeleting: string;
  langs: Record<string, string>;
  formats: Record<string, string>;
};

export const T: Record<Locale, Translations> = {
  ru: {
    title: "Whisper",
    dropTitle: "Перетащи файл сюда",
    dropSub: "или нажми чтобы выбрать",
    dropFormats: "MOV · MP4 · MP3 · WAV · M4A · AIFF",
    dropChange: "Нажми чтобы выбрать другой файл",
    labelModel: "Модель",
    labelLang: "Язык",
    labelFormat: "Формат",
    labelOutput: "Папка вывода",
    outputDefault: "Рядом с файлом",
    btnChooseFolder: "Выбрать",
    btnTranscribe: "Транскрибировать",
    btnCancel: "Отмена",
    btnBack: "Назад",
    btnCopy: "Копировать",
    btnCopied: "✓ Скопировано",
    btnNewFile: "Новый файл",
    stageLoading: "Загружаю модель...",
    stageExtracting: "Извлекаю аудио...",
    stageTranscribing: "Транскрибирую...",
    stageSaving: "Сохраняю...",
    resultTitle: "Результат",
    savedTo: "Сохранено →",
    errorTitle: "Ошибка",
    modelsTitle: "Менеджер моделей",
    modelDownloaded: "Скачана",
    modelDownload: "Скачать",
    modelDownloading: "Скачивается...",
    modelDelete: "Удалить",
    modelDeleting: "Удаляю...",
    langs: { ru: "Русский", en: "English", de: "Deutsch", fr: "Français", es: "Español", zh: "中文", ja: "日本語" },
    formats: { txt: "TXT — текст", srt: "SRT — субтитры", vtt: "VTT — веб", json: "JSON" },
  },
  en: {
    title: "Whisper",
    dropTitle: "Drop file here",
    dropSub: "or click to select",
    dropFormats: "MOV · MP4 · MP3 · WAV · M4A · AIFF",
    dropChange: "Click to choose another file",
    labelModel: "Model",
    labelLang: "Language",
    labelFormat: "Format",
    labelOutput: "Output folder",
    outputDefault: "Same as file",
    btnChooseFolder: "Choose",
    btnTranscribe: "Transcribe",
    btnCancel: "Cancel",
    btnBack: "Back",
    btnCopy: "Copy",
    btnCopied: "✓ Copied",
    btnNewFile: "New file",
    stageLoading: "Loading model...",
    stageExtracting: "Extracting audio...",
    stageTranscribing: "Transcribing...",
    stageSaving: "Saving...",
    resultTitle: "Result",
    savedTo: "Saved →",
    errorTitle: "Error",
    modelsTitle: "Model Manager",
    modelDownloaded: "Downloaded",
    modelDownload: "Download",
    modelDownloading: "Downloading...",
    modelDelete: "Delete",
    modelDeleting: "Deleting...",
    langs: { ru: "Russian", en: "English", de: "Deutsch", fr: "Français", es: "Spanish", zh: "Chinese", ja: "Japanese" },
    formats: { txt: "TXT — plain text", srt: "SRT — subtitles", vtt: "VTT — web", json: "JSON" },
  },
};
