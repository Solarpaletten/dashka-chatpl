// features/translator/paneConfigs.ts
// Автоматически строит конфигурацию панелей на основе PARTNER_LANG из /config.ts.
// Этот файл трогать не нужно — всё управляется через /config.ts.

import { PARTNER_LANG, DEFAULT_VOICE_LEFT, DEFAULT_VOICE_RIGHT } from "@/config";
import type { TtsVoice } from "./types-runtime";
import type { PaneConfig } from "./types";

// Левая панель: Русский → Язык партнёра (то, что говорит Leanid)
export const LEFT_PANE: PaneConfig = {
  id: "left",
  from: "RU",
  to: PARTNER_LANG,
  defaultVoice: DEFAULT_VOICE_LEFT as TtsVoice,
};

// Правая панель: Язык партнёра → Русский (то, что говорит визави)
export const RIGHT_PANE: PaneConfig = {
  id: "right",
  from: PARTNER_LANG,
  to: "RU",
  defaultVoice: DEFAULT_VOICE_RIGHT as TtsVoice,
};

export { PARTNER_LANG };
