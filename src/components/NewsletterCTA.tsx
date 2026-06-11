"use client";

import { useState } from "react";
import { MailIcon } from "./icons";

export function NewsletterCTA() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (email.includes("@")) setDone(true);
  }

  return (
    <section className="bg-ink-900">
      <div className="container-page py-14">
        <div className="mx-auto max-w-2xl text-center">
          <MailIcon className="mx-auto h-8 w-8 text-signal-500" />
          <h2 className="mt-3 font-headline text-2xl font-extrabold text-white sm:text-3xl">
            매일 아침, 오늘의 신호
          </h2>
          <p className="mt-2 text-ink-300">
            에디터가 엄선한 핵심 뉴스와 깊이 있는 분석을 뉴스레터로 받아보세요.
          </p>
          {done ? (
            <p className="mx-auto mt-6 max-w-md rounded-lg bg-white/10 px-4 py-3 font-medium text-signal-300">
              구독 신청이 완료되었습니다. 감사합니다!
            </p>
          ) : (
            <form onSubmit={submit} className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일 주소를 입력하세요"
                aria-label="이메일 주소"
                className="h-12 flex-1 rounded-md border border-white/20 bg-white/10 px-4 text-white outline-none placeholder:text-ink-400 focus:border-signal-500"
              />
              <button
                type="submit"
                className="h-12 shrink-0 rounded-md bg-signal-600 px-6 font-semibold text-white transition-colors hover:bg-signal-700"
              >
                무료 구독
              </button>
            </form>
          )}
          <p className="mt-3 text-xs text-ink-500">
            언제든 구독을 취소할 수 있습니다. 데모용 양식으로 실제 전송되지 않습니다.
          </p>
        </div>
      </div>
    </section>
  );
}
