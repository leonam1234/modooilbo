"use client";

import { useEffect, useState } from "react";
import {
  CHANGE_EVENT,
  FX_EVENT,
  fetchWeather,
  getSavedCity,
  isFxDisabled,
  type WxCondition,
} from "@/lib/weather";
import { WeatherCanvas } from "./WeatherCanvas";

/**
 * 날씨 배경 모션 — 콘텐츠 뒤(z-0)에 무채색·아주 옅게.
 * 클라이언트에서 Open-Meteo 조회 → 비/안개/눈일 때만 옅은 모션. 맑으면 아무것도 안 그림.
 */
export function WeatherBackground() {
  const [cond, setCond] = useState<WxCondition>("clear");
  const [fxOff, setFxOff] = useState(false);

  // 사용자 설정(날씨 페이지의 '배경 연출' 토글) — 변경 즉시 반영
  useEffect(() => {
    setFxOff(isFxDisabled());
    const onFx = () => setFxOff(isFxDisabled());
    window.addEventListener(FX_EVENT, onFx);
    return () => window.removeEventListener(FX_EVENT, onFx);
  }, []);

  useEffect(() => {
    let alive = true;
    // 테스트 모드: ?wx=rain|snow|star(clear 별칭) 강제 미리보기. fog는 현재 미사용(렌더 안 함).
    const override = new URLSearchParams(window.location.search).get("wx");
    if (override && ["clear", "fog", "rain", "snow", "star"].includes(override)) {
      setCond(override === "star" ? "clear" : (override as WxCondition));
      return;
    }
    const load = async () => {
      const w = await fetchWeather(getSavedCity());
      // 실패(null) 시 마지막 상태 유지 — 실패를 '맑음'으로 오인해 연출을 껐다 켰다 하지 않게
      if (alive && w) setCond(w.condition);
    };
    // 초기 호출만 idle로 지연(critical 렌더 양보)
    const supportsIdle =
      typeof window.requestIdleCallback === "function" &&
      typeof window.cancelIdleCallback === "function";
    const idleId = supportsIdle
      ? window.requestIdleCallback(() => load(), { timeout: 3000 })
      : window.setTimeout(load, 1200);
    // 지역 변경 시 재조회
    const onChange = () => load();
    window.addEventListener(CHANGE_EVENT, onChange);
    // 15분마다 갱신
    const t = setInterval(load, 15 * 60 * 1000);
    return () => {
      alive = false;
      if (supportsIdle) window.cancelIdleCallback(idleId as number);
      else window.clearTimeout(idleId as number);
      window.removeEventListener(CHANGE_EVENT, onChange);
      clearInterval(t);
    };
  }, []);

  if (fxOff || cond === "fog") return null;
  // 맑음 = 다크 모드에서만 은은한 별(캔버스 내부에서 라이트면 미표시)
  return <WeatherCanvas kind={cond === "clear" ? "star" : cond} />;
}
