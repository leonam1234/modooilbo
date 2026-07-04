"use client";

import { Card, PROVIDER_LABEL } from "./AccountCard";

/** 연결된 로그인 수단 카드. 상태는 AccountClient가 소유. */
export function ProvidersCard({
  providers,
  hasPassword,
  hasRealEmail,
  linkMsg,
}: {
  providers: string[];
  hasPassword: boolean;
  hasRealEmail: boolean;
  linkMsg: string | null;
}) {
  return (
    <Card title="연결된 로그인 수단">
      {linkMsg && (
        <p className="mb-4 rounded-md border border-signal-200 bg-signal-50 px-4 py-3 text-sm text-signal-700 dark:border-signal-900 dark:bg-signal-950/40 dark:text-signal-300">
          {linkMsg}
        </p>
      )}
      <div className="space-y-2.5">
        {(["email", "kakao", "naver", "google"] as const).map((p) => {
          const connected =
            p === "email"
              ? hasRealEmail && (providers.includes("email") || hasPassword)
              : providers.includes(p);
          return (
            <div key={p} className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 px-4 py-2.5 dark:border-ink-800">
              <span className="flex items-center gap-2 text-sm font-medium text-ink-700 dark:text-ink-200">
                <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-signal-600" : "bg-ink-200 dark:bg-ink-700"}`} />
                {PROVIDER_LABEL[p]}
              </span>
              {connected ? (
                <span className="text-xs font-medium text-ink-400">연결됨</span>
              ) : p === "email" ? (
                <span className="text-xs text-ink-400">
                  {hasRealEmail ? "아래 비밀번호 설정 시 사용 가능" : "이메일 등록 기능 준비 중"}
                </span>
              ) : (
                <a
                  href={`/api/auth/${p}/start?link=1`}
                  className="rounded-md border border-ink-300 px-3 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:border-signal-500 hover:text-signal-600 dark:border-ink-600 dark:text-ink-200"
                >
                  연결하기
                </a>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-400">
        연결해 두면 어떤 방법으로 로그인해도 같은 계정으로 들어옵니다.
      </p>
    </Card>
  );
}
