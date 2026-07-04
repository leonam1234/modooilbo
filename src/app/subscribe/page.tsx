import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "구독·후원",
  description:
    "독자의 힘으로 만드는 독립 저널리즘. 모두일보는 광고에 휘둘리지 않는 지속가능한 후원 모델을 준비하고 있습니다.",
  alternates: { canonical: "/subscribe/" },
};

const NOW_FREE = [
  "전 기사·기획 무제한 무료 열람",
  "자극적 클릭베이트 없는 편집",
  "정치적 중립·사실 기반 보도",
  "독자·파트너 후원 기반 운영 지향",
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "지금 구독료가 있나요?",
    a: "아니요. 현재 모두일보의 모든 기사와 기획은 제한 없이 무료로 공개하고 있습니다. 정식 멤버십과 후원 모델은 준비 중입니다.",
  },
  {
    q: "모두일보는 어떻게 운영되나요?",
    a: "광고 의존을 줄이고 독자·파트너의 후원을 기반으로 하는 지속가능한 모델을 지향합니다. 구체적인 방식은 확정되는 대로 투명하게 공개하겠습니다.",
  },
  {
    q: "기업·기관도 후원할 수 있나요?",
    a: "네. 맞춤형 후원·제휴 프로그램을 함께 설계합니다. 아래 ‘제휴·후원 문의하기’ 또는 help@modooilbo.com 으로 연락 주시면 담당자가 안내해 드립니다.",
  },
  {
    q: "멤버십은 언제 나오나요?",
    a: "지속가능하고 공정한 방식으로 준비 중입니다. ‘출시 소식 받기’를 신청해 주시면 준비되는 대로 가장 먼저 안내드리겠습니다.",
  },
];

const MAIL_INQUIRY = `mailto:help@modooilbo.com?subject=${encodeURIComponent(
  "[모두일보] 제휴·후원 문의",
)}&body=${encodeURIComponent("회사명:\n담당자:\n연락처:\n문의 내용:\n")}`;

const MAIL_NOTIFY = `mailto:help@modooilbo.com?subject=${encodeURIComponent(
  "[모두일보] 멤버십 출시 알림 신청",
)}&body=${encodeURIComponent("모두일보 멤버십·후원 출시 소식을 받고 싶습니다. 이 메일 주소로 안내해 주세요.\n")}`;

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function SubscribePage() {
  return (
    <>
      <PageHeader
        title="구독·후원"
        subtitle="독자의 힘으로 만드는 독립 저널리즘"
        breadcrumb={[{ label: "구독·후원" }]}
      />

      {/* 가치 제안 */}
      <section className="container-page py-10 sm:py-12">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-signal-600">왜 후원이 필요한가</p>
          <h2 className="mt-2 font-headline text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white sm:text-3xl">
            광고가 아니라, 독자가 만드는 뉴스
          </h2>
          <div className="mt-5 space-y-4 leading-relaxed text-ink-600 dark:text-ink-300">
            <p>
              좋은 저널리즘에는 시간과 비용이 듭니다. 한 건의 탐사보도를 위해 기자들은 수개월 동안
              자료를 검증하고 현장을 취재합니다. 그러나 광고와 트래픽에만 기대는 구조에서는 클릭을
              부르는 자극적인 기사가 깊이 있는 보도를 밀어내기 쉽습니다. 모두일보는 다른 길을
              택했습니다.
            </p>
            <p>
              독자·파트너의 직접 후원은 우리가 광고주나 정파의 눈치를 보지 않고 오직 사실과 공익에만
              집중할 수 있게 하는 가장 단단한 토대입니다. 지속가능한 후원 모델을 신중하게 준비하고
              있으며, 함께 만들어 주시길 바랍니다.
            </p>
          </div>
        </div>
      </section>

      {/* 현재 안내 + 준비 중 */}
      <section className="container-page pb-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-ink-200 bg-ink-50/60 p-7 dark:border-ink-800 dark:bg-ink-900/40 sm:p-9">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-300 px-3 py-1 text-xs font-semibold text-ink-500 dark:border-ink-600 dark:text-ink-300">
            멤버십·후원 모델 준비 중
          </span>
          <h2 className="mt-4 font-headline text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">
            지금은 모든 기사를 무료로 공개합니다
          </h2>
          <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
            정식 멤버십과 후원 방식은 지속가능한 형태로 설계하고 있습니다. 준비되는 대로 안내드리며,
            그때까지 모두일보의 모든 기사와 기획은 제한 없이 무료로 읽으실 수 있습니다.
          </p>
          <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            {NOW_FREE.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-ink-700 dark:text-ink-200">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-signal-600 dark:text-signal-400" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={MAIL_INQUIRY}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-ink-900 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-ink-700 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
            >
              제휴·후원 문의하기
            </a>
            <a
              href={MAIL_NOTIFY}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-ink-300 px-6 py-3 text-center text-sm font-semibold text-ink-700 transition-colors hover:border-signal-500 hover:text-signal-600 dark:border-ink-600 dark:text-ink-200"
            >
              출시 소식 받기
            </a>
          </div>
          <p className="mt-4 text-xs text-ink-400">
            문의는 help@modooilbo.com 으로도 보내실 수 있습니다.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page pb-16">
        <h2 className="font-headline text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">
          자주 묻는 질문
        </h2>
        <div className="mt-6 divide-y divide-ink-200 rounded-xl border border-ink-200 dark:divide-ink-800 dark:border-ink-800">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group p-5 [&_summary]:list-none">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold text-ink-900 dark:text-white">
                <span>{faq.q}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-5 w-5 shrink-0 text-ink-400 transition-transform group-open:rotate-180">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
