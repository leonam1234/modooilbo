"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SVGProps } from "react";

/** 카카오 말풍선 로고 (단색) */
function KakaoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden width={18} height={18} {...props}>
      <path d="M12 3C6.9 3 2.75 6.27 2.75 10.3c0 2.6 1.74 4.88 4.36 6.17-.19.68-.69 2.5-.79 2.89-.12.48.18.47.37.34.15-.1 2.4-1.63 3.37-2.29.64.09 1.3.14 1.94.14 5.1 0 9.25-3.27 9.25-7.25S17.1 3 12 3Z" />
    </svg>
  );
}

/** 네이버 N 로고 */
function NaverIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden width={16} height={16} {...props}>
      <path d="M16.27 3v9.66L7.86 3H3v18h4.73v-9.66L16.14 21H21V3z" />
    </svg>
  );
}

/** 구글 G 로고 (멀티컬러) */
function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden width={18} height={18} {...props}>
      <path
        fill="#4285F4"
        d="M22.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.21-4.74 3.21-8.33Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.29-2.4l-3.57-2.77c-.99.66-2.26 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.36a6.6 6.6 0 0 1 0-4.72V6.8H2.18a11 11 0 0 0 0 9.4l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 6.8l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

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

  function handleSocial(provider: string) {
    if (provider === "카카오") {
      window.location.href = "/api/auth/kakao/start";
      return;
    }
    if (provider === "구글") {
      window.location.href = "/api/auth/google/start";
      return;
    }
    if (provider === "네이버") {
      window.location.href = "/api/auth/naver/start";
      return;
    }
    setNotice(`${provider} 간편 로그인은 준비 중입니다. 이메일로 가입해 주시면 나중에 같은 계정에 연결됩니다.`);
  }

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
          className="h-11 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
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
          className="h-11 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
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
        <button
          type="button"
          onClick={() =>
            setNotice(
              "비밀번호 재설정 기능을 준비 중입니다. 카카오/구글로 가입하셨다면 아래 간편 로그인을 이용해 주세요. 급하시면 help@modooilbo.com 으로 문의 주시면 도와드립니다.",
            )
          }
          className="text-sm font-medium text-signal-600 hover:text-signal-700 dark:text-signal-400"
        >
          비밀번호 찾기
        </button>
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
        <span className="text-xs text-ink-400">또는</span>
        <span className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleSocial("카카오")}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#FEE500] px-4 font-semibold text-black transition-opacity hover:opacity-90"
        >
          <KakaoIcon />
          카카오로 시작하기
        </button>
        <button
          type="button"
          onClick={() => handleSocial("네이버")}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#03C75A] px-4 font-semibold text-white transition-opacity hover:opacity-90"
        >
          <NaverIcon />
          네이버로 시작하기
        </button>
        <button
          type="button"
          onClick={() => handleSocial("구글")}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-ink-200 bg-white px-4 font-semibold text-ink-700 transition-colors hover:border-signal-500 hover:text-signal-600 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
        >
          <GoogleIcon />
          구글로 시작하기
        </button>
      </div>

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
