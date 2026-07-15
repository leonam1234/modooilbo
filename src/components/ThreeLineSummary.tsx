import { ChevronRightIcon } from "./icons";

/**
 * 세 줄 요약 — 본문 첫 문장 3개를 접이식 박스로 제공(기본 접힘).
 * <details> 기반 서버 컴포넌트: 클라이언트 JS·외부 API 없음.
 */
export function ThreeLineSummary({ lines }: { lines: string[] }) {
  if (lines.length < 2) return null;

  return (
    <details className="group mt-8 rounded-xl border border-ink-200 bg-ink-50 dark:border-ink-800 dark:bg-ink-900">
      <summary className="flex cursor-pointer select-none items-center gap-2 px-5 py-3.5 [&::-webkit-details-marker]:hidden [&::marker]:content-none">
        <span className="font-headline text-base font-extrabold text-ink-900 dark:text-white">
          세 줄 요약
        </span>
        <span className="text-xs text-ink-500 dark:text-ink-400">본문 핵심 문장을 자동으로 추렸습니다</span>
        <ChevronRightIcon className="ml-auto h-4 w-4 shrink-0 rotate-90 text-ink-500 dark:text-ink-400 transition-transform group-open:-rotate-90" />
      </summary>
      <ol className="space-y-2.5 border-t border-ink-200 px-5 py-4 dark:border-ink-800">
        {lines.map((line, i) => (
          <li key={i} className="flex gap-3">
            <span
              aria-hidden
              className="w-4 shrink-0 font-headline text-base font-black leading-relaxed text-ink-500 dark:text-ink-400"
            >
              {i + 1}
            </span>
            <p className="text-[15px] leading-relaxed text-ink-700 dark:text-ink-200">{line}</p>
          </li>
        ))}
      </ol>
    </details>
  );
}
