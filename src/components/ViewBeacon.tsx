"use client";

import { useEffect } from "react";

/**
 * 조회수 비콘 — 기사 열람 시 /api/view 로 1회 전송(같은 세션 중복 방지).
 * '실시간 많이 본 뉴스' 랭킹 집계용. 화면에는 아무것도 렌더하지 않음.
 */
export function ViewBeacon({ articleId }: { articleId: string }) {
  useEffect(() => {
    // 최근 본 기사(localStorage, 최대 10개) — RecentArticles 위젯용
    try {
      const KEY = "modoo_recent";
      const prev: string[] = JSON.parse(localStorage.getItem(KEY) || "[]");
      const next = [articleId, ...prev.filter((x) => x !== articleId)].slice(0, 10);
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    try {
      if (sessionStorage.getItem(`viewed:${articleId}`)) return;
    } catch {
      /* sessionStorage 불가 시에도 전송 */
    }
    // sendBeacon 우선 — 페이지 로딩/이탈과 완전히 분리(응답 대기로 스피너가 돌지 않게).
    // 하루 1회 중복 방지는 서버(IP+날짜)가 하므로 낙관적으로 플래그를 기록해도 안전.
    const body = JSON.stringify({ article: articleId });
    let sent = false;
    try {
      if (typeof navigator.sendBeacon === "function") {
        sent = navigator.sendBeacon("/api/view", new Blob([body], { type: "application/json" }));
      }
    } catch {
      /* fetch 폴백 */
    }
    if (sent) {
      try {
        sessionStorage.setItem(`viewed:${articleId}`, "1");
      } catch {
        /* ignore */
      }
      return;
    }
    fetch("/api/view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    })
      .then((r) => {
        // 전송이 실제 성공했을 때만 세션 플래그 기록 — 실패 시 다음 진입에서 재시도
        if (r.ok) sessionStorage.setItem(`viewed:${articleId}`, "1");
      })
      .catch(() => {});
  }, [articleId]);
  return null;
}
