// features/translator/usePane.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type PaneState,
  type PaneConfig,
  type TtsVoice,
  type TranslateResponse,
  LANG_META,
} from "./types";

interface UsePaneArgs {
  config: PaneConfig;
  autoTTS: boolean;
  onTranslated?: (text: string, toLang: string, voice: TtsVoice) => void;
}

const MAX_CHARS = 5000;

function useDebounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): T {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  ) as T;
}

export function usePane({ config, autoTTS, onTranslated }: UsePaneArgs) {
  const [state, setState] = useState<PaneState>({
    inputText: "",
    translatedText: "",
    isTranslating: false,
    error: null,
    micState: "Idle",
    voice: config.defaultVoice,
    isPlaying: false,
  });
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const set = useCallback(
    (partial: Partial<PaneState>) =>
      setState((prev) => ({ ...prev, ...partial })),
    []
  );

  const translate = useCallback(
    async (textOverride?: string, silent = false) => {
      const text = (textOverride ?? state.inputText).trim();
      if (!text) return;
      if (!silent) set({ isTranslating: true, error: null });
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            source_language: config.from,
            target_language: config.to,
          }),
        });
        const data = (await res.json()) as TranslateResponse;
        if (!res.ok || data.status !== "success") {
          throw new Error(data?.message || `HTTP ${res.status}`);
        }
        set({ translatedText: data.translated_text });
        // Авто-TTS только для финального перевода (не для партиальных)
        if (!silent && autoTTS && onTranslated) {
          onTranslated(data.translated_text, config.to, state.voice);
        }
      } catch (e) {
        if (!silent) {
          set({ error: e instanceof Error ? e.message : "Ошибка перевода" });
        }
      } finally {
        if (!silent) set({ isTranslating: false });
      }
    },
    [state.inputText, state.voice, config.from, config.to, autoTTS, onTranslated, set]
  );

  const translatePartial = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      // silent=true: не трогаем loading и не триггерим авто-TTS
      void translate(text, true);
    },
    [translate]
  );
  const debouncedPartial = useDebounce(translatePartial, 500);

  const clear = useCallback(() => {
    set({ inputText: "", translatedText: "", error: null });
  }, [set]);

  const setInputText = useCallback(
    (text: string) => set({ inputText: text.slice(0, MAX_CHARS) }),
    [set]
  );

  const setVoice = useCallback(
    (v: TtsVoice) => {
      set({ voice: v });
      if (typeof window !== "undefined") {
        window.localStorage.setItem(`dashka-voice-${config.id}`, v);
      }
    },
    [config.id, set]
  );

  // restore voice from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(`dashka-voice-${config.id}`) as TtsVoice | null;
    if (saved) setState((prev) => ({ ...prev, voice: saved }));
  }, [config.id]);

  const toggleMic = useCallback(() => {
    if (state.micState === "Recording") {
      recognitionRef.current?.stop();
      set({ micState: "Processing" });
      return;
    }
    if (state.micState === "Processing") return;

    const Ctor =
      typeof window !== "undefined"
        ? window.SpeechRecognition ?? window.webkitSpeechRecognition
        : undefined;
    if (!Ctor) {
      set({ error: "Распознавание речи не поддерживается в этом браузере" });
      return;
    }

    const fromMeta = LANG_META[config.from];
    const rec = new Ctor();
    rec.lang = fromMeta.speechLocale;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      const display = (finalText + interim).trim().slice(0, MAX_CHARS);
      setState((prev) => ({ ...prev, inputText: display }));
      debouncedPartial(display);
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === "no-speech") return;
      set({ micState: "Idle", error: `Ошибка микрофона: ${e.error}` });
    };

    rec.onend = () => {
      setState((prev) => {
        if (prev.micState === "Processing") {
          // финальный перевод + авто-TTS
          void translate(prev.inputText, false).finally(() =>
            setState((p2) => ({ ...p2, micState: "Idle" }))
          );
          return prev;
        }
        return { ...prev, micState: "Idle" };
      });
    };

    recognitionRef.current = rec;
    rec.start();
    set({ micState: "Recording", error: null });
  }, [state.micState, config.from, set, debouncedPartial, translate]);

  return {
    ...state,
    config,
    translate: () => translate(),
    setInputText,
    setVoice,
    clear,
    toggleMic,
    isRecording: state.micState === "Recording",
    isProcessing: state.micState === "Processing",
  };
}
