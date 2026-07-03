"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { logout } from "@/components/AuthMenu";

type User = { name: string; email: string };

/** 마이페이지 — 로그인한 회원의 계정 정보(닉네임·이메일) 표시. */
export function AccountClient() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) {
    return <p className="py-16 text-center text-ink-400">불러오는 중…</p>;
  }

  if (user === null) {
    return (
      <div className="py-16 text-center">
        <p className="text-ink-500 dark:text-ink-300">로그인이 필요한 페이지입니다.</p>
        <Link
          href="/login"
          className="mt-5 inline-block rounded-md bg-signal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-signal-700"
        >
          로그인하러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
        <h2 className="font-headline text-lg font-bold text-ink-900 dark:text-white">계정 정보</h2>
        <dl className="mt-5 space-y-4 text-sm">
          <div className="flex items-center justify-between gap-4 border-b border-ink-100 pb-4 dark:border-ink-800">
            <dt className="shrink-0 font-medium text-ink-500 dark:text-ink-400">닉네임</dt>
            <dd className="font-semibold text-ink-900 dark:text-white">{user.name}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="shrink-0 font-medium text-ink-500 dark:text-ink-400">이메일</dt>
            <dd className="break-all font-semibold text-ink-900 dark:text-white">{user.email}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-ink-400">
          이메일은 계정 식별과 간편 로그인(카카오·네이버·구글) 연동 시 기존 계정 연결에
          사용됩니다.
        </p>
      </div>
      <button
        type="button"
        onClick={logout}
        className="mt-5 w-full rounded-md border border-ink-300 px-6 py-3 font-semibold text-ink-700 transition-colors hover:border-signal-500 hover:text-signal-600 dark:border-ink-600 dark:text-ink-200"
      >
        로그아웃
      </button>
    </div>
  );
}
