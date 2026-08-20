import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PARTNERS } from "@/lib/partners";

export const metadata: Metadata = {
  title: "광고·후원 계약사",
  description:
    "모두일보에 광고·콘텐츠 제작 용역을 위탁한 계약사와 모두일보와의 이해관계를 공개합니다. 광고·후원 계약사의 상호와 사업 내용, 발행인과의 이해관계를 공개합니다. 광고성 콘텐츠는 기사와 구분해 광고 표기와 함께 발행하며 편집권은 독립적으로 행사합니다.",
  alternates: { canonical: "/partners/" },
};

/**
 * 마침표·쉼표 뒤에서 줄을 바꾼다(2026-08-11 요청).
 * 카드 폭이 좁아 문장이 아무 데서나 접히면 읽기 어렵다 — 구분점에서만 끊는다.
 * 마지막 조각 뒤에는 <br> 를 넣지 않는다(카드 아래 여백이 벌어진다).
 */
function splitSentences(text: string) {
  const parts = text
    .split(/(?<=[.,])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.map((s, i) => (
    <span key={i}>
      {s}
      {i < parts.length - 1 && <br />}
    </span>
  ));
}

export default function PartnersPage() {
  const related = PARTNERS.filter((p) => p.relation);

  return (
    <>
      <PageHeader
        title="광고·후원 계약사"
        subtitle="모두일보에 광고를 집행하는 회사와 이해관계를 그대로 공개합니다. 광고는 보도에 관여하지 않습니다."
        breadcrumb={[{ label: "광고·후원 계약사" }]}
      />

      <div className="container-page py-10 sm:py-12">
        <div className="mx-auto max-w-3xl">
          {/* ── 왜 공개하는가 ─────────────────────────────────── */}
          <section className="mb-10 rounded-xl border border-ink-200 bg-ink-50/60 p-6 dark:border-ink-800 dark:bg-ink-900/60">
            <h2 className="font-headline text-lg font-bold text-ink-900 dark:text-white">
              왜 공개하는가
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              언론사의 수입원은 독자가 보도를 어떻게 읽어야 하는지 판단하는 데 필요한 정보입니다.
              모두일보는 광고·콘텐츠 제작 용역을 위탁한 회사를 이 페이지에 밝히고, 그중 발행인이
              관여하는 회사는 별도로 표시합니다. 해당 회사를 다루는 기사에도 같은 사실을 고지합니다.
            </p>
          </section>

          {/* ── 계약사 목록 ───────────────────────────────────── */}
          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              계약사
            </h2>
            {/* 카드 높이를 items-stretch 로 행마다 맞추고, 내부는 flex-col 로 쌓아
                링크·계약시작을 mt-auto 로 바닥에 붙인다. 회사마다 소개 길이가 달라
                그냥 두면 카드가 들쭉날쭉해진다(2026-08-11 지적). */}
            <ul className="mt-5 grid items-stretch gap-4 sm:grid-cols-2">
              {PARTNERS.map((p) => (
                <li
                  key={p.slug}
                  className="flex h-full flex-col rounded-xl border border-ink-200 bg-white p-5 text-center dark:border-ink-800 dark:bg-ink-900"
                >
                  {/* 로고 영역 — 로고가 없는 회사는 회사명을 크게 보여준다.
                      비율이 제각각이라 320x160 투명 PNG로 정규화해 두고 박스에 맞춘다. */}
                  <div className="flex h-20 items-center justify-center">
                    {p.logo ? (
                      <Image
                        src={`/partners/${p.slug}.png`}
                        alt={p.name}
                        width={320}
                        height={160}
                        loading="lazy"
                        className="max-h-16 w-auto object-contain dark:brightness-0 dark:invert"
                      />
                    ) : (
                      <span className="font-headline text-lg font-bold text-ink-700 dark:text-ink-200">
                        {p.name}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-1 flex-col border-t border-ink-100 pt-4 dark:border-ink-800">
                    <p className="font-semibold text-ink-900 dark:text-white">{p.name}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                      {splitSentences(p.desc)}
                    </p>

                    {p.relation && (
                      <p className="mt-3 rounded-md bg-signal-50 px-3 py-2.5 text-xs leading-relaxed text-signal-700 dark:bg-signal-950/40 dark:text-signal-300">
                        이해관계 고지
                        <br />
                        {splitSentences(p.relation)}
                      </p>
                    )}

                    {/* mt-auto — 소개 길이와 무관하게 링크를 카드 바닥에 정렬한다. */}
                    <div className="mt-auto pt-3">
                      {p.url ? (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow sponsored"
                          className="text-sm font-medium text-ink-500 underline underline-offset-4 hover:text-signal-600 dark:text-ink-400 dark:hover:text-signal-400"
                        >
                          {p.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      ) : (
                        <p className="text-sm text-ink-400 dark:text-ink-500">홈페이지 준비 중</p>
                      )}

                      {p.since && (
                        <p className="mt-2 text-xs text-ink-400 dark:text-ink-500">계약 시작 {p.since}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* ── 이해관계 요약 ─────────────────────────────────── */}
          {related.length > 0 && (
            <section className="mb-10">
              <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
                이해관계 있는 계약사
              </h2>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                아래 {related.length}개사는 모두일보 발행인이 관여하는 회사입니다. 공정거래법상
                계열회사 관계는 아니지만, 독자가 알아야 할 사실이라 밝힙니다. 이 회사들을 다루는
                기사에는 본문에도 같은 고지를 넣습니다.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-600 dark:text-ink-300">
                {related.map((p) => (
                  <li key={p.slug}>{p.name}</li>
                ))}
              </ul>
            </section>
          )}

          {/* ── 편집권 ────────────────────────────────────────── */}
          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              광고와 보도의 분리
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-ink-600 dark:text-ink-300">
              <li>
                광고 계약은 보도·논평에 관여할 권리를 부여하지 않습니다. 계약서에 명문으로 정해
                두었습니다.
              </li>
              <li>
                계약사는 자사에 관한 기사의 게재·삭제·수정을 요구할 수 없으며, 비판 보도를 이유로
                계약을 해지할 수 없습니다.
              </li>
              <li>
                광고성 콘텐츠에는 <b>&ldquo;광고&rdquo;</b> 표기를 명확히 하여 기사와 구분합니다.
              </li>
              <li>
                이해관계가 있는 회사를 다루는 기사에는 본문에 그 사실을 고지합니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              광고 문의
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              광고·제휴를 원하시면{" "}
              <Link href="/advertise/" className="underline underline-offset-4 hover:text-signal-600 dark:hover:text-signal-400">
                광고·제휴 안내
              </Link>
              를 참고하시거나 ad@modooilbo.com 으로 연락해 주세요. 보도에 관한 의견은{" "}
              <Link href="/committee/" className="underline underline-offset-4 hover:text-signal-600 dark:hover:text-signal-400">
                이용자위원회
              </Link>
              와{" "}
              <Link href="/ombudsman/" className="underline underline-offset-4 hover:text-signal-600 dark:hover:text-signal-400">
                고충처리인
              </Link>
              이 받습니다.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
