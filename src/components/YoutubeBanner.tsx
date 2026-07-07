/** 홈 하단 유튜브 채널 대형 배너 — 섹션들과 뉴스레터 CTA 사이. */
export function YoutubeBanner() {
  return (
    <section className="border-t border-ink-100 bg-ink-50/70 dark:border-ink-800 dark:bg-ink-900/60">
      <div className="container-page py-12 sm:py-14">
        <a
          href="https://www.youtube.com/@모두일보"
          target="_blank"
          rel="noopener noreferrer"
          className="group mx-auto flex max-w-3xl flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left"
        >
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#FF0000] transition-transform duration-300 group-hover:scale-105 sm:h-20 sm:w-20">{/* 유튜브 고유 레드 — 브랜드 아이콘 예외(오너 지시) */}
              <svg viewBox="0 0 24 24" className="ml-1 h-8 w-8 fill-white sm:h-9 sm:w-9" aria-hidden>
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
            </span>
            <div>
              <h2 className="font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
                모두일보 영상 뉴스
              </h2>
              <p className="mt-1.5 text-ink-500 dark:text-ink-300">
                1분 쇼츠로 보는 오늘의 뉴스 — 유튜브에서 만나보세요
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-ink-900 px-8 py-4 font-semibold text-white transition-opacity group-hover:opacity-80 dark:bg-white dark:text-ink-900">
            유튜브 구독하기 →
          </span>
        </a>
      </div>
    </section>
  );
}
