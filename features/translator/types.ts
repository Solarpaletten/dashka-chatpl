// features/translator/types.ts
// v2.1 — Multi-language template edition
//
// Внимание: PARTNER_LANG и DEFAULT_VOICE_* находятся в /config.ts (корень).
// Этот файл трогать НЕ нужно — только определения типов и метаданные языков.

import type { TtsVoice } from "./types-runtime";
export type { TtsVoice };

export type Direction = "RU_PARTNER" | "PARTNER_RU";
export type MicState = "Idle" | "Recording" | "Processing";
export type Theme = "dark" | "light";
export type LangCode = "RU" | "DE" | "EN" | "PL" | "ZH" | "FR" | "IT" | "ES" | "LV" | "LT" | "UA";

export const TTS_VOICES: { id: TtsVoice; label: string; gender: "F" | "M" }[] = [
  { id: "eve", label: "Eve", gender: "F" },
  { id: "ara", label: "Ara", gender: "F" },
  { id: "leo", label: "Leo", gender: "M" },
  { id: "rex", label: "Rex", gender: "M" },
  { id: "sal", label: "Sal", gender: "M" },
];

export interface LangMeta {
  code: LangCode;
  name: string;         // как будет отображаться в UI на русском
  nativeName: string;   // самоназвание на своём языке
  flag: string;
  speechLocale: string; // BCP-47 для Web Speech API
  ttsLanguage: string;  // код для Grok TTS API (ISO 639-1)
  placeholder: string;
}

export const LANG_META: Record<LangCode, LangMeta> = {
  RU: {
    code: "RU", name: "Русский", nativeName: "Русский", flag: "🇷🇺",
    speechLocale: "ru-RU", ttsLanguage: "ru",
    placeholder: "Говорите или пишите по-русски…",
  },
  DE: {
    code: "DE", name: "Немецкий", nativeName: "Deutsch", flag: "🇩🇪",
    speechLocale: "de-DE", ttsLanguage: "de",
    placeholder: "Sprich oder schreibe auf Deutsch…",
  },
  EN: {
    code: "EN", name: "English", nativeName: "English", flag: "🇺🇸",
    speechLocale: "en-US", ttsLanguage: "en",
    placeholder: "Speak or type in English…",
  },
  PL: {
    code: "PL", name: "Польский", nativeName: "Polski", flag: "🇵🇱",
    speechLocale: "pl-PL", ttsLanguage: "pl",
    placeholder: "Mów lub pisz po polsku…",
  },
  ZH: {
    code: "ZH", name: "Китайский", nativeName: "中文", flag: "🇨🇳",
    speechLocale: "zh-CN", ttsLanguage: "zh",
    placeholder: "说中文或用中文打字…",
  },
  FR: {
    code: "FR", name: "Французский", nativeName: "Français", flag: "🇫🇷",
    speechLocale: "fr-FR", ttsLanguage: "fr",
    placeholder: "Parlez ou tapez en français…",
  },
  IT: {
    code: "IT", name: "Итальянский", nativeName: "Italiano", flag: "🇮🇹",
    speechLocale: "it-IT", ttsLanguage: "it",
    placeholder: "Parla o scrivi in italiano…",
  },
  ES: {
    code: "ES", name: "Испанский", nativeName: "Español", flag: "🇪🇸",
    speechLocale: "es-ES", ttsLanguage: "es",
    placeholder: "Habla o escribe en español…",
  },
  LV: {
    code: "LV", name: "Латышский", nativeName: "Latviešu", flag: "🇱🇻",
    speechLocale: "lv-LV", ttsLanguage: "lv",
    placeholder: "Runājiet vai rakstiet latviski…",
  },
  LT: {
    code: "LT", name: "Литовский", nativeName: "Lietuvių", flag: "🇱🇹",
    speechLocale: "lt-LT", ttsLanguage: "lt",
    placeholder: "Kalbėkite arba rašykite lietuviškai…",
  },
  UA: {
    code: "UA", name: "Украинский", nativeName: "Українська", flag: "🇺🇦",
    speechLocale: "uk-UA", ttsLanguage: "uk",
    placeholder: "Говоріть або пишіть українською…",
  },
};

export interface PaneConfig {
  id: "left" | "right";
  from: LangCode;
  to: LangCode;
  defaultVoice: TtsVoice;
}

export interface PaneState {
  inputText: string;
  translatedText: string;
  isTranslating: boolean;
  error: string | null;
  micState: MicState;
  voice: TtsVoice;
  isPlaying: boolean;
}

export interface TranslateResponse {
  status: "success" | "error";
  original_text: string;
  translated_text: string;
  source_language: string;
  target_language: string;
  confidence: number;
  processing_time: number;
  from_cache: boolean;
  message?: string;
}

/* --- SpeechRecognition ambient types --- */
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
  }
  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
  }
  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
    onend: ((this: SpeechRecognition, ev: Event) => void) | null;
    start(): void;
    stop(): void;
  }
}
