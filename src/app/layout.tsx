import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { BreakingTicker } from "@/components/BreakingTicker";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://modooilbo.com"),
  title: {
    default: "모두일보 — 모두를 위한 신뢰의 뉴스",
    template: "%s | 모두일보",
  },
  description:
    "모두일보(Modoo Ilbo)는 정치·경제·사회·국제·문화·테크 전 분야의 신뢰할 수 있는 뉴스와 깊이 있는 분석을 전합니다. 모두를 위한 신뢰의 뉴스.",
  keywords: ["모두일보", "Modoo Ilbo", "뉴스", "신문", "언론", "속보", "오피니언"],
  applicationName: "모두일보",
  authors: [{ name: "모두일보" }],
  creator: "모두일보",
  publisher: "모두일보",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "모두일보 — 모두를 위한 신뢰의 뉴스",
    description:
      "모두일보(Modoo Ilbo)는 정치·경제·사회·국제·문화·테크 전 분야의 신뢰할 수 있는 뉴스와 깊이 있는 분석을 전합니다. 모두를 위한 신뢰의 뉴스.",
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "모두일보",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "모두일보 — 모두를 위한 신뢰의 뉴스",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "모두일보 — 모두를 위한 신뢰의 뉴스",
    description:
      "모두일보(Modoo Ilbo)는 정치·경제·사회·국제·문화·테크 전 분야의 신뢰할 수 있는 뉴스와 깊이 있는 분석을 전합니다. 모두를 위한 신뢰의 뉴스.",
    images: ["/og.png"],
  },
};

// 다크모드 FOUC 방지: 페인트 전에 테마 클래스 적용
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('modoo-theme');
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
