"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserIcon } from "./icons";

type User = { name: string; email: string };

/** 전역 로그인 상태 — 탭 안에서 페이지 이동해도 재요청 없이 공유 */
let cached: User | null | undefined;
/** 진행 중인 /api/auth/me 요청 — 인스턴스가 여러 개여도 요청은 1회만 */
let inflight: Promise<User | null> | null = null;
const listeners = new Set<(u: User | null) => void>();

function loadUser(): Promise<User | null> {
  if (cached !== undefined) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const r = await fetch("/api/auth/me");
      const d = r.ok ? await r.json() : null;
      cached = d?.user ?? null;
    } catch {
      cached = null;
    }
    inflight = null;
    listeners.forEach((fn) => fn(cached!));
    return cached!;
  })();
  return inflight;
}

export async function logout() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    /* 무시 */
  }
  cached = null;
  window.location.href = "/";
}

/**
 * 헤더 로그인 상태 메뉴.
 * variant "links" = 상단 유틸바(로그인/회원가입 텍스트), "pill" = 우측 알약 버튼.
 * 로그인 시 이름 + 로그아웃 표시. API 미응답(정적 미리보기)이면 로그아웃 상태로 표시.
 */
export function AuthMenu({ variant }: { variant: "links" | "pill" }) {
  const [user, setUser] = useState<User | null>(cached ?? null);

  useEffect(() => {
    const fn = (u: User | null) => setUser(u);
    listeners.add(fn);
    loadUser().then(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  if (variant === "links") {
    return user ? (
      <>
        <Link href="/account" className="font-medium text-ink-700 hover:text-ink-900 dark:text-ink-200 dark:hover:text-white">{user.name}님</Link>
        <button type="button" onClick={logout} className="hover:text-ink-900 dark:hover:text-white">
          로그아웃
        </button>
      </>
    ) : (
      <>
        <Link href="/login" className="hover:text-ink-900 dark:hover:text-white">로그인</Link>
        <Link href="/register" className="hover:text-ink-900 dark:hover:text-white">회원가입</Link>
      </>
    );
  }

  // ⚠️ 이 pill 에 `hidden sm:inline-flex` 를 다시 붙이지 말 것. 예전엔 640px 미만에서
  //    숨겼는데, 유틸바(회원가입 링크 포함)도 md 미만에서 숨어서 **모바일 화면 어디에도
  //    가입 진입점이 없었다** — 회원가입 0명의 구조적 원인이었다(2026-08-08 감사).
  //    비로그인 pill 은 로그인이 아니라 /register 로 보낸다. 가입이 먼저다.
  return user ? (
    <Link
      href="/account"
      className="ml-1 inline-flex max-w-[9.5rem] items-center gap-1.5 whitespace-nowrap rounded-full border border-ink-200 px-3.5 py-2 text-sm font-medium text-ink-700 hover:border-signal-500 hover:text-signal-600 dark:hover:text-signal-400 dark:border-ink-700 dark:text-ink-200 sm:max-w-[14rem]"
    >
      <UserIcon className="h-4 w-4 shrink-0" />
      {/* ⚠️ 닉네임은 소셜 제공자가 주는 값이라 길이·이모지를 통제할 수 없다.
          whitespace-nowrap(비로그인 버튼엔 있었는데 여기만 빠져 있었다) + max-w + truncate
          세 개가 같이 있어야 헤더에서 두 줄로 접히지 않는다. py 도 비로그인 pill(py-2)과
          맞춰 두 상태의 헤더 높이가 흔들리지 않게 한다. */}
      <span className="truncate">{user.name}님</span>
    </Link>
  ) : (
    <Link
      href="/register"
      className="ml-1 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-signal-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-signal-700"
    >
      <UserIcon className="h-4 w-4" />
      회원가입
    </Link>
  );
}
