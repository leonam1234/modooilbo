import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { BreakingTicker } from "@/components/BreakingTicker";
import { TrendingTags } from "@/components/TrendingTags";
import { Footer } from "@/components/Footer";
import { AutoRefresh } from "@/components/AutoRefresh";
import { WeatherBackground } from "@/components/WeatherBackground";
import { BackToTop } from "@/components/BackToTop";
import { DEFAULT_OG_IMAGE } from "@/lib/site";

// 매체 정체성 = 두 축(기업 데이터 뉴스 + 종합뉴스). 전 페이지 기본 설명·소셜 카드가 이 값을 공유한다.
// (동결된 '테크'는 홍보 문구에서 제외 — /tech 라우트·기존 기사는 색인 보존을 위해 유지되나 대표 소개엔 넣지 않는다)
const SITE_DESCRIPTION =
  "모두일보는 정부지원금·공공입찰·창업상권·산업트렌드·채용노무·계약거래 등 기업에 필요한 공공데이터 뉴스와 경제·사회·국제·문화·스포츠·오피니언 종합뉴스를 함께 전합니다. 모두를 위한 신뢰의 뉴스.";
const SITE_TITLE = "모두일보 — 모두를 위한 신뢰의 뉴스";

export const metadata: Metadata = {
  metadataBase: new URL("https://modooilbo.com"),
  title: {
    default: SITE_TITLE,
    template: "%s | 모두일보",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "모두일보",
    "Modoo Ilbo",
    "기업 데이터 뉴스",
    "공공데이터",
    "정부지원금",
    "공공입찰",
    "창업",
    "상권",
    "산업 트렌드",
    "채용",
    "노무",
    "계약",
    "거래",
    "뉴스",
    "신문",
    "언론",
    "속보",
    "오피니언",
  ],
  applicationName: "모두일보",
  authors: [{ name: "모두일보" }],
  creator: "모두일보",
  publisher: "모두일보",
  // 파비콘 C안(「모두」) — 라이트 탭=검정, 다크 탭=흰색(Safari media 대응), .ico는 범용 폴백
  icons: {
    icon: [
      { url: "/favicon.ico?v=b", sizes: "any" },
      { url: "/icon.png?v=b", type: "image/png", sizes: "512x512", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark.png?v=b", type: "image/png", sizes: "512x512", media: "(prefers-color-scheme: dark)" },
    ],
    apple: [{ url: "/apple-icon.png?v=b", sizes: "180x180" }],
  },
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
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "모두일보",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
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
        {/* 헤드라인 폰트(자체호스팅 MaruBuri) 조기 로드 — 어터폴드 헤드라인 스왑 지연 방지.
            폴백(Noto Serif KR 등)은 웹폰트로 받지 않고 서브셋 밖 글리프만 기기 명조에 맡긴다(globals.css --font-serif). */}
        <link rel="preload" as="font" type="font/woff2" href="/fonts/MaruBuri-Bold.subset.woff2" crossOrigin="anonymous" />
        {/* 본문 폰트(Pretendard) 출처 조기 연결 */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        {/* 비차단 preload(as=style) */}
        <link rel="preload" as="style" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css" />
        {/* 실제 적용: media=print 로 비차단 다운로드 후 onload 시 all 로 승격 */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css" media="print" data-font-css="" />
        <script dangerouslySetInnerHTML={{ __html: "document.querySelectorAll('link[data-font-css]').forEach(function(l){function s(){l.media='all';}if(l.sheet){s();}else{l.addEventListener('load',s);}});" }} />
        <noscript>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css" />
        </noscript>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="dns-prefetch" href="https://api.open-meteo.com" />
        {/* 트래픽 수집: Cloudflare Web Analytics. 토큰(NEXT_PUBLIC_CF_BEACON_TOKEN)이 있을 때만 삽입.
            없으면 beacon 미삽입 → 수집 안 함(가짜 수치 없음). 기준: docs/tracking.md */}
        {process.env.NEXT_PUBLIC_CF_BEACON_TOKEN && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${process.env.NEXT_PUBLIC_CF_BEACON_TOKEN}"}`}
          />
        )}
        {/* Google AdSense — 자동광고 로더 (client=ca-pub-1741876528103024) */}
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossOrigin="anonymous" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1741876528103024"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-sans">
        <AutoRefresh />
        <WeatherBackground />
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-signal-600 focus:px-4 focus:py-2 focus:font-semibold focus:text-white"
        >
          본문 바로가기
        </a>
        {/* 헤더 + 속보 티커를 한 덩어리로 sticky 고정 (스크롤 시 같이 따라옴) */}
        <div className="no-print sticky top-0 z-40">
          <Header />
          <BreakingTicker />
          <TrendingTags />
        </div>
        <div className="relative z-10">
          <main id="content">{children}</main>
          <Footer />
        </div>
        <BackToTop />
      </body>
    </html>
  );
}
