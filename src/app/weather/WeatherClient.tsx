"use client";

import { useEffect, useState } from "react";
import {
  CITIES,
  CHANGE_EVENT,
  STORAGE_KEY,
  WX_COLOR,
  getSavedCity,
  locateCity,
  codeToCondition,
  codeToLabel,
} from "@/lib/weather";
import { WxIcon } from "@/components/LocationPicker";

type Current = {
  temp: number | null;
  feels: number | null;
  humidity: number | null;
  wind: number | null;
  code: number;
};
type Day = { date: string; code: number; max: number; min: number; rain: number | null };

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

function dayLabel(dateStr: string, idx: number): string {
  if (idx === 0) return "오늘";
  if (idx === 1) return "내일";
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  return `${DOW[d.getDay()]}요일`;
}

/** 날씨 상세 — 현재 + 주간(7일) 예보. open-meteo 무료·무키, 브라우저 직접 호출. */
export function WeatherClient() {
  const [cityName, setCityName] = useState<string | null>(null);
  const [current, setCurrent] = useState<Current | null>(null);
  const [days, setDays] = useState<Day[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    setCityName(getSavedCity().name);
  }, []);

  useEffect(() => {
    if (!cityName) return;
    const city = CITIES.find((c) => c.name === cityName) ?? CITIES[0];
    let alive = true;
    setFailed(false);
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}` +
      `&current=weather_code,temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&timezone=Asia%2FSeoul&forecast_days=7`;
    // 첫 호출이 간헐적으로 늦거나 실패하는 케이스 관측 → 2회까지 재시도
    const load = async (): Promise<any> => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (r.ok) return await r.json();
        } catch {
          /* 재시도 */
        }
        if (attempt < 2) await new Promise((res) => setTimeout(res, 1500));
      }
      throw new Error("weather-fetch-failed");
    };
    load()
      .then((j) => {
        if (!alive) return;
        const c = j?.current;
        setCurrent({
          temp: typeof c?.temperature_2m === "number" ? Math.round(c.temperature_2m) : null,
          feels: typeof c?.apparent_temperature === "number" ? Math.round(c.apparent_temperature) : null,
          humidity: typeof c?.relative_humidity_2m === "number" ? Math.round(c.relative_humidity_2m) : null,
          wind: typeof c?.wind_speed_10m === "number" ? Math.round(c.wind_speed_10m) : null,
          code: typeof c?.weather_code === "number" ? c.weather_code : 0,
        });
        const d = j?.daily;
        if (d?.time?.length) {
          setDays(
            d.time.map((date: string, i: number) => ({
              date,
              code: d.weather_code?.[i] ?? 0,
              max: Math.round(d.temperature_2m_max?.[i] ?? 0),
              min: Math.round(d.temperature_2m_min?.[i] ?? 0),
              rain: typeof d.precipitation_probability_max?.[i] === "number" ? d.precipitation_probability_max[i] : null,
            })),
          );
        }
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [cityName]);

  function changeCity(next: string) {
    setCityName(next);
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
    if (found) changeCity(found.name);
    else alert("위치 정보를 가져오지 못했습니다. 브라우저 위치 권한을 확인해 주세요.");
  }

  if (cityName === null) return <p className="py-16 text-center text-ink-400">불러오는 중…</p>;

  return (
    <div className="space-y-8">
      {/* 현재 날씨 카드 */}
      <div className="rounded-xl border border-ink-200 bg-white/80 p-6 backdrop-blur dark:border-ink-800 dark:bg-ink-900/80">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-sm text-ink-500 dark:text-ink-300">
            지역
            <select
              value={cityName}
              onChange={(e) => changeCity(e.target.value)}
              className="cursor-pointer rounded-md border border-ink-200 bg-white px-3 py-1.5 font-medium text-ink-900 outline-none dark:border-ink-700 dark:bg-ink-900 dark:text-white"
            >
              {CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className={`inline-flex items-center gap-1.5 rounded-md border border-ink-200 px-3 py-1.5 font-medium text-ink-700 transition-colors hover:border-ink-400 dark:border-ink-700 dark:text-ink-200 dark:hover:border-ink-500 ${locating ? "animate-pulse" : ""}`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                <path d="M12 21s7-5.686 7-11a7 7 0 10-14 0c0 5.314 7 11 7 11z" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              {locating ? "위치 확인 중…" : "내 위치"}
            </button>
          </label>
          <span className="text-xs text-ink-400">자료: Open-Meteo</span>
        </div>

        {failed ? (
          <p className="mt-6 text-sm text-ink-500 dark:text-ink-300">날씨 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
        ) : current === null ? (
          <p className="mt-6 text-sm text-ink-400">불러오는 중…</p>
        ) : (
          <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-4">
              <WxIcon
                cond={codeToCondition(current.code)}
                className={`h-14 w-14 ${WX_COLOR[codeToCondition(current.code)]}`}
              />
              <div>
                <p className="font-headline text-5xl font-extrabold tabular-nums text-ink-900 dark:text-white">
                  {current.temp !== null ? `${current.temp}°` : "—"}
                </p>
                <p className="mt-1 text-sm font-medium text-ink-500 dark:text-ink-300">{codeToLabel(current.code)}</p>
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-x-8 gap-y-1 text-sm">
              <dt className="text-ink-400">체감</dt>
              <dt className="text-ink-400">습도</dt>
              <dt className="text-ink-400">바람</dt>
              <dd className="font-semibold tabular-nums text-ink-800 dark:text-ink-100">
                {current.feels !== null ? `${current.feels}°` : "—"}
              </dd>
              <dd className="font-semibold tabular-nums text-ink-800 dark:text-ink-100">
                {current.humidity !== null ? `${current.humidity}%` : "—"}
              </dd>
              <dd className="font-semibold tabular-nums text-ink-800 dark:text-ink-100">
                {current.wind !== null ? `${current.wind}km/h` : "—"}
              </dd>
            </dl>
          </div>
        )}
      </div>

      {/* 주간 예보 */}
      {days && days.length > 0 && (
        <section aria-label="주간 예보">
          <h2 className="mb-4 border-b-2 border-ink-900 pb-2 font-headline text-xl font-extrabold text-ink-900 dark:border-ink-100 dark:text-white">
            주간 예보
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {days.map((d, i) => (
              <div
                key={d.date}
                className={`min-w-[6.2rem] flex-1 rounded-xl border p-4 text-center ${
                  i === 0
                    ? "border-ink-900 bg-ink-50 dark:border-white dark:bg-ink-900"
                    : "border-ink-200 dark:border-ink-800"
                }`}
              >
                <p className="text-xs font-semibold text-ink-500 dark:text-ink-300">{dayLabel(d.date, i)}</p>
                <p className="mt-0.5 text-[11px] tabular-nums text-ink-400">{d.date.slice(5).replace("-", ".")}</p>
                <WxIcon
                  cond={codeToCondition(d.code)}
                  className={`mx-auto mt-3 h-8 w-8 ${WX_COLOR[codeToCondition(d.code)]}`}
                />
                <p className="mt-1 text-[11px] text-ink-400">{codeToLabel(d.code)}</p>
                <p className="mt-2 text-sm font-bold tabular-nums text-orange-600 dark:text-orange-400">
                  {d.max}° <span className="font-normal text-blue-500 dark:text-blue-400">/ {d.min}°</span>
                </p>
                {d.rain !== null && d.rain > 0 && (
                  <p className="mt-1 text-[11px] font-medium tabular-nums text-blue-500 dark:text-blue-400">
                    강수 {d.rain}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
