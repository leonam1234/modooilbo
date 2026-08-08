"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SocialSigninButtons } from "@/components/SocialSigninButtons";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (!email || !password) {
      setNotice("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json();
      if (r.ok && d?.user) {
        window.location.href = "/";
        return;
      }
      setNotice(d?.error || "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } catch {
      setNotice("네트워크 오류입니다. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  }

  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get("error");
    if (err === "kakao") setNotice("카카오 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    if (err === "google") setNotice("구글 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    if (err === "naver") setNotice("네이버 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }, []);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <label
          htmlFor="login-email"
          className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200"
        >
          이메일
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className="h-11 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-500 dark:placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        />
      </div>

      <div>
        <label
          htmlFor="login-password"
          className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200"
        >
          비밀번호
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호를 입력하세요"
          className="h-11 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-500 dark:placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
          <input
            type="checkbox"
            name="remember"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-ink-300 text-signal-600 focus:ring-signal-500 dark:border-ink-600 dark:bg-ink-900"
          />
          로그인 상태 유지
        </label>
        <Link
          href="/forgot"
          className="text-sm font-medium text-signal-600 hover:text-signal-700 dark:text-signal-400"
        >
          비밀번호 찾기
        </Link>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-signal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-signal-700 disabled:opacity-50"
      >
        {busy ? "로그인 중…" : "로그인"}
      </button>

      {notice && (
        <p
          role="status"
          className="rounded-md border border-signal-200 bg-signal-50 px-4 py-3 text-sm text-signal-700 dark:border-signal-900 dark:bg-signal-950/40 dark:text-signal-300"
        >
          {notice}
        </p>
      )}

      <div className="flex items-center gap-3 py-1" aria-hidden>
        <span className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
        <span className="text-xs text-ink-500 dark:text-ink-400">또는</span>
        <span className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
      </div>

      <SocialSigninButtons action="시작하기" />

      <p className="text-center text-[11px] leading-relaxed text-ink-500 dark:text-ink-400">
        간편 로그인으로 처음 가입하는 경우{" "}
        <Link href="/terms" className="underline">이용약관</Link>과{" "}
        <Link href="/privacy" className="underline">개인정보처리방침</Link>에 동의한 것으로 간주됩니다.
      </p>

      <p className="pt-1 text-center text-sm text-ink-500 dark:text-ink-300">
        아직 회원이 아니신가요?{" "}
        <Link
          href="/register"
          className="font-semibold text-signal-600 hover:text-signal-700 dark:text-signal-400"
        >
          회원가입
        </Link>
      </p>
    </form>
  );
}
