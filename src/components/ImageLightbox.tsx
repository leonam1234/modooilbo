"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * 기사 이미지 클릭 확대(라이트박스).
 * #article-hero / #article-body 안의 img에 위임 방식으로 부착 — 서버 렌더 마크업은 건드리지 않는다.
 * 배경 클릭·ESC·닫기 버튼으로 닫힘. 열려 있는 동안 본문 스크롤 잠금.
 */
export function ImageLightbox() {
  const [img, setImg] = useState<{ src: string; alt: string } | null>(null);
  const close = useCallback(() => setImg(null), []);

  useEffect(() => {
    const roots = ["article-hero", "article-body"]
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName !== "IMG") return;
      const el = t as HTMLImageElement;
      setImg({ src: el.currentSrc || el.src, alt: el.alt || "" });
    };
    roots.forEach((r) => {
      r.addEventListener("click", onClick);
      r.querySelectorAll("img").forEach((i) => (i.style.cursor = "zoom-in"));
    });
    return () => roots.forEach((r) => r.removeEventListener("click", onClick));
  }, []);

  useEffect(() => {
    if (!img) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [img, close]);

  if (!img) return null;
  // 본문 컨테이너(z-10) 스태킹 컨텍스트에 갇히지 않도록 body로 포털 — sticky 헤더(z-40) 위에 확실히 덮는다.
  return createPortal(
    <div
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
        type="button"
        aria-label="닫기"
        onClick={close}
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-2xl leading-none text-white transition-colors hover:bg-white/20"
      >
        ×
      </button>
    </div>,
    document.body
  );
}
