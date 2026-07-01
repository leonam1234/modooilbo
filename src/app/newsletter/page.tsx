import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { NewsletterCTA } from "@/components/NewsletterCTA";
import { MailIcon, ClockIcon } from "@/components/icons";
import { NewsletterToggle } from "./NewsletterToggle";

export const metadata: Metadata = {
  title: "뉴스레터",
  description:
    "모두일보 에디터가 엄선한 뉴스를 메일함으로. 매일 아침의 핵심 브리핑부터 경제·테크·문화 심층 레터까지, 원하는 주제만 골라 구독하세요.",
};

interface Newsletter {
  id: string;
  name: string;
  cadence: string;
  day: string;
  description: string;
  recommended?: boolean;
}

const NEWSLETTERS: Newsletter[] = [
  {
    id: "morning",
    name: "모두의 아침",
    cadence: "매일 아침 7시",
    day: "매일",
    description:
      "출근길에 꼭 알아야 할 오늘의 뉴스 일곱 가지. 밤사이 일어난 일과 오늘의 관전 포인트를 에디터가 3분 분량으로 정리합니다.",
    recommended: true,
  },
  {
    id: "economy",
    name: "이코노미 인사이트",
    cadence: "주 2회 · 화·금",
    day: "주 2회",
    description:
      "시장의 소음을 걷어낸 경제 분석. 금리와 환율, 부동산과 산업 동향을 데이터와 함께 풀어 흐름을 읽는 눈을 길러 드립니다.",
  },
  {
    id: "tech",
    name: "테크 브리핑",
    cadence: "주 1회 · 수요일",
    day: "주 1회",
    description:
      "AI와 반도체, 플랫폼과 스타트업까지. 기술이 산업과 일상을 어떻게 바꾸는지 가장 중요한 변화만 골라 전합니다.",
  },
  {
    id: "culture",
    name: "컬처 레터",
    cadence: "주 1회 · 토요일",
    day: "주 1회",
    description:
      "주말을 풍요롭게 할 영화·책·전시·음악 큐레이션. 화제의 콘텐츠와 그 뒤의 맥락까지 담은 문화 길잡이입니다.",
  },
  {
    id: "opinion",
    name: "위클리 오피니언",
    cadence: "주 1회 · 일요일",
    day: "주 1회",
    description:
      "한 주의 쟁점을 깊이 들여다보는 칼럼 모음. 모두일보 논설위원과 외부 필진의 시선을 한자리에서 만나보세요.",
  },
];

export default function NewsletterPage() {
  return (
    <>
      <PageHeader
        title="뉴스레터"
        subtitle="에디터가 엄선한 뉴스를 매일 아침 메일함으로 받아보세요."
        breadcrumb={[{ label: "뉴스레터" }]}
      />

      <section className="container-page py-10 sm:py-12">
        <div className="max-w-3xl">
          <p className="leading-relaxed text-ink-600 dark:text-ink-300">
            넘쳐나는 정보 속에서 정말 중요한 것만 골라 전합니다. 관심 있는 주제의 뉴스레터를
            구독하면, 모두일보 에디터가 직접 선별하고 정리한 소식을 정해진 시간에 받아볼 수
            있습니다. 모든 뉴스레터는 무료이며 언제든 구독을 취소할 수 있습니다.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {NEWSLETTERS.map((nl) => (
            <article
              key={nl.id}
              className="flex flex-col rounded-xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-signal-50 dark:bg-signal-950/40">
                    <MailIcon className="h-5 w-5 text-signal-600 dark:text-signal-400" />
                  </span>
                  <div>
                    <h2 className="font-headline text-lg font-bold text-ink-900 dark:text-white">
                      {nl.name}
                    </h2>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500 dark:text-ink-400">
                      <ClockIcon className="h-3.5 w-3.5" />
                      {nl.cadence}
                    </p>
                  </div>
                </div>
                {nl.recommended && (
                  <span className="shrink-0 rounded-full bg-signal-600 px-2.5 py-1 text-xs font-bold text-white">
                    추천
                  </span>
                )}
              </div>

              <p className="mt-4 flex-1 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                {nl.description}
              </p>

              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="inline-flex items-center rounded-md bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                  {nl.day} 발행
                </span>
                <NewsletterToggle name={nl.name} />
              </div>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-ink-500 dark:text-ink-400">
          정식 오픈 준비 중입니다.
        </p>
      </section>

      <NewsletterCTA />
    </>
  );
}
