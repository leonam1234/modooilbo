"use client";

import { useEffect } from "react";

/**
 * 뉴스 사이트 자동 새로고침 (네이버·연합뉴스식) — 화면은 두고 콘텐츠만 낡는 것 방지.
 *  - 탭이 보이는 상태로 15분간 무조작 → 새로고침
 *  - 다른 탭/앱에 10분 이상 갔다가 돌아온 순간 → 새로고침
 * 덤: 배포 직후 옛 번들을 물고 있는 브라우저도 이 주기로 자연 치유된다.
 *
 * 절대 새로고침하지 않는 경우:
 *  - 입력 중(텍스트박스 포커스, 댓글 내용 존재, contenteditable)
 *  - 로그인·가입·마이페이지 (폼 상태 손실 방지)
 *  - 본문 듣기(TTS) 재생 중
 *  - ?autorefresh=off (디버깅용)
 */

const IDLE_RELOAD_MS = 15 * 60 * 1000; // 보이는 채 방치
const HIDDEN_RELOAD_MS = 10 * 60 * 1000; // 백그라운드 체류
const CHECK_EVERY_MS = 60 * 1000;

const SKIP_PATHS = ["/login", "/register", "/account", "/forgot", "/reset"];

function isSafeToReload(): boolean {
  if (SKIP_PATHS.some((p) => window.location.pathname.startsWith(p))) return false;
  if (new URLSearchParams(window.location.search).get("autorefresh") === "off") return false;
  const el = document.activeElement;
  if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as HTMLElement).isContentEditable)) {
    return false;
  }
  // 포커스를 잠깐 뗐어도 쓰다 만 댓글이 있으면 보호
  for (const t of Array.from(document.querySelectorAll("textarea"))) {
    if (t.value.trim().length > 0) return false;
  }
  if (window.speechSynthesis?.speaking) return false;
  return true;
}

export function AutoRefresh() {
  useEffect(() => {
    let lastActivity = Date.now();
    let hiddenAt: number | null = null;

    const touch = () => {
      lastActivity = Date.now();
    };
    const activityEvents: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove"];
    activityEvents.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        return;
      }
      const away = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = null;
      touch();
      if (away >= HIDDEN_RELOAD_MS && isSafeToReload()) window.location.reload();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const timer = window.setInterval(() => {
      if (document.hidden) return; // 숨어 있는 동안은 복귀 시점에 처리
      if (Date.now() - lastActivity >= IDLE_RELOAD_MS && isSafeToReload()) window.location.reload();
    }, CHECK_EVERY_MS);

    return () => {
      activityEvents.forEach((e) => window.removeEventListener(e, touch));
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
