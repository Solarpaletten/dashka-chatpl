// features/translator/useTheme.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import type { Theme } from "./types";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("dashka-theme") as Theme | null;
    if (saved === "light" || saved === "dark") {
      setThemeState(saved);
    } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      setThemeState("light");
    }
  }, []);

  useEffect(() => {
    if (!mounted || typeof document === "undefined") return;
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("dashka-theme", theme);
  }, [theme, mounted]);

  const toggle = useCallback(() => {
    setThemeState((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle, mounted };
}
