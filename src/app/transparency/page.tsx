import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PageHeader } from "@/components/PageHeader";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "투명성 보고",
  description:
    "모두일보의 소유구조, 재정·수익구조 원칙, 편집 독립성과 이해상충 정책을 공개합니다.",
  alternates: { canonical: "/transparency/" },
};

const TOC: { id: string; label: string }[] = [
  { id: "ownership", label: "소유구조" },
  { id: "registration", label: "언론사 등록" },
  { id: "funding", label: "재정·수익구조" },
  { id: "independence", label: "편집 독립성" },
  { id: "conflicts", label: "이해상충 정책" },
];

export default function TransparencyPage() {
  return (
    <>
      <PageHeader
        title="투명성 보고"
        subtitle="모두일보가 누구의 소유이고, 어떻게 운영 재원을 마련하며, 편집의 독립을 어떻게 지키는지 공개합니다."
        breadcrumb={[{ label: "투명성 보고" }]}
      />

      <div className="container-page py-12">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
          {/* 목차 */}
          <aside className="mb-10 lg:mb-0">
            <nav
              aria-label="목차"
              className="lg:sticky lg:top-24 rounded-xl border border-ink-200 bg-ink-50 p-5 dark:border-ink-800 dark:bg-ink-900/40"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-500 dark:text-ink-400">목차</p>
              <ul className="mt-3 space-y-2 text-sm">
                {TOC.map((t) => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      className="text-ink-600 transition-colors hover:text-signal-600 dark:text-ink-300 dark:hover:text-signal-400"
                    >
                      {t.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* 본문 */}
          <article className="max-w-3xl">
            {/* 소유구조 */}
            <section id="ownership" className="scroll-mt-24">
              <h2 className="mt-8 font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
                소유구조
              </h2>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                모두일보는 아래의 법인이 발행하는 인터넷신문입니다. 발행 주체와 책임자를
                명확히 밝히는 것이 신뢰의 출발점이라고 믿습니다.
              </p>
              <div className="mt-4 rounded-xl border border-ink-200 bg-ink-50 p-6 dark:border-ink-800 dark:bg-ink-900/40">
                <dl className="space-y-2.5 text-sm">
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 font-semibold text-ink-500 dark:text-ink-400">
                      발행 법인
                    </dt>
                    <dd className="text-ink-700 dark:text-ink-200">{SITE.legalName}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 font-semibold text-ink-500 dark:text-ink-400">
                      대표이사·발행인
                    </dt>
                    <dd className="text-ink-700 dark:text-ink-200">{SITE.publisher}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 font-semibold text-ink-500 dark:text-ink-400">
                      편집인
                    </dt>
                    <dd className="text-ink-700 dark:text-ink-200">{SITE.editor}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 font-semibold text-ink-500 dark:text-ink-400">
                      등록번호
                    </dt>
                    <dd className="text-ink-700 dark:text-ink-200">{SITE.regNumber}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 font-semibold text-ink-500 dark:text-ink-400">
                      등록일
                    </dt>
                    <dd className="text-ink-700 dark:text-ink-200">{SITE.regDate}</dd>
                  </div>
                </dl>
              </div>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                모두일보는 특정 정파나 외부 자본으로부터 독립한 언론을 지향하며, 소유구조에
                변동이 있을 경우 본 페이지에 공개합니다.
              </p>
            </section>

            {/* 언론사 등록 */}
            <section id="registration" className="scroll-mt-24">
              <h2 className="mt-12 font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
                언론사 등록
              </h2>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                모두일보는 「신문 등의 진흥에 관한 법률」에 따라 등록된 인터넷신문입니다. 아래는
                경기도지사가 발급한 인터넷신문사업 등록증이며, 발행 주체와 등록 사항을 그대로
                공개합니다.
              </p>
              <div className="mt-4 rounded-xl border border-ink-200 bg-ink-50 p-6 dark:border-ink-800 dark:bg-ink-900/40">
                <dl className="space-y-2.5 text-sm">
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 font-semibold text-ink-500 dark:text-ink-400">제호</dt>
                    <dd className="text-ink-700 dark:text-ink-200">{SITE.name} (인터넷신문)</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 font-semibold text-ink-500 dark:text-ink-400">등록번호</dt>
                    <dd className="text-ink-700 dark:text-ink-200">{SITE.regNumber}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 font-semibold text-ink-500 dark:text-ink-400">등록일</dt>
                    <dd className="text-ink-700 dark:text-ink-200">{SITE.regDate} · 경기도지사</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 font-semibold text-ink-500 dark:text-ink-400">발행소</dt>
                    <dd className="text-ink-700 dark:text-ink-200">
                      {SITE.address} (우 {SITE.addressZip})
                    </dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 font-semibold text-ink-500 dark:text-ink-400">전화</dt>
                    <dd className="text-ink-700 dark:text-ink-200">{SITE.tel}</dd>
                  </div>
                </dl>
              </div>
              <figure className="mt-5">
                <a href="/press-registration.pdf" target="_blank" rel="noopener noreferrer" className="block">
                  <Image
                    src="/press-registration.jpg"
                    alt={`모두일보 인터넷신문사업 등록증 (등록번호 ${SITE.regNumber})`}
                    width={1241}
                    height={1755}
                    unoptimized
                    className="mx-auto w-full max-w-xl rounded-lg border border-ink-200 shadow-sm dark:border-ink-800"
                  />
                </a>
                <figcaption className="mt-2 text-center text-xs text-ink-500 dark:text-ink-400">
                  이미지를 누르면 원본 등록증(PDF)이 열립니다.
                </figcaption>
              </figure>
            </section>

            {/* 재정·수익구조 */}
            <section id="funding" className="scroll-mt-24">
              <h2 className="mt-12 font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
                재정·수익구조
              </h2>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                모두일보는 독자 구독과 후원을 우선 재원으로 삼고, 광고와 제휴를 보조 재원으로
                합니다. 재원의 구성이 보도의 방향을 좌우하지 않도록, 어떤 수익원도 편집권에
                개입할 수 없다는 원칙을 지킵니다. 기사 형식의 네이티브 광고에는 광고임을
                알아볼 수 있는 표기를 의무화합니다.
              </p>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                모두일보는 2026년 창간한 초기 매체로, 연차 재무 현황은 첫 회계연도 종료 후 본
                페이지에서 공개할 예정입니다.
              </p>
            </section>

            {/* 편집 독립성 */}
            <section id="independence" className="scroll-mt-24">
              <h2 className="mt-12 font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
                편집 독립성
              </h2>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                편집권은 편집국에 있으며, 광고·경영 부문과 분리하여 운영합니다. 광고주와
                후원자는 보도의 방향과 내용에 개입할 수 없고, 기사 게재·수정·삭제의 판단은
                오직 편집국의 저널리즘 기준을 따릅니다. 이 원칙은{" "}
                <Link
                  href="/ethics#preamble"
                  className="font-medium text-signal-600 hover:text-signal-700 dark:text-signal-400"
                >
                  윤리강령 제2조(독립성)
                </Link>
                에 명문화되어 있습니다.
              </p>
            </section>

            {/* 이해상충 정책 */}
            <section id="conflicts" className="scroll-mt-24">
              <h2 className="mt-12 font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
                이해상충 정책
              </h2>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                기자는 자신이 직접적인 이해관계를 가진 사안을 취재·보도하지 않으며, 취재
                대상으로부터 금품·향응·부당한 편의를 받지 않습니다. 이해상충의 소지가 확인되면
                즉시 회사에 알리고 해당 보도에서 배제될 수 있습니다. 자세한 기준은{" "}
                <Link
                  href="/ethics#reporting"
                  className="font-medium text-signal-600 hover:text-signal-700 dark:text-signal-400"
                >
                  윤리강령 제6조(이해상충)
                </Link>
                을 따릅니다.
              </p>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                보도에 오류가 확인되어 바로잡은 경우, 그 정정 내역은{" "}
                <Link
                  href="/corrections"
                  className="font-medium text-signal-600 hover:text-signal-700 dark:text-signal-400"
                >
                  정정·반론 보도 모음
                </Link>
                에서 상시 공개합니다.
              </p>
            </section>

            <p className="mt-12 border-t border-ink-200 pt-6 text-sm text-ink-500 dark:text-ink-400 dark:border-ink-800">
              최종 갱신 2026년 7월 1일 · 문의 {SITE.email}
            </p>
          </article>
        </div>
      </div>
    </>
  );
}
