"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useFocusTrap } from "./useFocusTrap";

/**
 * 기사 이미지 클릭 확대(라이트박스).
 * #article-hero / #article-body 안의 img에 위임 방식으로 부착 — 서버 렌더 마크업은 건드리지 않는다.
 * 배경 클릭·ESC·닫기 버튼으로 닫힘. 열려 있는 동안 본문 스크롤 잠금.
 */
export function ImageLightbox() {
  const pathname = usePathname();
  const [img, setImg] = useState<{ src: string; alt: string } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setImg(null), []);
  // role="dialog" aria-modal 계약 이행 — 진입 포커스·Tab 트랩·ESC·트리거 복원·배경 inert
  // (복원 대상 = 확대를 누른 본문 이미지 위치. 이게 없으면 닫는 순간 포커스가 문서 맨 위로 튄다)
  const dialogRef = useFocusTrap<HTMLDivElement>(!!img, close, closeRef);

  useEffect(() => {
    const roots = ["article-hero", "article-body"]
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    const images = roots.flatMap((root) => Array.from(root.querySelectorAll<HTMLImageElement>("img")));
    const originalAttrs = images.map((el) => ({
      el,
      role: el.getAttribute("role"),
      tabIndex: el.getAttribute("tabindex"),
      ariaLabel: el.getAttribute("aria-label"),
      ariaHasPopup: el.getAttribute("aria-haspopup"),
      cursor: el.style.cursor,
    }));
    const openImage = (el: HTMLImageElement) => {
      // 마우스로 연 경우에도 닫힐 때 이 이미지로 포커스를 복원할 수 있게 한다.
      el.focus({ preventScroll: true });
      setImg({ src: el.currentSrc || el.src, alt: el.alt || "" });
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName !== "IMG") return;
      openImage(t as HTMLImageElement);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName !== "IMG" || (e.key !== "Enter" && e.key !== " ")) return;
      e.preventDefault();
      openImage(t as HTMLImageElement);
    };
    roots.forEach((r) => {
      r.addEventListener("click", onClick);
      r.addEventListener("keydown", onKeyDown);
    });
    images.forEach((el) => {
      el.style.cursor = "zoom-in";
      if (!el.hasAttribute("role")) el.setAttribute("role", "button");
      if (!el.hasAttribute("tabindex")) el.tabIndex = 0;
      if (!el.hasAttribute("aria-label")) {
        el.setAttribute("aria-label", `${el.alt || "기사 이미지"} 크게 보기`);
      }
      el.setAttribute("aria-haspopup", "dialog");
    });
    return () => {
      roots.forEach((r) => {
        r.removeEventListener("click", onClick);
        r.removeEventListener("keydown", onKeyDown);
      });
      originalAttrs.forEach(({ el, role, tabIndex, ariaLabel, ariaHasPopup, cursor }) => {
        el.style.cursor = cursor;
        role === null ? el.removeAttribute("role") : el.setAttribute("role", role);
        tabIndex === null ? el.removeAttribute("tabindex") : el.setAttribute("tabindex", tabIndex);
        ariaLabel === null ? el.removeAttribute("aria-label") : el.setAttribute("aria-label", ariaLabel);
        ariaHasPopup === null
          ? el.removeAttribute("aria-haspopup")
          : el.setAttribute("aria-haspopup", ariaHasPopup);
      });
    };
  }, [pathname]);

  // 스크롤 잠금만 담당(포커스·ESC는 useFocusTrap이 처리)
  useEffect(() => {
    if (!img) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [img]);

  if (!img) return null;
  // 본문 컨테이너(z-10) 스태킹 컨텍스트에 갇히지 않도록 body로 포털 — sticky 헤더(z-40) 위에 확실히 덮는다.
  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="이미지 크게 보기"
      onClick={close}
      className="fixed inset-0 z-[100] grid cursor-zoom-out place-items-center bg-black/90 p-4"
    >
      <figure className="max-h-full max-w-5xl">
        {/* 원본 그대로 확대 표시 — next/image 최적화 불필요 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.src} alt={img.alt} className="max-h-[85vh] w-auto max-w-full rounded" />
        {img.alt && (
          <figcaption className="mt-3 text-center text-sm text-white/80">{img.alt}</figcaption>
        )}
      </figure>
      <button
        ref={closeRef}
        type="button"
        aria-label="닫기"
        onClick={close}
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-2xl leading-none text-white backdrop-blur-md transition-colors hover:bg-white/25"
      >
        ×
      </button>
    </div>,
    document.body
  );
}
