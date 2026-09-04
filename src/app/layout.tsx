import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Header } from "@/components/Header";
import { BreakingTicker } from "@/components/BreakingTicker";
import { TrendingTags } from "@/components/TrendingTags";
import { Footer } from "@/components/Footer";
import { AutoRefresh } from "@/components/AutoRefresh";
import { WeatherBackground } from "@/components/WeatherBackground";
import { BackToTop } from "@/components/BackToTop";
import { GlassFilters } from "@/components/GlassFilters";
import { ThirdPartyScripts } from "@/components/ThirdPartyScripts";
import {
  GA4_BOOTSTRAP_ID,
  GA4_HEAD_BOOTSTRAP,
  GA4_LOADER_ID,
  GA4_SCRIPT_URL,
} from "@/lib/google-analytics";
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
      { url: "/favicon.ico?v=d", sizes: "any" },
      { url: "/icon.png?v=d", type: "image/png", sizes: "512x512", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark.png?v=d", type: "image/png", sizes: "512x512", media: "(prefers-color-scheme: dark)" },
    ],
    apple: [{ url: "/apple-icon.png?v=d", sizes: "180x180" }],
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
        {/* Google 태그(gtag.js) — GA4(측정 ID 는 lib/google-analytics.ts 한 곳). 구글 안내대로 <head> 첫 자리에 **조건 없이**,
            표준 스니펫 그대로(부트스트랩 인라인 → async 로더). 순서: dataLayer/gtag 정의가 먼저.
            ⚠️ 동의 게이트·시간 게이트·지연 주입(Next 의 <Script afterInteractive> 포함)으로 바꾸지 말 것:
               2026-09-03 실측 — 동의 후에만 page_view 를 보내는 Consent Mode 구성은 배포 뒤에도
               구글 "태그 감지"가 "감지되지 않았습니다"였다. 표준 스니펫은 로드 즉시 히트가 난다.
               한국 개인정보보호법상 분석 쿠키는 처리방침 고지로 충분하다(/privacy §5·§6·§8).
            인증 토큰 경로 4종은 Pages middleware 가 두 태그와 Flight 복제 노드를 제거하고,
            부트스트랩도 같은 경로에서 config 를 건너뛴다(lib/google-analytics.ts). 기준: docs/tracking.md */}
        <script
          id={GA4_BOOTSTRAP_ID}
          dangerouslySetInnerHTML={{ __html: GA4_HEAD_BOOTSTRAP }}
        />
        <script id={GA4_LOADER_ID} async src={GA4_SCRIPT_URL} />
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
            없으면 beacon 미삽입 → 수집 안 함(가짜 수치 없음). 인증 토큰 착지 경로에서는
            Pages middleware가 태그와 Flight 복제 노드를 제거한다. 기준: docs/tracking.md */}
        {process.env.NEXT_PUBLIC_CF_BEACON_TOKEN && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${process.env.NEXT_PUBLIC_CF_BEACON_TOKEN}"}`}
          />
        )}
        {/* Google AdSense — Next가 초기 HTML에 preload와 설정을 남기되, 실제 스크립트는
            hydration 뒤 즉시 1회 실행한다. raw async head 실행은 AdSense가 React보다 먼저
            body에 ins/iframe을 삽입해 WebKit 전 페이지에서 hydration #418을 만들었다.
            afterInteractive는 기존 LCP 이후 idle 로더보다 훨씬 일찍 실행되며, 실제 광고
            push는 계속 AdSlot이 담당한다. 인증 토큰 착지 경로 4종에서는 Pages middleware가
            preload와 Next Flight 설정까지 제거해 외부 요청과 URL 토큰 유출을 막는다. */}
        <Script
          id="adsense-script"
          strategy="afterInteractive"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1741876528103024"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-sans">
        <GlassFilters />
        <AutoRefresh />
        <WeatherBackground />
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-signal-600 focus:px-4 focus:py-2 focus:font-semibold focus:text-white"
        >
          본문 바로가기
        </a>
        {/* 헤더 + 속보 + 실시간인기 = **통유리 한 장**.
            유리(배경 알파 + backdrop-filter)를 여기 한 곳에서만 건다. 자식들은 전부 투명이다.
            ⚠️ 자식에 배경이나 backdrop-filter 를 도로 넣지 말 것 — 각자 제 백드롭을 따로
               필터링해 층이 갈리고, 경계마다 톤이 어긋나 '판 여러 장'으로 보인다.
            ⚠️ 기본값은 불투명(95%)이고 투명(30%)은 supports-[backdrop-filter] 안에서만 켠다.
               블러가 없는 브라우저에서 30% 만 남으면 뒤 본문이 그대로 비쳐 헤더를 읽을 수 없다.
            ⚠️ 이 래퍼 안에서 position:fixed 를 쓰지 말 것 — backdrop-filter 가 fixed 자손의 기준 상자
               (containing block)가 되어 `fixed inset-0` 이 화면이 아니라 이 래퍼(~147px)에 갇힌다.
               8/21~9/4 모바일 드로어가 그래서 147px 로 잘렸다. 모달·드로어·백드롭은 body 로
               포털한다(Header 드로어·TrendingTags 백드롭 참조). */}
        <div className="no-print sticky top-0 z-40 border-b border-ink-200/50 bg-white/95 backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-white/30 dark:border-ink-800/50 dark:bg-ink-950/95 dark:supports-[backdrop-filter]:bg-ink-950/30">
          <Header />
          <BreakingTicker />
          <TrendingTags />
        </div>
        <div className="relative z-10">
          <main id="content">{children}</main>
          <Footer />
        </div>
        <BackToTop />
        <ThirdPartyScripts />
      </body>
    </html>
  );
}
