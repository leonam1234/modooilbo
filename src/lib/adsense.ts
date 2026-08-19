/**
 * Google AdSense — 클라이언트 ID·슬롯 ID·스크립트 로더의 **단일 정의**.
 *
 * 운영 전제(대시보드 설정, 2026-07-15):
 *  - **자동광고(자동 최적화·자동 광고) OFF**. 광고는 이 코드가 심는 수동 슬롯(<ins>)에만 나온다.
 *  - 광고 단위 2개(수동): 홈 수평형 / 기사 사각형. 각각 사이트에 **1곳씩만** 배치한다.
 *
 * ⚠️ 자동광고를 껐어도 `adsbygoogle.js` 스크립트는 **계속 필요**하다 —
 *    수동 <ins>를 실제 광고로 렌더하는 주체가 이 스크립트다(제거 금지).
 */

export const ADSENSE_CLIENT = "ca-pub-1741876528103024";

/** 대시보드에서 생성한 수동 광고 단위. 배치는 AdSlot의 placement와 1:1. */
export const AD_SLOTS = {
  /** 홈 — 기업데이터 섹션 ↔ 종합뉴스 섹션 사이(수평형·반응형 단위) */
  home: "1572115858",
  /** 기사 — 본문 중간(사각형·반응형 단위) */
  article: "4632439178",
} as const;

export type AdPlacement = keyof typeof AD_SLOTS;

const SCRIPT_ORIGIN = "https://pagead2.googlesyndication.com";
const SCRIPT_SRC = `${SCRIPT_ORIGIN}/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;

type Phase = "idle" | "loading" | "ready" | "failed";

let phase: Phase = "idle";
let waiters: Array<(ok: boolean) => void> = [];

function settle(ok: boolean) {
  phase = ok ? "ready" : "failed";
  const pending = waiters;
  waiters = [];
  for (const w of pending) w(ok);
}

/**
 * adsbygoogle.js 주입 — **멱등**(모듈 상태로 중복 주입 차단).
 * 호출 시점은 AdSenseLoader가 정한다(LCP 이후 유휴). preconnect도 이때 함께 붙인다.
 */
export function loadAdSenseScript(): void {
  if (phase !== "idle") return;
  phase = "loading";

  // 2026-08-19부터 스크립트 태그는 layout <head>에 SSR로 박혀 있다(심사 봇이 코드를
  // 못 보던 문제의 해결책 — layout.tsx 주석 참조). 같은 스크립트를 두 번 주입하면
  // 구글이 콘솔 에러를 내므로, 기존 태그가 있으면 **그 태그의 로드 상태에 편승**한다.
  const existing = document.querySelector<HTMLScriptElement>(
    `script[src^="${SCRIPT_ORIGIN}/pagead/js/adsbygoogle.js"]`,
  );
  if (existing) {
    // 이미 로드 완료됐는지: adsbygoogle.js는 로드 시 window.adsbygoogle.loaded = true 를 세운다.
    const w = window as unknown as { adsbygoogle?: { loaded?: boolean } };
    if (w.adsbygoogle?.loaded) {
      settle(true);
      return;
    }
    existing.addEventListener("load", () => settle(true), { once: true });
    existing.addEventListener("error", () => settle(false), { once: true });
    // load 이벤트를 이미 놓친 경우(리스너 부착 전에 로드 완료) 대비 폴백 폴링 — 짧게 몇 번만.
    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      if (w.adsbygoogle?.loaded) {
        clearInterval(t);
        settle(true);
      } else if (tries >= 20 || phase !== "loading") {
        clearInterval(t); // 4초 내 미로드면 이벤트 리스너에 맡긴다(차단기면 error가 온다)
      }
    }, 200);
    return;
  }

  // 폴백: head 태그가 없는 예외 상황(구버전 캐시 HTML 등)에만 직접 주입한다.
  const pre = document.createElement("link");
  pre.rel = "preconnect";
  pre.href = SCRIPT_ORIGIN;
  pre.crossOrigin = "anonymous";
  document.head.appendChild(pre);

  const s = document.createElement("script");
  s.src = SCRIPT_SRC;
  s.async = true;
  s.crossOrigin = "anonymous";
  s.addEventListener("load", () => settle(true), { once: true });
  s.addEventListener("error", () => settle(false), { once: true });
  document.head.appendChild(s);
}

/**
 * 스크립트 로드가 **확정된 뒤** 콜백(ok=false = 로드 실패: 차단기·네트워크 오류).
 * 이미 확정됐으면 즉시 동기 호출. 반환값은 구독 해제 함수.
 *
 * ★ 슬롯의 `adsbygoogle.push({})`는 반드시 이 콜백 안에서 실행한다.
 *   `window.adsbygoogle`는 스크립트 전에는 그냥 배열이라 push가 조용히 쌓이기만 하고,
 *   스크립트가 끝내 안 오면(차단기 등) **성공인지 실패인지 구분할 수 없다**
 *   → 미충전 처리(빈 자리 접기)를 못 한다. 로드 확정 후 push하면 순서와 실패 판정이 함께 보장된다.
 */
export function whenAdSenseSettled(cb: (ok: boolean) => void): () => void {
  if (phase === "ready") {
    cb(true);
    return () => {};
  }
  if (phase === "failed") {
    cb(false);
    return () => {};
  }
  waiters.push(cb);
  return () => {
    waiters = waiters.filter((w) => w !== cb);
  };
}
