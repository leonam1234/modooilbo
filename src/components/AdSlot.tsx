"use client";

import { useEffect, useRef, useState } from "react";
import { ADSENSE_CLIENT, AD_SLOTS, type AdPlacement, whenAdSenseSettled } from "@/lib/adsense";
import { cn } from "@/lib/utils";

/**
 * AdSense **수동 광고 슬롯**(자동광고 OFF 전제) — 사이트에 홈 1개 · 기사 1개만 배치한다.
 *
 * ── 이 컴포넌트의 존재 이유 = CLS 차단 ─────────────────────────────────────────
 * 자동광고는 크기가 런타임에 정해져 자리 예약이 원리상 불가능했다(2차 점검 기록).
 * 여기서는 **고정 크기(fixed-size) 모드**를 쓴다:
 *   - `style="display:inline-block"` + CSS로 **width/height를 못 박고**,
 *     `data-ad-format` / `data-full-width-responsive`는 **아예 붙이지 않는다**.
 *     (구글 문서의 "미디어쿼리로 반응형 광고 코드 직접 지정" 패턴과 동일)
 *   - 그 결과 <ins>는 스크립트가 오기 **전부터 CSS만으로 제 크기를 차지**한다
 *     → 예약 높이 = 실제 렌더 높이 → 광고가 들어와도 아무것도 밀리지 않는다(구조적으로 CLS 0).
 *
 * ⚠️ `data-full-width-responsive="true"`를 쓰지 않는 이유: 그 옵션은 모바일에서 광고를
 *    화면 전폭으로 키우고 높이를 런타임에 정해 예약 높이와 어긋난다(=CLS 재발). 폭은
 *    아래 SIZE로 고정하고 `max-w-full`로 컨테이너 밖으로 넘치지 않게만 막는다.
 *
 * ── 미충전(unfilled) 처리 트레이드오프 ────────────────────────────────────────
 * 광고가 안 붙으면 AdSense가 <ins>에 `data-ad-status="unfilled"`를 단다. 이때 그냥 접으면
 * (구글이 안내하는 방식) **접는 순간이 곧 레이아웃 이동**이라 CLS를 막으려고 만든 슬롯이
 * 스스로 CLS를 만든다. 그래서 **"뷰포트 아래로 완전히 벗어나 있을 때만 접는다"**:
 *   - 화면 밖(아래) 요소가 줄어드는 건 뷰포트 안 어떤 요소도 움직이지 않는다 → CLS 기여 0.
 *   - 슬롯이 화면에 보이는 중이면 접지 않고 자리를 유지한다(이동 없음, 잠깐 여백).
 *     스크롤로 다시 아래쪽 화면 밖이 되는 순간 접는다.
 *   - 상태가 끝내 안 정해지면(신규 단위 심사 중 등) 자리를 그대로 둔다 —
 *     ★ 채워질 수도 있는 슬롯을 display:none 하면 '보이지 않는 광고'가 되어 정책 위반이다.
 *       확정된 unfilled·로드 실패에만 접는다.
 *   - 그 '자리만 남는' 동안 **'광고' 라벨은 숨긴다**(→ 아무것도 없는 곳에 광고라고 알리지 않게).
 *     숨김은 `visibility`라 **레이아웃에 영향이 없다**(display로 지우면 그 순간이 이동이 된다).
 *     결과: 미충전·미확정 상태의 슬롯은 그냥 섹션 사이 여백처럼 보인다.
 *
 * 정리 — 상태별 동작:
 *   filled            → 광고 + '광고' 라벨 표시(예약 높이 그대로, 이동 0)
 *   unfilled·로드실패  → 화면 아래로 벗어난 순간 통째로 접음(보이는 중엔 자리 유지)
 *   상태 미확정        → 예약 높이만 남김(라벨 없음 = 여백처럼 보임). 나중에 채워질 수 있으므로 접지 않는다.
 */

/** 자리별 고정 크기(=예약 높이). 표준 IAB 규격만 사용(비표준 크기는 충전율이 낮다). */
const SIZE: Record<AdPlacement, string> = {
  // 홈(수평형): 모바일 대형 배너 320×100 → lg(1024↑, 컨테이너 내부폭 ≥960px)에서 리더보드 728×90.
  //  · 예약 높이: <1024 = 100px / ≥1024 = 90px
  //  · 640~1023 구간에 468×60을 끼우지 않았다 — 그 규격은 수요가 거의 없어 미충전만 늘린다.
  home: "w-[320px] h-[100px] lg:w-[728px] lg:h-[90px]",
  // 기사(사각형): 300×250 → md(768↑, 사이드바 등장 후 본문 칼럼 ≈408px)에서 336×280.
  //  · 예약 높이: <768 = 250px / ≥768 = 280px
  article: "w-[300px] h-[250px] md:w-[336px] md:h-[280px]",
};

export function AdSlot({ placement, className }: { placement: AdPlacement; className?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const insRef = useRef<HTMLModElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  /** 실제로 광고가 그려졌을 때만 '광고' 라벨을 보인다(레이아웃 불변 — visibility) */
  const [adVisible, setAdVisible] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    const ins = insRef.current;
    if (!box || !ins) return;

    let alive = true;
    let io: IntersectionObserver | null = null;
    let mo: MutationObserver | null = null;

    /** 뷰포트 '아래'로 완전히 벗어나 있을 때만 접는다 → 화면 안 요소가 안 움직임 = CLS 기여 0 */
    const collapseIfBelowViewport = () => {
      if (!alive) return false;
      if (box.getBoundingClientRect().top < window.innerHeight) return false;
      setCollapsed(true);
      return true;
    };

    const collapseWhenSafe = () => {
      if (collapseIfBelowViewport()) return;
      // 지금은 화면 안(또는 위쪽) → 접지 않고, 아래쪽 화면 밖이 되는 순간에만 접는다
      io = new IntersectionObserver(() => {
        if (collapseIfBelowViewport()) {
          io?.disconnect();
          io = null;
        }
      });
      io.observe(box);
    };

    // ★ push는 스크립트 로드가 확정된 뒤에만 (순서 보장 + 실패 판정)
    const unsubscribe = whenAdSenseSettled((ok) => {
      if (!alive) return;
      if (!ok) {
        collapseWhenSafe(); // 스크립트 로드 실패(차단기·네트워크) → 빈 상자를 남기지 않음
        return;
      }

      // 충전/미충전 감지 — AdSense가 <ins>에 data-ad-status="filled"|"unfilled"를 단다(구글 공식 신호).
      // ⚠️ "iframe이 생겼는가"로 판정하면 안 된다 — AdSense는 충전 여부를 정하기 **전에** 슬롯 크기의
      //    iframe부터 넣는다(실측 확인). 그걸 신호로 쓰면 빈 자리에 '광고' 라벨이 먼저 뜬다.
      const readStatus = () => {
        const status = ins.getAttribute("data-ad-status");
        if (status !== "filled" && status !== "unfilled") return;
        mo?.disconnect();
        mo = null;
        if (status === "unfilled") collapseWhenSafe();
        else setAdVisible(true);
      };
      mo = new MutationObserver(readStatus);
      mo.observe(ins, { attributes: true, attributeFilter: ["data-ad-status"] });
      readStatus(); // 붙이기 전에 이미 확정돼 있었던 경우(재마운트 등) 즉시 반영

      // 중복 push 방지(StrictMode 이중 effect·재마운트). 처리된 ins엔 data-adsbygoogle-status가 붙는다.
      if (ins.getAttribute("data-adsbygoogle-status")) return;
      try {
        const w = window as unknown as { adsbygoogle?: { push: (o: object) => void } };
        if (!w.adsbygoogle) w.adsbygoogle = [] as unknown as { push: (o: object) => void };
        w.adsbygoogle.push({});
      } catch {
        collapseWhenSafe();
      }
    });

    return () => {
      alive = false;
      unsubscribe();
      io?.disconnect();
      mo?.disconnect();
    };
  }, []);

  return (
    <div ref={boxRef} className={cn("no-print text-center leading-none", collapsed && "hidden", className)}>
      {/* 정책·독자 신뢰: 광고는 기사와 시각적으로 구분돼야 한다(뉴스 콘텐츠로 오인 금지).
          무채색 톤 + AA 대비 페어링(라이트 ink-500 4.91:1 / 다크 ink-400).
          invisible: 자리는 유지하고 표시만 감춘다 → 광고가 없을 땐 라벨도 없고, 켜질 때 이동도 없다. */}
      <p
        className={cn(
          "mb-1.5 text-[11px] font-medium leading-4 tracking-[0.2em] text-ink-500 dark:text-ink-400",
          adVisible ? "visible" : "invisible",
        )}
      >
        광고
      </p>
      {/* align-top: inline-block 기준선 아래 여백 제거(상자 높이를 CSS 값 그대로 유지)
          max-w-full: 320px 미만 초협폭 단말에서 컨테이너 밖으로 넘쳐 가로 스크롤이 생기는 것 방지 */}
      <ins
        ref={insRef}
        className={cn("adsbygoogle max-w-full align-top", SIZE[placement])}
        style={{ display: "inline-block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={AD_SLOTS[placement]}
      />
    </div>
  );
}
