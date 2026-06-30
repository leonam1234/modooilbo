// 날씨 — Open-Meteo(무료·키 불필요·CORS 허용)로 현재 날씨를 클라이언트에서 조회.

export type WxCondition = "clear" | "fog" | "rain" | "snow";

export interface City {
  name: string;
  lat: number;
  lon: number;
}

export const CITIES: City[] = [
  { name: "서울", lat: 37.5665, lon: 126.978 },
  { name: "인천", lat: 37.4563, lon: 126.7052 },
  { name: "수원", lat: 37.2636, lon: 127.0286 },
  { name: "춘천", lat: 37.8813, lon: 127.7298 },
  { name: "강릉", lat: 37.7519, lon: 128.8761 },
  { name: "대전", lat: 36.3504, lon: 127.3845 },
  { name: "청주", lat: 36.6424, lon: 127.489 },
  { name: "대구", lat: 35.8714, lon: 128.6014 },
  { name: "부산", lat: 35.1796, lon: 129.0756 },
  { name: "울산", lat: 35.5384, lon: 129.3114 },
  { name: "광주", lat: 35.1595, lon: 126.8526 },
  { name: "전주", lat: 35.8242, lon: 127.148 },
  { name: "제주", lat: 33.4996, lon: 126.5312 },
];

export const DEFAULT_CITY = "서울";
export const STORAGE_KEY = "modoo-weather-city";
export const CHANGE_EVENT = "modoo-weather-city-change";

/** WMO weather code → 배경 모션 분류 */
export function codeToCondition(code: number): WxCondition {
  if (code === 45 || code === 48) return "fog"; // 안개
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow"; // 눈
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99))
    return "rain"; // 이슬비·비·소나기·뇌우
  if (code === 2 || code === 3) return "fog"; // 구름많음·흐림 → 옅은 안개 느낌
  return "clear"; // 맑음·약간 구름 → 효과 없음
}

export function getSavedCity(): City {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const found = CITIES.find((c) => c.name === saved);
      if (found) return found;
    } catch {
      /* ignore */
    }
  }
  return CITIES.find((c) => c.name === DEFAULT_CITY) ?? CITIES[0];
}

/** 현재 날씨 분류를 가져온다. 실패 시 'clear'. */
export async function fetchCondition(city: City): Promise<WxCondition> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=weather_code`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return "clear";
    const json = await res.json();
    const code = json?.current?.weather_code;
    return typeof code === "number" ? codeToCondition(code) : "clear";
  } catch {
    return "clear";
  }
}
