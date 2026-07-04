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
  { name: "세종", lat: 36.48, lon: 127.289 },
  { name: "청주", lat: 36.6424, lon: 127.489 },
  { name: "천안", lat: 36.8151, lon: 127.1139 },
  { name: "대구", lat: 35.8714, lon: 128.6014 },
  { name: "포항", lat: 36.019, lon: 129.3435 },
  { name: "안동", lat: 36.5684, lon: 128.7294 },
  { name: "부산", lat: 35.1796, lon: 129.0756 },
  { name: "울산", lat: 35.5384, lon: 129.3114 },
  { name: "창원", lat: 35.2281, lon: 128.6811 },
  { name: "광주", lat: 35.1595, lon: 126.8526 },
  { name: "전주", lat: 35.8242, lon: 127.148 },
  { name: "여수", lat: 34.7604, lon: 127.6622 },
  { name: "제주", lat: 33.4996, lon: 126.5312 },
];

export const DEFAULT_CITY = "서울";
export const STORAGE_KEY = "modoo-weather-city";
export const CHANGE_EVENT = "modoo-weather-city-change";

/** 좌표에서 가장 가까운 지원 도시 (국내 스케일이라 위경도 유클리드 근사로 충분) */
export function nearestCity(lat: number, lon: number): City {
  let best = CITIES[0];
  let bestD = Infinity;
  for (const c of CITIES) {
    // 경도 1도는 위도 1도보다 짧으므로(한국 위도 기준 cos≈0.8) 보정
    const dLat = c.lat - lat;
    const dLon = (c.lon - lon) * 0.8;
    const d = dLat * dLat + dLon * dLon;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/** 브라우저 GPS로 현재 위치를 얻어 가장 가까운 도시를 반환. 거부/실패/미지원 시 null. */
export function locateCity(): Promise<City | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(nearestCity(pos.coords.latitude, pos.coords.longitude)),
      () => resolve(null),
      { timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

/** 날씨 상태별 아이콘 색 — 기능색(무채색 원칙 예외: 속보 레드와 무관한 정보 전달용) */
export const WX_COLOR: Record<WxCondition, string> = {
  clear: "text-amber-500 dark:text-amber-400",
  rain: "text-blue-500 dark:text-blue-400",
  snow: "text-sky-400 dark:text-sky-300",
  fog: "text-ink-400 dark:text-ink-300",
};

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

/** WMO weather code → 한국어 짧은 날씨 라벨(표시용) */
export function codeToLabel(code: number): string {
  const m: Record<number, string> = {
    0: "맑음", 1: "대체로 맑음", 2: "구름 많음", 3: "흐림",
    45: "안개", 48: "안개",
    51: "이슬비", 53: "이슬비", 55: "이슬비", 56: "어는 이슬비", 57: "어는 이슬비",
    61: "비", 63: "비", 65: "강한 비", 66: "어는 비", 67: "어는 비",
    71: "눈", 73: "눈", 75: "많은 눈", 77: "싸락눈",
    80: "소나기", 81: "소나기", 82: "강한 소나기", 85: "눈 소나기", 86: "눈 소나기",
    95: "뇌우", 96: "뇌우", 99: "뇌우",
  };
  return m[code] ?? "흐림";
}

export interface Weather {
  condition: WxCondition; // 배경 모션용
  code: number;
  label: string; // 표시용 한국어
  temperature: number | null; // ℃
}

// 같은 지역 중복 조회 방지(10분 캐시) — 배경/표시 컴포넌트가 각자 호출해도 1회만 네트워크
const _cache = new Map<string, { at: number; data: Weather }>();
const TTL = 10 * 60 * 1000;
const CLEAR: Weather = { condition: "clear", code: 0, label: "맑음", temperature: null };

/** 현재 날씨(분류+온도+라벨)를 가져온다. 실패 시 맑음/온도 null. */
export async function fetchWeather(city: City): Promise<Weather> {
  const key = `${city.lat},${city.lon}`;
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=weather_code,temperature_2m`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return CLEAR;
    const json = await res.json();
    const code = json?.current?.weather_code;
    const temp = json?.current?.temperature_2m;
    if (typeof code !== "number") return CLEAR;
    const data: Weather = {
      condition: codeToCondition(code),
      code,
      label: codeToLabel(code),
      temperature: typeof temp === "number" ? Math.round(temp) : null,
    };
    _cache.set(key, { at: Date.now(), data });
    return data;
  } catch {
    return CLEAR;
  }
}
