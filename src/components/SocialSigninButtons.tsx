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

function AppleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden width={17} height={17} {...props}>
      <path d="M16.37 12.78c.02 2.5 2.19 3.33 2.21 3.34-.02.06-.35 1.2-1.15 2.37-.69 1.02-1.41 2.03-2.55 2.05-1.11.02-1.47-.66-2.75-.66-1.28 0-1.68.64-2.73.68-1.09.04-1.93-1.1-2.63-2.11-1.43-2.07-2.53-5.86-1.06-8.42.73-1.27 2.04-2.08 3.46-2.1 1.08-.02 2.09.72 2.75.72.66 0 1.89-.89 3.19-.76.54.02 2.06.22 3.04 1.65-.08.05-1.81 1.06-1.78 3.24ZM14.3 5.6c.58-.71.98-1.7.87-2.68-.84.03-1.86.56-2.47 1.27-.54.62-1.01 1.62-.89 2.58.94.07 1.9-.48 2.49-1.17Z" />
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

/**
 * 애플 로그인 — 준비 중(2026-08-10).
 * 회사 Apple Developer Program 계정은 이미 있고 자격증명 수령 대기 중이다.
 * 붙일 때 필요한 것: Service ID, Key(.p8), Team ID, 그리고 ES256 서명 JWT를
 * client_secret으로 만드는 로직(정적 시크릿이 아니라 최대 6개월 만료 → 갱신 필요).
 * functions/api/auth/apple/{start,callback}.ts 를 만들고 여기 disabled 를 걷어내면 된다.
 */
const APPLE_READY = false;

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

      {APPLE_READY ? (
        <button
          type="button"
          onClick={() => {
            window.location.href = "/api/auth/apple/start";
          }}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-black px-4 font-semibold text-white transition-opacity hover:opacity-90"
        >
          <AppleIcon />
          Apple로 {action}
        </button>
      ) : (
        <div
          className="flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-md border border-ink-200 bg-ink-50 px-4 font-semibold text-ink-400 dark:border-ink-800 dark:bg-ink-900/60 dark:text-ink-500"
          aria-disabled
        >
          <AppleIcon />
          Apple로 {action}
          <span className="ml-1 rounded-full border border-ink-300 px-2 py-0.5 text-[11px] font-medium dark:border-ink-700">
            준비 중
          </span>
        </div>
      )}
    </div>
  );
}
