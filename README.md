# 🎯 Dashka Dual Template v2.2 — Share Edition

**Универсальный шаблон многоязычного переводчика с голосовой озвучкой
и прямой отправкой аудио в WhatsApp/Telegram.**

Поддерживает **10 языков из коробки** (можно добавить любой). Делает синхронный перевод
RU ↔ [язык партнёра] в две панели одновременно, с авто-озвучкой через Grok TTS
и кнопкой `📤 Share` для отправки MP3-файла озвучки в любой мессенджер через
native share sheet (Web Share API Level 2).

---

## 🚀 Как создать новую Dashka за 5 минут

### Шаг 1. Скопировать шаблон

```bash
cp -r Dashka-dual-template Dashka-dual-chinese
cd Dashka-dual-chinese
```

### Шаг 2. Открыть `config.ts` (в корне проекта)

```typescript
export const PARTNER_LANG: LangCode = "DE";  // ← ТОЛЬКО ЭТО МЕНЯЕМ
```

Заменить `"DE"` на нужный код:

- `"DE"` 🇩🇪 Немецкий
- `"EN"` 🇺🇸 English
- `"PL"` 🇵🇱 Польский
- `"ZH"` 🇨🇳 中文 (китайский)
- `"FR"` 🇫🇷 Français
- `"IT"` 🇮🇹 Italiano
- `"ES"` 🇪🇸 Español
- `"LV"` 🇱🇻 Latviešu
- `"LT"` 🇱🇹 Lietuvių
- `"UA"` 🇺🇦 Українська

### Шаг 3. Deploy

```bash
git init && git add . && git commit -m "feat: Dashka ZH initial"
gh repo create Solarpaletten/dashka-dual-zh-chat --public --source=. --push
vercel --prod                            # project name: dashka-dual-zh-chat
vercel env add OPENAI_API_KEY production # paste same key
vercel env add XAI_API_KEY production    # paste same key
vercel --prod                            # rebuild with env
```

### Шаг 4. Готово

Открой `https://dashka-dual-zh-chat.vercel.app` — полностью рабочая китайская Dashka:
- Флаг 🇨🇳 в хедере
- Placeholder «说中文或用中文打字…»
- Title вкладки «Dashka ZH · Dual Conversation Translator»
- Speech recognition на `zh-CN`
- Grok TTS озвучивает перевод на китайском

**Ничего в коде не правил — только `config.ts`.**

---

## ➕ Как добавить новый язык (которого нет в списке)

Например — арабский (AR):

1. Открой `features/translator/types.ts`
2. Найди `export type LangCode = "RU" | "DE" | ...` → добавь `| "AR"`
3. В `LANG_META` добавь блок:
   ```typescript
   AR: {
     code: "AR", name: "Арабский", nativeName: "العربية", flag: "🇸🇦",
     speechLocale: "ar-SA", ttsLanguage: "ar",
     placeholder: "تحدث أو اكتب بالعربية…",
   },
   ```
4. В `config.ts` поставь `PARTNER_LANG = "AR"`

Готово.

---

## 🏗️ Архитектура

```
Dashka-dual-template/
├── config.ts                          ← 🎯 ТОЛЬКО ЭТО МЕНЯЕМ
├── app/
│   ├── layout.tsx                    ← title автоматически из PARTNER_LANG
│   ├── page.tsx                      ← dual-pane UI
│   ├── globals.css                   ← dark/light themes
│   └── api/
│       ├── translate/route.ts        ← OpenAI (перевод)
│       ├── health/route.ts           ← health check
│       └── tts/route.ts              ← Grok TTS (озвучка)
└── features/translator/
    ├── types.ts                      ← метаданные 10 языков (LANG_META)
    ├── types-runtime.ts              ← типы для config.ts
    ├── paneConfigs.ts                ← автосборка панелей из PARTNER_LANG
    ├── usePane.ts                    ← логика одной панели
    ├── useTTS.ts                     ← audio + LRU-кэш
    ├── useTheme.ts                   ← dark/light
    └── Pane.tsx                      ← UI одной панели
```

**Источник правды — один файл `config.ts`.** Все остальные файлы используют
`PARTNER_LANG` оттуда и перестраиваются автоматически.

---

## 🔑 Необходимые ENV переменные

```
OPENAI_API_KEY  — для /api/translate (GPT-4.1-mini)
XAI_API_KEY     — для /api/tts (Grok TTS)
```

Добавить в Vercel: `vercel env add KEY_NAME production`

Добавить локально: создать `.env.local`:
```
OPENAI_API_KEY=sk-proj-...
XAI_API_KEY=xai-...
```

---

## 📊 Текущая экосистема Dashka

- 🇩🇪 `dashka-chatde.vercel.app` — single pane RU↔DE
- 🇺🇸 `dashka-chat.vercel.app` — single pane RU↔EN
- 🇩🇪 `dashka-dual-chat.vercel.app` — dual DE + Grok TTS
- 🇺🇸 `dashka-dual-en-chat.vercel.app` — dual EN + Grok TTS
- 🇵🇱 `dashka-dual-pl-chat.vercel.app` — *ждёт деплоя*
- 🇨🇳 `dashka-dual-zh-chat.vercel.app` — *ждёт деплоя*
- ... и любые другие

---

Solar Team 🚀
