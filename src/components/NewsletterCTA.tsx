import { MailIcon } from "./icons";
import { NewsletterForm } from "./NewsletterForm";

/**
 * 뉴스레터 CTA — 구독 이메일을 D1(newsletter_subs)에 실제 저장한다(2026-07-07 가동).
 * (이전 버전은 이메일을 어디에도 저장하지 않으면서 "구독 완료"를 표시 — 신뢰 문제로 제거.
 *  구독 백엔드가 생기면 폼을 되살릴 것)
 */
export function NewsletterCTA() {
  return (
    <section className="gold-sheen border-t border-[#d4af37]/30 bg-ink-900">
      <div className="container-page py-14">
        <div className="mx-auto max-w-2xl text-center">
          <MailIcon className="mx-auto h-8 w-8 text-[#d4af37]" />
          <h2 className="mt-3 font-headline text-2xl font-extrabold text-white sm:text-3xl">
            매일 아침, 오늘의 신호
          </h2>
          <p className="mt-2 text-ink-300">
            에디터가 엄선한 핵심 뉴스와 깊이 있는 분석을 뉴스레터로 받아보세요.
          </p>
          <NewsletterForm />
          <p className="mt-3 text-xs text-ink-500">
            매주 월요일 발송 · 무료 · 메일 하단에서 언제든 수신거부할 수 있습니다.
          </p>
        </div>
      </div>
    </section>
  );
}
