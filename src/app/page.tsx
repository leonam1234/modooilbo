import Link from "next/link";
import { HeroLead } from "@/components/HeroLead";
import { SectionBlock } from "@/components/SectionBlock";
import { RankingList } from "@/components/RankingList";
import { OpinionStrip } from "@/components/OpinionStrip";
import { MediaGrid } from "@/components/MediaGrid";
import { NewsletterCTA } from "@/components/NewsletterCTA";
import JsonLd from "@/components/JsonLd";

const SITE_URL = "https://modooilbo.com";

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "모두일보",
  alternateName: "Modoo Ilbo",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "모두일보",
  alternateName: "Modoo Ilbo",
  url: SITE_URL,
  inLanguage: "ko-KR",
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function Home() {
  return (
    <>
      <JsonLd data={organizationLd} />
      <JsonLd data={websiteLd} />
      <HeroLead />

      <div className="container-page grid gap-x-10 gap-y-12 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-12">
          <SectionBlock slug="politics" count={5} />
          <SectionBlock slug="economy" count={5} />
          <SectionBlock slug="society" count={5} />
        </div>

        <aside className="space-y-10">
          <RankingList count={6} />

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

      <OpinionStrip />

      <div className="container-page grid gap-10 py-10 lg:grid-cols-2">
        <SectionBlock slug="world" count={4} />
        <SectionBlock slug="tech" count={4} />
      </div>

      <div className="container-page grid gap-10 pb-4 lg:grid-cols-2">
        <SectionBlock slug="culture" count={4} />
        <SectionBlock slug="sports" count={4} />
      </div>

      <MediaGrid />
      <NewsletterCTA />
    </>
  );
}
