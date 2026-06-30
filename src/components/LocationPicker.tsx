"use client";

import { useEffect, useState } from "react";
import { CITIES, CHANGE_EVENT, DEFAULT_CITY, STORAGE_KEY } from "@/lib/weather";
import { cn } from "@/lib/utils";

/**
 * 지역 선택기 — 헤더 로그인 옆. 선택 시 localStorage 저장 + 이벤트 발행 →
 * WeatherBackground가 해당 지역 날씨로 배경 모션을 갱신.
 */
export function LocationPicker({ className }: { className?: string }) {
  const [city, setCity] = useState(DEFAULT_CITY);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && CITIES.some((c) => c.name === saved)) setCity(saved);
    } catch {
      /* ignore */
    }
  }, []);

  function change(next: string) {
    setCity(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }

  return (
    <label
      className={cn(
        "relative inline-flex items-center gap-1 rounded-full border border-ink-200 py-1.5 pl-2.5 pr-1.5 text-sm text-ink-700 hover:border-ink-400 dark:border-ink-700 dark:text-ink-200",
        className,
      )}
      title="지역 설정 (배경 날씨)"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden>
        <path
          d="M12 21s7-5.686 7-11a7 7 0 10-14 0c0 5.314 7 11 7 11z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      <span className="sr-only">지역 선택</span>
      <select
        value={city}
        onChange={(e) => change(e.target.value)}
        className="cursor-pointer appearance-none bg-transparent pr-4 font-medium outline-none"
        aria-label="배경 날씨 지역 선택"
      >
        {CITIES.map((c) => (
          <option key={c.name} value={c.name} className="text-ink-900">
            {c.name}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-ink-400"
        fill="none"
        aria-hidden
      >
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    </label>
  );
}
