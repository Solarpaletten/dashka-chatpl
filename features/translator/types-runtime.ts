// features/translator/types-runtime.ts
// Типы выделены в отдельный файл, чтобы их можно было импортировать
// как из config.ts (корень), так и из features/translator/* без cycles.

export type TtsVoice = "eve" | "leo" | "ara" | "rex" | "sal";
