import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PARTNER_LANG } from "@/config";
import { LANG_META } from "@/features/translator/types";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const partnerMeta = LANG_META[PARTNER_LANG];

export const metadata: Metadata = {
  title: `Dashka ${PARTNER_LANG} · Dual Conversation Translator`,
  description: `Dual-pane ${partnerMeta.nativeName} ↔ Русский translator with Grok TTS · Solar Team`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      data-theme="dark"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
