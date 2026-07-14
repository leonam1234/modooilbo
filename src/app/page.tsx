import type { Metadata } from "next";
import Link from "next/link";
import { HeroLead } from "@/components/HeroLead";
import { BizSectionGroup } from "@/components/BizSectionGroup";
import { SectionBlock } from "@/components/SectionBlock";
import { RankingList } from "@/components/RankingList";
import { getMostRead } from "@/lib/queries";
import { NewsletterCTA } from "@/components/NewsletterCTA";
import { Reveal } from "@/components/Reveal";
import JsonLd from "@/components/JsonLd";
import { SITE } from "@/lib/site";

const SITE_URL = "https://modooilbo.com";

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "NewsMediaOrganization",
  "@id": `${SITE_URL}/#organization`,
  // 1순위 이름은 한글 "모두일보"(name). alternateName은 name이 거부될 때의 폴백 후보 —
  // 한글을 맨 앞에 둬 한글 우선 선택 유도(SEO 자문 2026-07 반영).
  name: SITE.name,
  alternateName: ["모두일보 뉴스", "Modoo Ilbo", "MODOO ILBO"],
  url: `${SITE_URL}/`, // canonical(끝슬래시)과 동일 표기
  logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png`, width: 512, height: 512 },
  foundingDate: SITE.regDate.replace(/\./g, "-"),
  address: {
    "@type": "PostalAddress",
    streetAddress: SITE.address,
    postalCode: SITE.addressZip,
    addressCountry: "KR",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: SITE.email,
    telephone: SITE.tel,
  },
  ...(SITE.sameAs.length > 0 ? { sameAs: [...SITE.sameAs] } : {}),
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  // 1순위 이름은 한글 "모두일보"(name). alternateName은 name이 거부될 때의 폴백 후보 —
  // 한글을 맨 앞에 둬 한글 우선 선택 유도(SEO 자문 2026-07 반영).
  name: "모두일보",
  alternateName: ["모두일보 뉴스", "Modoo Ilbo", "MODOO ILBO", "modooilbo.com"],
  url: `${SITE_URL}/`, // canonical(끝슬래시)과 동일 표기 — 구글 사이트 이름 인식 정합
  inLanguage: "ko-KR",
  publisher: { "@id": `${SITE_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/search/?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": "/rss.xml",
    },
  },
};

export default function Home() {
  return (
    <>
      <JsonLd data={organizationLd} />
      <JsonLd data={websiteLd} />
      <h1 className="sr-only">모두일보 — 경제·사회·국제·문화·스포츠·테크·오피니언 최신 뉴스</h1>

      {/* 히어로 행 — [좌: 리드 + 보조4 콤팩트] | [우: '많이 본' 랭킹 + 후원 CTA].
          모바일은 세로 스택(리드 → 보조4 → 많이 본 → 후원). '많이 본'을 히어로 우측에 고정해
          다시 아래로 밀리지 않게 한다. */}
      <section className="container-page py-6 sm:py-8">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_280px] lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-x-10">
          <HeroLead />

          <aside className="space-y-8">
            <RankingList
              count={10}
              pool={getMostRead(60).map((a) => ({ id: a.id, slug: a.slug, title: a.title, category: a.category }))}
            />

            <div className="rounded-xl border border-ink-200 bg-ink-50 p-6 dark:border-ink-800 dark:bg-ink-900">
              <h3 className="font-headline text-lg font-bold text-ink-900 dark:text-white">
                독립 저널리즘을 후원하세요
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-ink-300">
                광고가 아닌 독자의 힘으로 만드는 뉴스. 모두일보의 후원회원이 되어주세요.
              </p>
              <Link
                href="/subscribe"
                className="mt-4 block rounded-md bg-signal-600 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-signal-700"
              >
                후원·구독하기
              </Link>
            </div>
          </aside>
        </div>
      </section>

      {/* 기업 데이터 뉴스(사업 축) — 히어로 직후, 종합뉴스 섹션들 위에 2열로 노출.
          사업 메뉴 6개 전부 노출: 기사 있는 카테고리(정부지원금)는 실제 카드, 나머지는 '준비 중' 카드. */}
      <BizSectionGroup />

      {/* 종합뉴스 — 경제 포함 전 섹션을 한 2열 그리드로(경제 단독 대형 피처 제거).
          경제|사회, 오피니언|국제, 문화|스포츠 짝 + 테크(7번째, 좌측 반폭). 테크는 산업·트렌드로 흡수되는 레거시라 맨 뒤. */}
      <div className="container-page grid gap-x-10 gap-y-12 py-10 md:grid-cols-2">
        <Reveal><SectionBlock slug="economy" count={4} /></Reveal>
        <Reveal><SectionBlock slug="society" count={4} /></Reveal>
        <Reveal><SectionBlock slug="opinion" count={4} /></Reveal>
        <Reveal><SectionBlock slug="world" count={4} /></Reveal>
        <Reveal><SectionBlock slug="culture" count={4} /></Reveal>
        <Reveal><SectionBlock slug="sports" count={4} /></Reveal>
        <Reveal><SectionBlock slug="tech" count={4} /></Reveal>
      </div>

      <NewsletterCTA />
    </>
  );
}
