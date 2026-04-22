// features/translator/Pane.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { LangCode, TtsVoice } from "./types";
import { LANG_META, TTS_VOICES } from "./types";
import { usePane } from "./usePane";

interface PaneProps {
  pane: ReturnType<typeof usePane>;
  onPlay: (text: string, lang: LangCode, voice: TtsVoice) => void;
  onStop: () => void;
  isPlaying: boolean;
  onShareRequest: (text: string, lang: LangCode, voice: TtsVoice) => Promise<void>;
  isSharing: boolean;
}

export default function Pane({
  pane,
  onPlay,
  onStop,
  isPlaying,
  onShareRequest,
  isSharing,
}: PaneProps) {
  const fromMeta = LANG_META[pane.config.from];
  const toMeta = LANG_META[pane.config.to];
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 400)}px`;
  }, [pane.inputText]);

  const copy = () => {
    if (pane.translatedText && typeof navigator !== "undefined") {
      navigator.clipboard?.writeText(pane.translatedText).catch(() => {});
      setCopyFeedback(true);
      window.setTimeout(() => setCopyFeedback(false), 1200);
    }
  };

  const playThis = () => {
    if (!pane.translatedText) return;
    if (isPlaying) {
      onStop();
    } else {
      onPlay(pane.translatedText, pane.config.to, pane.voice);
    }
  };

  const shareThis = () => {
    if (!pane.translatedText || isSharing) return;
    void onShareRequest(pane.translatedText, pane.config.to, pane.voice);
  };

  return (
    <section className="pane">
      <header className="pane-header">
        <div className="pane-direction">
          <span className="pane-flag">{fromMeta.flag}</span>
          <span className="pane-arrow">→</span>
          <span className="pane-flag">{toMeta.flag}</span>
          <span className="pane-direction-label">
            {fromMeta.code}→{toMeta.code}
          </span>
        </div>
        <select
          value={pane.voice}
          onChange={(e) => pane.setVoice(e.target.value as TtsVoice)}
          className="voice-select"
          aria-label="Голос озвучки"
          title="Голос озвучки"
        >
          {TTS_VOICES.map((v) => (
            <option key={v.id} value={v.id}>
              {v.gender === "F" ? "♀" : "♂"} {v.label}
            </option>
          ))}
        </select>
      </header>

      <div className="io-block">
        <div className="io-label">
          <span>{fromMeta.flag} {fromMeta.name}</span>
          {pane.inputText && (
            <button type="button" onClick={pane.clear} className="io-clear">
              очистить ✕
            </button>
          )}
        </div>
        <textarea
          ref={textareaRef}
          value={pane.inputText}
          onChange={(e) => pane.setInputText(e.target.value)}
          placeholder={fromMeta.placeholder}
          className="io-input"
        />
        <div className="io-counter">{pane.inputText.length} / 5000</div>
      </div>

      <div className="pane-actions">
        <button
          type="button"
          onClick={pane.translate}
          disabled={pane.isTranslating || pane.isProcessing || !pane.inputText.trim()}
          className="btn-translate"
        >
          {pane.isTranslating || pane.isProcessing ? (
            <span className="btn-spinner">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              {pane.isProcessing ? "Обработка…" : "Перевод…"}
            </span>
          ) : (
            <>→ {toMeta.name}</>
          )}
        </button>
        <button
          type="button"
          onClick={pane.toggleMic}
          disabled={pane.isProcessing}
          className={`btn-mic ${pane.isRecording ? "btn-mic-recording" : ""}`}
          aria-label={pane.isRecording ? "Остановить запись" : "Начать запись"}
        >
          {pane.isRecording ? "⏹" : "🎤"}
          {pane.isRecording && <span className="mic-pulse" />}
        </button>
      </div>

      {pane.error && <div className="pane-error">⚠ {pane.error}</div>}

      <div className="io-block io-block-output">
        <div className="io-label">
          <span className="io-label-accent">
            {toMeta.flag} {toMeta.name}
          </span>
          {pane.translatedText && (
            <div className="io-output-actions">
              <button
                type="button"
                onClick={playThis}
                className={`io-btn ${isPlaying ? "io-btn-active" : ""}`}
                title={isPlaying ? "Стоп" : "Озвучить"}
                aria-label={isPlaying ? "Стоп" : "Озвучить"}
              >
                {isPlaying ? "⏸" : "🔊"}
              </button>
              <button
                type="button"
                onClick={copy}
                className={`io-btn ${copyFeedback ? "io-btn-success" : ""}`}
                title={copyFeedback ? "Скопировано!" : "Копировать"}
                aria-label="Копировать"
              >
                {copyFeedback ? "✓" : "📋"}
              </button>
              <button
                type="button"
                onClick={shareThis}
                disabled={isSharing}
                className={`io-btn ${isSharing ? "io-btn-loading" : ""}`}
                title="Поделиться озвучкой"
                aria-label="Поделиться аудио-переводом"
              >
                {isSharing ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="animate-spin">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                ) : (
                  "📤"
                )}
              </button>
            </div>
          )}
        </div>
        <div className={`io-output ${pane.translatedText ? "" : "io-output-empty"}`}>
          {pane.translatedText || "…"}
        </div>
      </div>
    </section>
  );
}
