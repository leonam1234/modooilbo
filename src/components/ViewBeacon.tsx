"use client";

import { useEffect } from "react";

/**
 * 조회수 비콘 — 기사 열람 시 /api/view 로 1회 전송(같은 세션 중복 방지).
 * '실시간 많이 본 뉴스' 랭킹 집계용. 화면에는 아무것도 렌더하지 않음.
 */
export function ViewBeacon({ articleId }: { articleId: string }) {
  useEffect(() => {
    try {
      const key = `viewed:${articleId}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* sessionStorage 불가 시에도 전송 */
    }
    fetch("/api/view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ article: articleId }),
      keepalive: true,
    }).catch(() => {});
  }, [articleId]);
  return null;
}
