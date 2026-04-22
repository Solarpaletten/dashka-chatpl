type TranslateResult = {
  originalText: string;
  translatedText: string;
  fromLanguage: string;
  confidence: number;
  provider: string;
  processingTime: number;
};

export class UnifiedTranslationService {
  async translateText(
    text: string,
    sourceCode: string | null,
    targetCode: string
  ): Promise<TranslateResult> {
    const started = Date.now();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is missing");
    }

    const targetName = targetCode.toUpperCase() === "DE" ? "German" : targetCode;
    const sourceHint = sourceCode ? `Source language: ${sourceCode}.` : "Detect source language automatically.";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are a translation engine. Return only the translated text, without explanations.",
          },
          {
            role: "user",
            content: `${sourceHint} Translate this text to ${targetName}: ${text}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const translatedText =
      data?.choices?.[0]?.message?.content?.trim();

    if (!translatedText) {
      throw new Error("Empty translation response");
    }

    return {
      originalText: text,
      translatedText,
      fromLanguage: sourceCode?.toLowerCase() || "auto",
      confidence: 0.95,
      provider: "openai",
      processingTime: Date.now() - started,
    };
  }
}