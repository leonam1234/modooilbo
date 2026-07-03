"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserIcon } from "./icons";

type User = { name: string; email: string };

/** 전역 로그인 상태 — 탭 안에서 페이지 이동해도 재요청 없이 공유 */
let cached: User | null | undefined;
const listeners = new Set<(u: User | null) => void>();

async function loadUser(): Promise<User | null> {
  if (cached !== undefined) return cached;
  try {
    const r = await fetch("/api/auth/me");
    const d = r.ok ? await r.json() : null;
    cached = d?.user ?? null;
  } catch {
    cached = null;
  }
  listeners.forEach((fn) => fn(cached!));
  return cached!;
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

  return user ? (
    <Link
      href="/account"
      className="ml-1 hidden items-center gap-1.5 rounded-full border border-ink-200 px-3.5 py-1.5 text-sm font-medium text-ink-700 hover:border-signal-500 hover:text-signal-600 dark:border-ink-700 dark:text-ink-200 sm:inline-flex"
    >
      <UserIcon className="h-4 w-4" />
      {user.name}님
    </Link>
  ) : (
    <Link
      href="/login"
      className="ml-1 hidden items-center gap-1.5 rounded-full border border-ink-200 px-3.5 py-1.5 text-sm font-medium text-ink-700 hover:border-signal-500 hover:text-signal-600 dark:border-ink-700 dark:text-ink-200 sm:inline-flex"
    >
      <UserIcon className="h-4 w-4" />
      로그인
    </Link>
  );
}
