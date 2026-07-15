"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    // 숨겨진(display:none 등) 요소 제외 — offsetParent가 없으면 렌더되지 않은 것
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

/**
 * 모달 다이얼로그(role="dialog" aria-modal="true") 접근성 계약 이행 훅.
 *
 * `aria-modal="true"`는 "이 다이얼로그 밖은 존재하지 않는 것으로 취급하라"는 **선언**일 뿐,
 * 브라우저가 실제로 포커스를 가둬 주지는 않는다. 선언만 하고 아래를 구현하지 않으면
 * 키보드·스크린리더 사용자는 보이지 않는 배경 링크로 탭이 빠져나가 길을 잃는다.
 *  1) 열릴 때 다이얼로그 안으로 포커스 이동
 *  2) Tab / Shift+Tab 순환(트랩)
 *  3) ESC로 닫기
 *  4) 닫힐 때 **직전 트리거로 포커스 복원**
 *  5) 배경 비활성화(inert) — 스크린리더 가상 커서·마우스·탭 모두 차단
 *
 * 5는 다이얼로그를 품지 않은 형제 노드를 body까지 거슬러 올라가며 inert 처리한다
 * (다이얼로그가 헤더 같은 중간 노드 안에 있어도 배경 전체가 확실히 비활성화됨).
 */
export function useFocusTrap<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
  initialFocus?: RefObject<HTMLElement>,
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) return;
    const container = ref.current;
    if (!container) return;

    // (4) 복원 대상 = 다이얼로그를 연 요소
    const trigger = document.activeElement as HTMLElement | null;

    // (5) 배경 비활성 — 조상 사슬의 형제들을 전부 inert
    const inerted: HTMLElement[] = [];
    let node: HTMLElement | null = container;
    while (node && node !== document.body) {
      const parent: HTMLElement | null = node.parentElement;
      if (!parent) break;
      for (const sib of Array.from(parent.children) as HTMLElement[]) {
        if (sib === node || sib.hasAttribute("inert")) continue;
        sib.setAttribute("inert", "");
        sib.setAttribute("aria-hidden", "true"); // inert 미지원 브라우저 폴백
        inerted.push(sib);
      }
      node = parent;
    }

    // (1) 진입 포커스
    const first = initialFocus?.current ?? focusables(container)[0] ?? container;
    if (first === container) container.tabIndex = -1;
    first.focus();

    // (2)(3) 키보드 계약
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables(container);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const active = document.activeElement;
      const inside = container.contains(active);
      if (e.shiftKey && (active === firstEl || !inside)) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && (active === lastEl || !inside)) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      for (const el of inerted) {
        el.removeAttribute("inert");
        el.removeAttribute("aria-hidden");
      }
      // (4) 트리거가 아직 문서에 남아 있을 때만 복원(라우트 이동 등으로 사라졌으면 생략)
      if (trigger && trigger.isConnected) trigger.focus();
    };
  }, [open, onClose, initialFocus]);

  return ref;
}
