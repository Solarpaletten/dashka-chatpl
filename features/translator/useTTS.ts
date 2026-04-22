// features/translator/useTTS.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LangCode, TtsVoice } from "./types";

interface TTSRequest {
  text: string;
  language: LangCode;
  voice: TtsVoice;
}

// LRU кэш для url (для воспроизведения) + параллельный кэш blob-ов (для share)
const CACHE_SIZE = 50;
const urlCache = new Map<string, string>();
const blobCache = new Map<string, Blob>();

function cacheKey(r: TTSRequest): string {
  return `${r.language}|${r.voice}|${r.text}`;
}

async function fetchTtsBlob(r: TTSRequest): Promise<Blob> {
  const key = cacheKey(r);
  const hit = blobCache.get(key);
  if (hit) {
    // refresh LRU
    blobCache.delete(key);
    blobCache.set(key, hit);
    return hit;
  }

  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: r.text,
      language: r.language,
      voice: r.voice,
    }),
  });

  if (!res.ok) {
    let msg = `TTS failed: HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) msg = data.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const blob = await res.blob();

  // Вытеснить самую старую запись если cache переполнен
  if (blobCache.size >= CACHE_SIZE) {
    const firstKey = blobCache.keys().next().value;
    if (firstKey) {
      blobCache.delete(firstKey);
      const oldUrl = urlCache.get(firstKey);
      if (oldUrl) {
        URL.revokeObjectURL(oldUrl);
        urlCache.delete(firstKey);
      }
    }
  }
  blobCache.set(key, blob);
  return blob;
}

async function fetchTtsUrl(r: TTSRequest): Promise<string> {
  const key = cacheKey(r);
  const hitUrl = urlCache.get(key);
  if (hitUrl) {
    urlCache.delete(key);
    urlCache.set(key, hitUrl);
    return hitUrl;
  }
  const blob = await fetchTtsBlob(r);
  const url = URL.createObjectURL(blob);
  urlCache.set(key, url);
  return url;
}

export function useTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // создаём singleton <audio>
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = new Audio();
    el.preload = "auto";
    audioRef.current = el;

    const onEnd = () => setIsPlaying(false);
    const onErr = () => {
      setIsPlaying(false);
      setError("Не удалось воспроизвести аудио");
    };
    el.addEventListener("ended", onEnd);
    el.addEventListener("error", onErr);

    return () => {
      el.pause();
      el.removeEventListener("ended", onEnd);
      el.removeEventListener("error", onErr);
      audioRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    setIsPlaying(false);
  }, []);

  const play = useCallback(
    async (req: TTSRequest) => {
      const el = audioRef.current;
      if (!el || !req.text.trim()) return;
      setError(null);
      el.pause();
      el.currentTime = 0;
      try {
        const url = await fetchTtsUrl(req);
        el.src = url;
        await el.play();
        setIsPlaying(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка TTS");
        setIsPlaying(false);
      }
    },
    []
  );

  // Новая функция для share — возвращает Blob MP3
  const getBlob = useCallback(
    async (req: TTSRequest): Promise<Blob> => {
      return fetchTtsBlob(req);
    },
    []
  );

  return { play, stop, getBlob, isPlaying, error };
}
