"use client";

import { useState } from "react";
import Link from "next/link";
import { SocialSigninButtons } from "@/components/SocialSigninButtons";

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
        body: JSON.stringify({ name, email, password, newsletter: agreeMarketing, terms: agreeTerms && agreePrivacy }),
      });
      const d = await r.json();
      // ⚠️ 2026-07-15 — 가입이 **이메일 인증 기반**으로 바뀌었다. 이 응답은 계정 생성도,
      //   로그인도 아니고 "확인 메일을 보냈다"는 뜻뿐이다(세션 쿠키도 없다).
      //   응답은 신규 주소든 이미 가입된 주소든 완전히 동일하다(계정 열거 차단) → 프론트도
      //   그 둘을 구분해선 안 된다. 계정은 메일의 링크(/verify-signup)를 눌러야 만들어진다.
      if (r.ok && d?.ok) {
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
    // ⚠️ 문구 주의: 아직 계정은 없다. "가입 완료"·"로그인됨"이라고 쓰면 거짓 안내가 된다
    //   (2026-07-15 뉴스레터 '구독 완료' 거짓 안내와 같은 실수).
    //   또 "이미 가입된 주소입니다" 같은 분기 문구를 여기 넣어서도 안 된다 — 서버가 두 경우를
    //   구분하지 않는 이유(계정 열거 차단)가 통째로 무너진다.
    return (
      <div className="space-y-5 text-center">
        <div
          role="status"
          className="rounded-md border border-signal-200 bg-signal-50 px-4 py-5 text-sm text-signal-700 dark:border-signal-900 dark:bg-signal-950/40 dark:text-signal-300"
        >
          <p className="font-headline text-lg font-bold text-ink-900 dark:text-white">
            확인 메일을 보냈습니다
          </p>
          <p className="mt-2">
            <b className="break-all text-ink-900 dark:text-white">{email}</b>
            <br />
            메일의 <b>[가입 확인하기]</b> 버튼을 눌러야 가입이 완료됩니다. 링크는 24시간 동안 유효합니다.
          </p>
          <p className="mt-3 text-ink-500 dark:text-ink-400">
            메일이 보이지 않으면 스팸함도 확인해 주세요.
          </p>
        </div>
        <Link
          href="/"
          className="inline-block w-full rounded-md border border-ink-300 px-6 py-3 font-semibold text-ink-700 transition-colors hover:border-signal-500 hover:text-signal-600 dark:border-ink-600 dark:text-ink-200 dark:hover:text-signal-400"
        >
          홈으로 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 원클릭 가입을 맨 위에 — 이메일 폼(6개 필드 + 확인메일 왕복)은 보조 경로다.
          이 버튼이 /login 에만 있던 동안 '회원가입' 화면은 최고 마찰 경로만 제공했다. */}
      <SocialSigninButtons action="가입하기" />

      <div className="flex items-center gap-3 py-1" aria-hidden>
        <span className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
        <span className="text-xs text-ink-500 dark:text-ink-400">또는 이메일로 가입</span>
        <span className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
      </div>

      {/* ⚠️ 2026-08-10 — 이메일 가입은 **현재 100% 실패한다**. 접어서 내보낸다.
          원인: 메일러 워커가 쓰는 Cloudflare send_email 바인딩은 수신처 제한을 걸지
          않으면 "Email Routing에 검증 등록된 목적지"로만 보낼 수 있다(공식 문서:
          "The binding can send to any verified destination address in your account").
          신규 가입자의 주소는 당연히 미검증 → 발송 실패 → signup.ts 가 502를 반환하고
          사용자는 "메일 발송에 실패했습니다"만 보게 된다. 가입자 0명의 구조적 원인.
          해소 조건: Cloudflare Email Sending(Workers Paid) 또는 외부 발송 서비스 도입.
          그때 이 <details> 래퍼와 안내 문단만 걷어내면 폼은 그대로 살아난다. */}
      <details className="rounded-lg border border-ink-200 bg-ink-50/60 p-4 dark:border-ink-800 dark:bg-ink-900/60">
        <summary className="cursor-pointer text-sm font-medium text-ink-700 dark:text-ink-200">
          이메일로 가입하기 (일시 중단)
        </summary>
        <p className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
          확인 메일 발송 설비를 점검하고 있어 이메일 가입을 잠시 멈췄습니다. 위의 카카오·네이버·구글
          버튼으로 가입하시면 확인 메일 없이 바로 이용하실 수 있습니다. 문의는{" "}
          <a href="mailto:help@modooilbo.com" className="underline">
            help@modooilbo.com
          </a>
          으로 주세요.
        </p>
      </details>

      <form onSubmit={handleSubmit} noValidate hidden className="space-y-5">
      <div>
        <label
          htmlFor="reg-name"
          className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200"
        >
          닉네임
        </label>
        <input
          id="reg-name"
          name="name"
          type="text"
          autoComplete="nickname"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="모두일보에서 표시될 이름"
          className="h-11 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-500 dark:placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
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
          className="h-11 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-500 dark:placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
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
          className="h-11 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-500 dark:placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
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
          className={`h-11 w-full rounded-md border bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-500 dark:placeholder:text-ink-400 focus:border-signal-500 dark:bg-ink-900 dark:text-white ${
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
            <Link href="/terms" className="underline hover:text-signal-600 dark:hover:text-signal-400">
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
            <Link href="/privacy" className="underline hover:text-signal-600 dark:hover:text-signal-400">
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
            <span className="text-ink-500 dark:text-ink-400">(선택)</span> 뉴스레터 및 마케팅 정보 수신에
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

      <p className="text-center text-[11px] leading-relaxed text-ink-500 dark:text-ink-400">
        간편 가입 시 <Link href="/terms" className="underline">이용약관</Link>과{" "}
        <Link href="/privacy" className="underline">개인정보처리방침</Link>에 동의한 것으로 간주됩니다.
      </p>
    </div>
  );
}
