"use client";

import { useEffect } from "react";

const CLIENT = "ca-pub-1741876528103024";
const SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;

/**
 * Google AdSense 자동광고 로더 — **LCP 이후 지연 주입**.
 *
 * 이전엔 <head>에 async 스크립트로 두었는데, async여도 브라우저는 파서가 head를 읽는 즉시
 * 요청을 시작한다. 그래서 히어로 이미지(LCP)·폰트와 같은 시점에 대역폭·커넥션을 다투고,
 * 실행 즉시 자동광고가 DOM에 끼어들며 본문을 밀어 CLS를 일으켰다.
 *
 * 여기서는 load 이벤트(=LCP·주요 리소스 완료) 이후 유휴 시점에만 스크립트를 넣는다.
 *  - LCP 대역폭 경합: 제거(광고 요청이 LCP 뒤로 밀림)
 *  - preconnect도 이 시점에 함께 붙인다(미리 붙이면 쓰지도 않을 커넥션을 조기 점유)
 *
 * ⚠️ CLS 관련 한계(정직하게 기록): 자동광고는 삽입 위치·크기를 구글이 런타임에 정하므로
 *    빌드 타임에 슬롯 min-height를 예약하는 것이 원리상 불가능하다(예약해도 광고가 안 붙으면
 *    빈 공백만 남아 되레 손해). 완전한 CLS 차단은 자동광고를 끄고 고정 크기 수동 슬롯(<ins>)으로
 *    전환해야 가능하며, 이는 수익 설정 변경이라 별도 승인 사안으로 남긴다.
 */
export function AdSenseLoader() {
  useEffect(() => {
    let done = false;
    const inject = () => {
      if (done || document.querySelector(`script[src^="${SRC.split("?")[0]}"]`)) return;
      done = true;

      const pre = document.createElement("link");
      pre.rel = "preconnect";
      pre.href = "https://pagead2.googlesyndication.com";
      pre.crossOrigin = "anonymous";
      document.head.appendChild(pre);

      const s = document.createElement("script");
      s.src = SRC;
      s.async = true;
      s.crossOrigin = "anonymous";
      document.head.appendChild(s);
    };

    // load 이후 유휴 시점(브라우저 미지원 시 2초 폴백)에 주입
    const schedule = () => {
      const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void })
        .requestIdleCallback;
      if (typeof ric === "function") ric(inject, { timeout: 3000 });
      else setTimeout(inject, 2000);
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
