import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ArrowRightIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "회사소개",
  description:
    "모두일보는 모두를 위한 신뢰의 뉴스를 전하는 독립 디지털 언론입니다. 미션과 핵심 가치, 연혁, 편집 원칙을 소개합니다.",
  alternates: { canonical: "/about/" },
};

const VALUES: { title: string; body: string }[] = [
  {
    title: "정확성",
    body: "단독보다 사실이 먼저입니다. 모든 보도는 복수의 출처로 교차 확인하며, 오류가 확인되면 즉시 바로잡고 그 과정을 투명하게 공개합니다.",
  },
  {
    title: "독립성",
    body: "광고주, 정파, 자본 어디에도 기울지 않습니다. 편집과 경영을 분리해 보도의 자율성을 제도적으로 보장합니다.",
  },
  {
    title: "공공성",
    body: "시민이 더 나은 판단을 내릴 수 있도록 복잡한 사안을 명료하게 전합니다. 공익에 필요한 정보는 누구나 닿을 수 있어야 한다고 믿습니다.",
  },
  {
    title: "혁신",
    body: "데이터 저널리즘과 인터랙티브 보도를 통해 뉴스의 형식을 끊임없이 실험하고, 독자 경험을 가장 앞선 자리로 끌어올립니다.",
  },
];

const TIMELINE: { year: string; event: string }[] = [
  {
    year: "2026.06",
    event:
      "모두일보 디지털 창간. ‘모두를 위한 신뢰의 뉴스’를 슬로건으로 데일리 뉴스 서비스를 시작했습니다.",
  },
  {
    year: "2026.06",
    event:
      "정치·경제·사회·국제·문화·스포츠·테크·오피니언 8개 섹션 편집 체계를 구축하고, 정치적 중립과 출처 공개를 핵심으로 한 편집 원칙을 마련했습니다.",
  },
  {
    year: "2026.06",
    event:
      "RSS 피드와 사이트맵을 공개하고 네이버·구글 검색에 등록해 디지털 유통 기반을 갖췄습니다.",
  },
  {
    year: "로드맵",
    event:
      "뉴스레터, 독자 후원 멤버십, 팩트체크를 단계적으로 준비하고 있습니다. (예정)",
  },
];

const ORG: { name: string; desc: string }[] = [
  {
    name: "편집국",
    desc: "정치·경제·사회·국제·문화 등 전 분야 취재와 데스킹을 담당하는 보도의 중심입니다.",
  },
  {
    name: "데이터저널리즘팀",
    desc: "데이터 분석과 시각화, 인터랙티브 콘텐츠로 복잡한 사안을 풀어냅니다.",
  },
  {
    name: "팩트체크 센터",
    desc: "공적 발언과 온라인 정보의 사실 여부를 독립적으로 검증합니다.",
  },
  {
    name: "독자서비스국",
    desc: "구독·후원·제보 등 독자와의 모든 접점을 책임지고 관리합니다.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="회사소개"
        subtitle="모두일보는 모두를 위한 신뢰의 뉴스를 전하는 독립 디지털 언론입니다."
        breadcrumb={[{ label: "회사소개" }]}
      />

      {/* 미션 */}
      <section className="container-page py-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-signal-600 dark:text-signal-400">
              Our Mission
            </p>
            <h2 className="mt-3 font-headline text-3xl font-extrabold leading-tight text-ink-900 dark:text-white sm:text-4xl">
              모두를 위한
              <br />
              신뢰의 뉴스
            </h2>
          </div>
          <div className="space-y-5 text-lg leading-relaxed text-ink-600 dark:text-ink-300">
            <p>
              하루에도 수만 건의 정보가 쏟아집니다. 모두일보는 그 소음 속에서 진짜 중요한
              ‘신호’를 가려내, 시민이 세상을 더 또렷하게 볼 수 있도록 돕기 위해 태어났습니다.
            </p>
            <p>
              우리는 속보 경쟁보다 사실의 무게를 먼저 생각합니다. 빠르게 전하되 정확하게,
              날카롭게 묻되 공정하게. 권력을 감시하고 약자의 목소리에 귀 기울이며, 데이터와
              현장을 함께 들여다보는 것이 우리가 정의하는 좋은 저널리즘입니다.
            </p>
            <p>
              모두일보는 독자의 신뢰를 가장 큰 자산으로 여깁니다. 누구의 눈치도 보지 않는
              독립 언론으로서, 오늘도 더 나은 질문을 던지고 더 정직한 답을 찾아 나섭니다.
            </p>
          </div>
        </div>
      </section>

      {/* 핵심 가치 */}
      <section className="border-t border-ink-200 bg-ink-50 py-12 dark:border-ink-800 dark:bg-ink-900/40">
        <div className="container-page">
          <h2 className="font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
            우리가 지키는 가치
          </h2>
          <p className="mt-2 max-w-2xl text-ink-500 dark:text-ink-300">
            모든 보도와 판단의 바탕이 되는 네 가지 원칙입니다.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v, i) => (
              <div
                key={v.title}
                className="rounded-xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900"
              >
                <span className="font-headline text-2xl font-bold text-signal-600 dark:text-signal-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 text-lg font-bold text-ink-900 dark:text-white">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                  {v.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 연혁 */}
      <section className="container-page py-12">
        <h2 className="font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
          연혁
        </h2>
        <p className="mt-2 max-w-2xl text-ink-500 dark:text-ink-300">
          2026년 창간 이후 지금까지의 발자취와 앞으로의 계획입니다.
        </p>
        <ol className="mt-8 border-l-2 border-ink-200 dark:border-ink-800">
          {TIMELINE.map((t, i) => (
            <li key={i} className="relative pb-8 pl-8 last:pb-0">
              <span
                aria-hidden
                className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-signal-600 dark:border-ink-950 dark:bg-signal-500"
              />
              <span className="font-headline text-xl font-bold text-signal-600 dark:text-signal-400">
                {t.year}
              </span>
              <p className="mt-1 text-ink-600 dark:text-ink-300">{t.event}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 편집 원칙 */}
      <section className="border-t border-ink-200 bg-ink-50 py-12 dark:border-ink-800 dark:bg-ink-900/40">
        <div className="container-page">
          <div className="rounded-xl border border-ink-200 bg-white p-8 dark:border-ink-800 dark:bg-ink-900 sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
              <div>
                <h2 className="font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
                  편집 원칙
                </h2>
                <p className="mt-4 leading-relaxed text-ink-600 dark:text-ink-300">
                  모두일보의 모든 콘텐츠는 사실 확인, 출처 투명성, 이해상충 회피라는 세 기둥
                  위에 세워집니다. 우리는 추측을 사실처럼 전하지 않으며, 오류가 있으면 숨기지
                  않고 정정합니다. 취재 윤리와 정정·반론 원칙, 청소년보호정책의 전문은 윤리강령
                  페이지에서 확인하실 수 있습니다.
                </p>
              </div>
              <div className="lg:text-right">
                <Link
                  href="/ethics"
                  className="inline-flex items-center gap-2 rounded-md bg-signal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-signal-700"
                >
                  윤리강령 전문 보기
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 뉴스룸/조직 + 오시는 길 */}
      <section className="container-page py-12">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
              뉴스룸과 조직
            </h2>
            <p className="mt-2 max-w-2xl text-ink-500 dark:text-ink-300">
              약 80명의 기자와 에디터, 데이터 분석가, 개발자가 함께 뉴스를 만듭니다.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {ORG.map((o) => (
                <div
                  key={o.name}
                  className="rounded-xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900"
                >
                  <h3 className="text-base font-bold text-ink-900 dark:text-white">{o.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                    {o.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
              오시는 길
            </h2>
            <div className="mt-6 rounded-xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
              <div
                aria-hidden
                className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-ink-300 bg-ink-50 text-sm text-ink-400 dark:border-ink-700 dark:bg-ink-950"
              >
                지도 영역 (준비 중)
              </div>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex gap-3">
                  <dt className="w-14 shrink-0 font-semibold text-ink-500 dark:text-ink-400">주소</dt>
                  <dd className="text-ink-700 dark:text-ink-200">
                    서울특별시 중구 세종대로 124 모두일보빌딩 (우 04520)
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-14 shrink-0 font-semibold text-ink-500 dark:text-ink-400">대표</dt>
                  <dd className="text-ink-700 dark:text-ink-200">02-1234-5678</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-14 shrink-0 font-semibold text-ink-500 dark:text-ink-400">교통</dt>
                  <dd className="text-ink-700 dark:text-ink-200">
                    지하철 1·2호선 시청역 4번 출구에서 도보 3분
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
