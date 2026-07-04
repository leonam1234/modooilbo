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

export const PROVIDER_LABEL: Record<string, string> = {
  email: "이메일",
  kakao: "카카오",
  naver: "네이버",
  google: "구글",
};

export const inputCls =
  "h-11 w-full rounded-md border border-ink-200 bg-white px-4 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-signal-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white";

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
      <h2 className="font-headline text-lg font-bold text-ink-900 dark:text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </div>
  );
}
