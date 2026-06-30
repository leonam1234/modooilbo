"use client";

import { useEffect, useState } from "react";
import { CHANGE_EVENT, fetchWeather, getSavedCity, type WxCondition } from "@/lib/weather";

/**
 * 날씨 배경 모션 — 콘텐츠 뒤(z-0)에 무채색·아주 옅게.
 * 클라이언트에서 Open-Meteo 조회 → 비/안개/눈일 때만 옅은 모션. 맑으면 아무것도 안 그림.
 */
export function WeatherBackground() {
  const [cond, setCond] = useState<WxCondition>("clear");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const w = await fetchWeather(getSavedCity());
      if (alive) setCond(w.condition);
    };
    load();
    // 지역 변경 시 재조회
    const onChange = () => load();
    window.addEventListener(CHANGE_EVENT, onChange);
    // 15분마다 갱신
    const t = setInterval(load, 15 * 60 * 1000);
    return () => {
      alive = false;
      window.removeEventListener(CHANGE_EVENT, onChange);
      clearInterval(t);
    };
  }, []);

  if (cond === "clear") return null;

  return (
    <div aria-hidden className="wx-layer text-ink-900 dark:text-white">
      {cond === "rain" && <div className="wx-rain" />}
      {cond === "fog" && <div className="wx-fog" />}
      {cond === "snow" && <div className="wx-snow" />}
    </div>
  );
}
