import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { BreakingTicker } from "@/components/BreakingTicker";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://signaljournal.kr"),
  title: {
    default: "시그널저널 — 노이즈 속에서 신호를 읽다",
    template: "%s | 시그널저널",
  },
  description:
    "시그널저널(Signal Journal)은 정치·경제·사회·국제·문화·테크 전 분야의 신뢰할 수 있는 뉴스와 깊이 있는 분석을 전합니다.",
  keywords: ["시그널저널", "Signal Journal", "뉴스", "신문", "언론", "속보", "오피니언"],
  openGraph: {
    title: "시그널저널",
    description: "노이즈 속에서 신호를 읽다 — 시그널저널",
    type: "website",
    locale: "ko_KR",
    siteName: "시그널저널",
  },
};

// 다크모드 FOUC 방지: 페인트 전에 테마 클래스 적용
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('sj-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-signal-600 focus:px-4 focus:py-2 focus:font-semibold focus:text-white"
        >
          본문 바로가기
        </a>
        <Header />
        <BreakingTicker />
        <main id="content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
