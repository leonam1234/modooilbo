"use client";

import { useEffect, useState } from "react";
import { CHANGE_EVENT, fetchWeather, getSavedCity, type WxCondition } from "@/lib/weather";
import { WeatherCanvas } from "./WeatherCanvas";

/**
 * 날씨 배경 모션 — 콘텐츠 뒤(z-0)에 무채색·아주 옅게.
 * 클라이언트에서 Open-Meteo 조회 → 비/안개/눈일 때만 옅은 모션. 맑으면 아무것도 안 그림.
 */
export function WeatherBackground() {
  const [cond, setCond] = useState<WxCondition>("clear");

  useEffect(() => {
    let alive = true;
    // 테스트 모드: ?wx=rain|fog|snow|clear 로 실제 날씨와 무관하게 강제 미리보기
    const override = new URLSearchParams(window.location.search).get("wx");
    if (override && ["clear", "fog", "rain", "snow"].includes(override)) {
      setCond(override as WxCondition);
      return;
    }
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

  // 비·눈 = 캔버스(실제 입자), 안개 = CSS 블러
  if (cond === "rain" || cond === "snow") return <WeatherCanvas kind={cond} />;
  return (
    <div aria-hidden className="wx-layer text-ink-900 dark:text-white">
      <div className="wx-fog" />
    </div>
  );
}
