"use client";

import { useRef, useState } from "react";

/**
 * 뉴스레터 토픽 버튼 — 정식 오픈 전까지는 실제 구독이 불가하므로
 * 가짜 "구독 중 ✓" 토글 대신 '오픈 예정' 상태를 정직하게 보여준다.
 * (백엔드 구독 API가 생기면 이 컴포넌트를 실토글로 되살릴 것)
 */
export function NewsletterToggle({ name }: { name: string }) {
  const [noticed, setNoticed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function notice() {
    setNoticed(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNoticed(false), 2000);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={notice}
        aria-label={`${name} — 정식 오픈 준비 중`}
        className="shrink-0 rounded-md border border-ink-200 bg-ink-50 px-4 py-2 text-sm font-semibold text-ink-500 dark:border-ink-700 dark:bg-ink-800/60 dark:text-ink-400"
      >
        오픈 예정
      </button>
      {noticed && (
        <span className="absolute -top-9 right-0 whitespace-nowrap rounded bg-ink-900 px-2.5 py-1.5 text-xs text-white shadow dark:bg-ink-100 dark:text-ink-900">
          정식 오픈 준비 중이에요
        </span>
      )}
    </div>
  );
}
