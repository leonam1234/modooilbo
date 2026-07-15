"use client";

import { useEffect } from "react";
import { loadAdSenseScript } from "@/lib/adsense";

/**
 * Google AdSense **스크립트 로더** — 수동 슬롯(<ins>)을 렌더하는 adsbygoogle.js를
 * **LCP 이후 유휴 시점에** 주입한다. 루트 레이아웃에 1개만 둔다.
 *
 * 역할 전환(2026-07-15): 대시보드에서 **자동광고(자동 최적화·자동 광고)를 껐다**.
 * 이제 이 컴포넌트는 "자동광고 로더"가 아니라 **수동 슬롯 렌더용 스크립트 로더**다.
 *  - ⚠️ 자동광고를 꺼도 스크립트 자체는 계속 필요하다 — 수동 <ins>를 실제 광고로 그리는 주체가 이 스크립트다.
 *  - 광고 슬롯이 없는 페이지(회사소개 등)에도 그대로 둔다: AdSense의 사이트 확인·크롤링 경로이고,
 *    자동광고가 꺼져 있어 슬롯이 없는 페이지에서는 아무것도 그리지 않는다(부작용 없음).
 *  - 실제 push는 각 슬롯(AdSlot)이 **스크립트 로드 확정 후에** 한다 → lib/adsense.ts `whenAdSenseSettled`.
 *
 * 지연 주입 사유(2차 성능 점검에서 head → 지연으로 옮긴 근거 그대로 유지):
 *   head의 async 스크립트도 파서가 읽는 즉시 요청이 나가 히어로 이미지(LCP)·폰트와 대역폭·커넥션을
 *   다툰다. load 이벤트(=LCP·주요 리소스 완료) 이후 유휴 시점에만 넣어 광고 요청을 LCP 뒤로 민다.
 *   preconnect도 이 시점에 함께 붙는다(미리 붙이면 쓰지도 않을 커넥션을 조기 점유).
 *
 * CLS: 자동광고 시절엔 삽입 위치·크기를 구글이 런타임에 정해 자리 예약이 원리상 불가능했다.
 *   자동광고를 끈 지금은 **고정 크기 수동 슬롯**이라 스크립트가 오기 전부터 자리가 잡혀 있다 → AdSlot.tsx.
 */
export function AdSenseLoader() {
  useEffect(() => {
    // load 이후 유휴 시점(브라우저 미지원 시 2초 폴백)에 주입. loadAdSenseScript는 멱등.
    const schedule = () => {
      const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void })
        .requestIdleCallback;
      if (typeof ric === "function") ric(loadAdSenseScript, { timeout: 3000 });
      else setTimeout(loadAdSenseScript, 2000);
    };

    if (document.readyState === "complete") {
      schedule();
      return;
    }
    window.addEventListener("load", schedule, { once: true });
    return () => window.removeEventListener("load", schedule);
  }, []);

  return null;
}
