"use client";

import { useState } from "react";
import Link from "next/link";

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [busy, setBusy] = useState(false);
  const passwordMismatch = confirm.length > 0 && password !== confirm;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;

    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다. 다시 확인해 주세요.");
      return;
    }
    if (!agreeTerms || !agreePrivacy) {
      setError("필수 약관에 동의해 주세요.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password, newsletter: agreeMarketing }),
      });
      const d = await r.json();
      if (r.ok && d?.user) {
        setSubmitted(true);
      } else {
        setError(d?.error || "가입에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } catch {
      setError("네트워크 오류입니다. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  }

  if (submitted) {
    return (
      <div className="space-y-5 text-center">
        <div
          role="status"
          className="rounded-md border border-signal-200 bg-signal-50 px-4 py-5 text-sm text-signal-700 dark:border-signal-900 dark:bg-signal-950/40 dark:text-signal-300"
        >
          <p className="font-headline text-lg font-bold text-ink-900 dark:text-white">
            가입이 완료되었습니다
          </p>
          <p className="mt-2">{name ? `${name}님, ` : ""}환영합니다. 바로 로그인되었습니다.</p>
        </div>
        <Link
          href="/"
          className="inline-block w-full rounded-md bg-signal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-signal-700"
        >
          홈으로 가기
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <label
          htmlFor="reg-name"
          className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200"
        >
          이름
        </label>
        <input
          id="reg-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="홍길동"
          className="h-11 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        />
      </div>

      <div>
        <label
          htmlFor="reg-email"
          className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200"
        >
          이메일
        </label>
        <input
          id="reg-email"
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
          htmlFor="reg-password"
          className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200"
        >
          비밀번호
        </label>
        <input
          id="reg-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="8자 이상 입력하세요"
          className="h-11 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        />
      </div>

      <div>
        <label
          htmlFor="reg-confirm"
          className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200"
        >
          비밀번호 확인
        </label>
        <input
          id="reg-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="비밀번호를 다시 입력하세요"
          aria-invalid={passwordMismatch}
          className={`h-11 w-full rounded-md border bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-signal-500 dark:bg-ink-900 dark:text-white ${
            passwordMismatch
              ? "border-signal-500 dark:border-signal-500"
              : "border-ink-200 dark:border-ink-700"
          }`}
        />
        {passwordMismatch && (
          <p className="mt-1.5 text-sm text-signal-600 dark:text-signal-400">
            비밀번호가 일치하지 않습니다.
          </p>
        )}
      </div>

      <fieldset className="space-y-3 rounded-md border border-ink-200 p-4 dark:border-ink-700">
        <legend className="px-1 text-sm font-medium text-ink-700 dark:text-ink-200">
          약관 동의
        </legend>
        <label className="flex items-start gap-2 text-sm text-ink-600 dark:text-ink-300">
          <input
            type="checkbox"
            name="agreeTerms"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-ink-300 text-signal-600 focus:ring-signal-500 dark:border-ink-600 dark:bg-ink-900"
          />
          <span>
            <span className="font-medium text-signal-600 dark:text-signal-400">(필수)</span>{" "}
            <Link href="/terms" className="underline hover:text-signal-600">
              이용약관
            </Link>
            에 동의합니다.
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-ink-600 dark:text-ink-300">
          <input
            type="checkbox"
            name="agreePrivacy"
            checked={agreePrivacy}
            onChange={(e) => setAgreePrivacy(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-ink-300 text-signal-600 focus:ring-signal-500 dark:border-ink-600 dark:bg-ink-900"
          />
          <span>
            <span className="font-medium text-signal-600 dark:text-signal-400">(필수)</span>{" "}
            <Link href="/privacy" className="underline hover:text-signal-600">
              개인정보처리방침
            </Link>
            에 동의합니다.
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-ink-600 dark:text-ink-300">
          <input
            type="checkbox"
            name="agreeMarketing"
            checked={agreeMarketing}
            onChange={(e) => setAgreeMarketing(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-ink-300 text-signal-600 focus:ring-signal-500 dark:border-ink-600 dark:bg-ink-900"
          />
          <span>
            <span className="text-ink-400">(선택)</span> 뉴스레터 및 마케팅 정보 수신에
            동의합니다.
          </span>
        </label>
      </fieldset>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-signal-200 bg-signal-50 px-4 py-3 text-sm text-signal-700 dark:border-signal-900 dark:bg-signal-950/40 dark:text-signal-300"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-signal-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-signal-700 disabled:opacity-50"
      >
        {busy ? "가입 중…" : "가입하기"}
      </button>

      <p className="pt-1 text-center text-sm text-ink-500 dark:text-ink-300">
        이미 계정이 있으신가요?{" "}
        <Link
          href="/login"
          className="font-semibold text-signal-600 hover:text-signal-700 dark:text-signal-400"
        >
          로그인
        </Link>
      </p>
    </form>
  );
}
