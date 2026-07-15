"use client";

/** 마이페이지 카드들이 공유하는 UI 조각·타입. */

export type User = { name: string; email: string };

export type IndexItem = {
  id: string;
  slug: string;
  title: string;
  category: string;
  publishedAt: string;
};

/** 간편가입 시 발급되는 내부용 합성 이메일(naver_·kakao_·google_ 접두 + @users.modooilbo.com).
 *  실제 수신 불가 — 화면에 노출하거나 "이메일 로그인 가능"으로 안내하면 안 된다. */
export function isSyntheticEmail(email: string): boolean {
  return email.endsWith("@users.modooilbo.com");
}

export const PROVIDER_LABEL: Record<string, string> = {
  email: "이메일",
  kakao: "카카오",
  naver: "네이버",
  google: "구글",
};

export const inputCls =
  "h-11 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-500 dark:placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white";

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-xl border border-ink-200 p-6 dark:border-ink-800">
      <h2 className="font-headline text-lg font-bold text-ink-900 dark:text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </div>
  );
}
