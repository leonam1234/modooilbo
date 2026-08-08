"use client";

import type { SVGProps } from "react";

/**
 * 카카오·네이버·구글 간편 가입/로그인 버튼 묶음.
 *
 * 로그인(/login)과 회원가입(/register) 양쪽에서 쓴다. 원래 /login 에만 있었는데,
 * 정작 '회원가입'을 누른 사용자는 최고 마찰 경로(6개 필드 + 확인메일 왕복)에만
 * 떨어졌다 — 가입 화면일수록 원클릭이 먼저 보여야 한다.
 *
 * OAuth 시작 주소는 서버 함수(functions/api/auth/<provider>/start.ts)가 정본이고,
 * 여기서는 그 경로로 이동만 한다. 같은 소셜 계정이면 로그인·가입이 동일 흐름이다.
 */

function KakaoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden width={18} height={18} {...props}>
      <path d="M12 3C6.9 3 2.75 6.27 2.75 10.3c0 2.6 1.74 4.88 4.36 6.17-.19.68-.69 2.5-.79 2.89-.12.48.18.47.37.34.15-.1 2.4-1.63 3.37-2.29.64.09 1.3.14 1.94.14 5.1 0 9.25-3.27 9.25-7.25S17.1 3 12 3Z" />
    </svg>
  );
}

function NaverIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden width={16} height={16} {...props}>
      <path d="M16.27 3v9.66L7.86 3H3v18h4.73v-9.66L16.14 21H21V3z" />
    </svg>
  );
}

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
      <path fill="#FBBC05" d="M5.84 14.36a6.6 6.6 0 0 1 0-4.72V6.8H2.18a11 11 0 0 0 0 9.4l3.66-2.84Z" />
      <path
        fill="#EA4335"
        d="M12 5.11c1.62 0 3.06.56 4.2 1.64l3.13-3.13A11 11 0 0 0 2.18 6.8l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  );
}

const PROVIDERS = [
  { key: "kakao", label: "카카오", icon: KakaoIcon, cls: "bg-[#FEE500] text-black hover:opacity-90" },
  { key: "naver", label: "네이버", icon: NaverIcon, cls: "bg-[#03C75A] text-white hover:opacity-90" },
  {
    key: "google",
    label: "구글",
    icon: GoogleIcon,
    cls: "border border-ink-200 bg-white text-ink-700 hover:border-signal-500 hover:text-signal-600 dark:hover:text-signal-400 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200",
  },
] as const;

/** action: 버튼 문구의 동사 — 로그인 화면은 "시작하기", 가입 화면은 "가입하기" */
export function SocialSigninButtons({ action = "시작하기" }: { action?: string }) {
  return (
    <div className="space-y-3">
      {PROVIDERS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => {
            window.location.href = `/api/auth/${p.key}/start`;
          }}
          className={`flex h-11 w-full items-center justify-center gap-2 rounded-md px-4 font-semibold transition-opacity ${p.cls}`}
        >
          <p.icon />
          {p.label}로 {action}
        </button>
      ))}
    </div>
  );
}
