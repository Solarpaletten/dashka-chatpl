import { NextRequest, NextResponse } from "next/server";
import { UnifiedTranslationService } from "@/lib/translator";

const translationService = new UnifiedTranslationService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      text,
      source_language,
      target_language = "DE",
      fromLang,
      toLang,
      from,
      to,
    } = body ?? {};

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        {
          status: "error",
          message: "Текст не указан",
        },
        { status: 400 }
      );
    }

    const sourceCode =
      (source_language || fromLang || from || "").toUpperCase() || null;
    const targetCode =
      (target_language || toLang || to || "DE").toUpperCase();

    const result = await translationService.translateText(
      text.trim(),
      sourceCode,
      targetCode
    );

    return NextResponse.json({
      status: "success",
      original_text: result.originalText,
      translated_text: result.translatedText,
      source_language: (result.fromLanguage || sourceCode || "auto").toLowerCase(),
      target_language: targetCode.toLowerCase(),
      confidence: result.confidence,
      timestamp: new Date().toISOString(),
      processing_time: result.processingTime,
      provider: result.provider,
      from_cache: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json(
      {
        status: "error",
        message,
      },
      { status: 500 }
    );
  }
}