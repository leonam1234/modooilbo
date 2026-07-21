import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { BreakingTicker } from "@/components/BreakingTicker";
import { TrendingTags } from "@/components/TrendingTags";
import { Footer } from "@/components/Footer";
import { AutoRefresh } from "@/components/AutoRefresh";
import { WeatherBackground } from "@/components/WeatherBackground";
import { BackToTop } from "@/components/BackToTop";
import { AdSenseLoader } from "@/components/AdSenseLoader";
import { DEFAULT_OG_IMAGE, SITE, SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  // 사이트 이름값은 어디서나 "모두일보" 단일화(슬로건·영문명·카테고리 나열 금지 — SEO 이름 인식 정합).
  // 슬로건은 description 계열에서만 유지. 하위 페이지는 template "%s | 모두일보"가 적용된다.
  title: {
    default: "모두일보",
    template: "%s | 모두일보",
  },
  description: SITE_DESCRIPTION,
  // keywords 메타는 전역 제거 — 구글이 무시하고 키워드스터핑 신호만 된다.
  // (기사 실제 주제는 JSON-LD NewsArticle.keywords·article:tag로만 게재)
  applicationName: "모두일보",
  authors: [{ name: "모두일보" }],
  creator: "모두일보",
  publisher: "모두일보",
  // <meta name="title"> — 네이버 등 한국 포털이 읽는 전통 메타태그(중앙일보 등 주요 언론사 관례).
  // ⚠️ Next 메타데이터 병합은 최상위 필드 얕은 병합 — 하위 페이지가 other를 자체 정의하면
  //    이 값이 통째로 덮이니 그 페이지(article/[slug])의 other에도 같은 title을 넣어야 한다.
  other: { title: "모두일보" },
  // 파비콘 C안(「모두」) — 라이트 탭=검정, 다크 탭=흰색(Safari media 대응), .ico는 범용 폴백
  icons: {
    icon: [
      { url: "/favicon.ico?v=c", sizes: "any" },
      { url: "/icon.png?v=c", type: "image/png", sizes: "512x512", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark.png?v=c", type: "image/png", sizes: "512x512", media: "(prefers-color-scheme: dark)" },
    ],
    apple: [{ url: "/apple-icon.png?v=c", sizes: "180x180" }],
  },
  alternates: {
    types: {
      "application/rss+xml": "/rss.xml",
    },
  },
  // ⚠️ 소유권 확인 메타는 metadata.other가 아니라 여기(verification)에 둔다.
  //    article/[slug]는 metadata.other를 자체 선언해 루트 other를 통째로 덮지만,
  //    verification은 선언하지 않아 전 페이지에 그대로 상속된다(라이브 실측 확인).
  //    other에 넣으면 기사 페이지에서만 조용히 사라져 검토가 반려된다.
  verification: {
    google: "CskNi9Cx1aINJrfcM020I8qjTFUDFaUS6jrGxcn6nbY",
    other: {
      "naver-site-verification": "9fa5ad35d86ef9d80fc2a12bc20f8a57d5512de7",
      // 애드센스 사이트 소유권 확인. ads.txt의 pub-1741876528103024와 동일 계정.
      "google-adsense-account": "ca-pub-1741876528103024",
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
    title: "모두일보",
    description: SITE_DESCRIPTION,
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "모두일보",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "모두일보",
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
        {/* Google AdSense 스크립트(adsbygoogle.js)는 head가 아니라 <AdSenseLoader/>가 LCP 이후 지연 주입한다
            (head의 async 스크립트도 파서가 읽는 즉시 요청 → LCP 이미지와 대역폭 경합).
            preconnect도 그 시점에 함께 붙는다 — 사유는 AdSenseLoader.tsx 주석 참조.
            자동광고는 대시보드에서 OFF. 광고는 <AdSlot/> 수동 슬롯(홈 1·기사 1)에만 나온다. */}
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
        <AdSenseLoader />
      </body>
    </html>
  );
}
