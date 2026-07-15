"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CITIES,
  CHANGE_EVENT,
  DEFAULT_CITY,
  STORAGE_KEY,
  WX_COLOR,
  fetchWeather,
  locateCity,
  type Weather,
  type WxCondition,
} from "@/lib/weather";
import { cn } from "@/lib/utils";

export function WxIcon({ cond, className }: { cond: WxCondition; className?: string }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const };
  if (cond === "rain")
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path d="M7 15a4 4 0 010-8 5 5 0 019.6-1.3A3.5 3.5 0 1117 15H7z" {...s} />
        <path d="M9 18l-1 2M13 18l-1 2M17 18l-1 2" {...s} />
      </svg>
    );
  if (cond === "snow")
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path d="M7 14a4 4 0 010-8 5 5 0 019.6-1.3A3.5 3.5 0 1117 14H7z" {...s} />
        <circle cx="9" cy="19" r="0.8" fill="currentColor" />
        <circle cx="13" cy="20" r="0.8" fill="currentColor" />
        <circle cx="16" cy="18.5" r="0.8" fill="currentColor" />
      </svg>
    );
  if (cond === "fog")
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path d="M7 13a4 4 0 010-8 5 5 0 019.6-1.3A3.5 3.5 0 1117 13H7z" {...s} />
        <path d="M5 17h14M7 20h12" {...s} />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="4" {...s} />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" {...s} />
    </svg>
  );
}

/**
 * 지역 선택기 + 현재 날씨/온도 — 헤더 로그인 옆.
 * 선택 시 localStorage 저장 + 이벤트 발행(배경 모션 갱신). 동시에 해당 지역 날씨를 표시.
 */
export function LocationPicker({ className }: { className?: string }) {
  const [city, setCity] = useState(DEFAULT_CITY);
  const [wx, setWx] = useState<Weather | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let saved = DEFAULT_CITY;
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v && CITIES.some((c) => c.name === v)) saved = v;
    } catch {
      /* ignore */
    }
    setCity(saved);
  }, []);

  useEffect(() => {
    let alive = true;
    const target = CITIES.find((c) => c.name === city) ?? CITIES[0];
    fetchWeather(target).then((w) => alive && setWx(w));
    return () => {
      alive = false;
    };
  }, [city]);

  function change(next: string) {
    setCity(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }

  async function useMyLocation() {
    if (locating) return;
    setLocating(true);
    const found = await locateCity();
    setLocating(false);
    if (found) change(found.name);
    else alert("위치 정보를 가져오지 못했습니다. 브라우저 위치 권한을 확인해 주세요.");
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-ink-200 py-1.5 pl-2.5 pr-2 text-sm text-ink-700 hover:border-ink-400 dark:border-ink-700 dark:text-ink-200",
        className,
      )}
      title={wx ? `${city} · ${wx.label}${wx.temperature !== null ? ` ${wx.temperature}°` : ""}` : "지역 설정"}
    >
      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        title="내 위치 날씨 보기 (GPS)"
        aria-label="내 위치로 날씨 지역 설정"
        className={cn(
          // 히트영역 확보(-m으로 시각 크기 유지) — 20px 터치 타깃 지적 대응
          "-m-1.5 shrink-0 rounded-full p-2 transition-colors hover:text-signal-600 dark:hover:text-signal-400 dark:hover:text-white",
          locating && "animate-pulse text-signal-600 dark:text-signal-400 dark:text-white",
        )}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
          <path d="M12 21s7-5.686 7-11a7 7 0 10-14 0c0 5.314 7 11 7 11z" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>
      <span className="relative hidden items-center sm:inline-flex">
        <select
          value={city}
          onChange={(e) => change(e.target.value)}
          className="cursor-pointer appearance-none bg-transparent pr-3.5 font-medium outline-none"
          aria-label="배경 날씨 지역 선택"
        >
          {CITIES.map((c) => (
            <option key={c.name} value={c.name} className="text-ink-900">
              {c.name}
            </option>
          ))}
        </select>
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-0 h-3 w-3 text-ink-500 dark:text-ink-400" fill="none" aria-hidden>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" />
        </svg>
      </span>
      <Link
        href="/weather"
        title={wx ? "주간예보 보기" : "날씨 정보를 불러오지 못했습니다 — 주간예보 보기"}
        className="flex shrink-0 items-center gap-1 whitespace-nowrap border-l border-ink-200 pl-2 text-ink-500 transition-colors hover:text-signal-600 dark:hover:text-signal-400 dark:border-ink-700 dark:text-ink-300"
      >
        {wx ? (
          <>
            <WxIcon cond={wx.condition} className={cn("h-4 w-4", WX_COLOR[wx.condition])} />
            {wx.temperature !== null && (
              <span className="whitespace-nowrap tabular-nums font-medium">{wx.temperature}°</span>
            )}
          </>
        ) : (
          // 로드 전/실패 — 가짜 '맑음' 아이콘 대신 중립 표기
          <span aria-label="날씨 정보 없음" className="font-medium text-ink-500 dark:text-ink-400">
            —°
          </span>
        )}
      </Link>
    </span>
  );
}
