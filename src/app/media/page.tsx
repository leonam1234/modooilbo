import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "영상",
  description: "모두일보 영상 뉴스는 유튜브 채널에서 만나보세요 — 1분 쇼츠로 보는 오늘의 뉴스.",
  alternates: { canonical: "/media/" },
};

const YT = "https://www.youtube.com/@모두일보";

export default function MediaPage() {
  return (
    <>
      <PageHeader
        title="영상"
        subtitle="모두일보의 영상 뉴스는 유튜브에서 이어집니다."
        breadcrumb={[{ label: "영상" }]}
      />
      <div className="container-page py-14">
        <div className="mx-auto max-w-xl rounded-2xl border border-ink-200 bg-white/80 p-8 text-center backdrop-blur dark:border-ink-800 dark:bg-ink-900/80 sm:p-10">
          {/* 유튜브 재생 심볼 — 무채색 */}
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-ink-900 dark:bg-white">
            <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-white dark:fill-ink-900" aria-hidden>
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
          </span>
          <h2 className="mt-6 font-headline text-2xl font-extrabold text-ink-900 dark:text-white">
            모두일보 유튜브 채널
          </h2>
          <p className="mt-3 leading-relaxed text-ink-500 dark:text-ink-300">
            하루의 주요 뉴스를 1분 안팎의 쇼츠로 정리해 전합니다.
            <br />
            균형 있게 보는 오늘의 뉴스 — 영상으로 만나보세요.
          </p>
          <a
            href={YT}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-block rounded-full bg-ink-900 px-8 py-3.5 font-semibold text-white transition-opacity hover:opacity-80 dark:bg-white dark:text-ink-900"
          >
            유튜브에서 모두일보 구독하기 →
          </a>
          <p className="mt-4 text-xs text-ink-400">youtube.com/@모두일보</p>
        </div>
      </div>
    </>
  );
}
