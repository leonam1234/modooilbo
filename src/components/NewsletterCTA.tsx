import { MailIcon } from "./icons";

/**
 * 뉴스레터 CTA — 정식 오픈 전까지는 입력 폼을 노출하지 않는다.
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
          <p className="mx-auto mt-6 max-w-md rounded-lg border border-[#d4af37]/30 bg-white/10 px-4 py-3 font-medium text-ink-200">
            정식 오픈 준비 중입니다 — 오픈하면 이 자리에서 바로 구독하실 수 있어요.
          </p>
          <p className="mt-3 text-xs text-ink-500">모든 뉴스레터는 무료로 제공될 예정입니다.</p>
        </div>
      </div>
    </section>
  );
}
