import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { BreakingTicker } from "@/components/BreakingTicker";
import { Footer } from "@/components/Footer";
import { WeatherBackground } from "@/components/WeatherBackground";

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
    types: {
      "application/rss+xml": "/rss.xml",
    },
  },
  verification: {
    google: "CskNi9Cx1aINJrfcM020I8qjTFUDFaUS6jrGxcn6nbY",
    other: {
      "naver-site-verification": "9fa5ad35d86ef9d80fc2a12bc20f8a57d5512de7",
    },
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
        {/* 폰트 출처 조기 연결 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        {/* 비차단 preload(as=style) */}
        <link rel="preload" as="style" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;600;700;900&display=swap" />
        {/* 실제 적용: media=print 로 비차단 다운로드 후 onload 시 all 로 승격 */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css" media="print" data-font-css="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;600;700;900&display=swap" media="print" data-font-css="" />
        <script dangerouslySetInnerHTML={{ __html: "document.querySelectorAll('link[data-font-css]').forEach(function(l){function s(){l.media='all';}if(l.sheet){s();}else{l.addEventListener('load',s);}});" }} />
        <noscript>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css" />
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;600;700;900&display=swap" />
        </noscript>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* 트래픽 수집: Cloudflare Web Analytics. 토큰(NEXT_PUBLIC_CF_BEACON_TOKEN)이 있을 때만 삽입.
            없으면 beacon 미삽입 → 수집 안 함(가짜 수치 없음). 기준: docs/tracking.md */}
        {process.env.NEXT_PUBLIC_CF_BEACON_TOKEN && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${process.env.NEXT_PUBLIC_CF_BEACON_TOKEN}"}`}
          />
        )}
      </head>
      <body className="font-sans">
        <WeatherBackground />
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-signal-600 focus:px-4 focus:py-2 focus:font-semibold focus:text-white"
        >
          본문 바로가기
        </a>
        {/* 헤더 + 속보 티커를 한 덩어리로 sticky 고정 (스크롤 시 같이 따라옴) */}
        <div className="sticky top-0 z-40">
          <Header />
          <BreakingTicker />
        </div>
        <div className="relative z-10">
          <main id="content">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
