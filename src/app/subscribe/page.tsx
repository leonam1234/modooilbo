import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "구독·후원",
  description:
    "독자의 힘으로 만드는 독립 저널리즘. 모두일보의 멤버십과 후원으로 광고에 휘둘리지 않는 보도를 함께 만들어주세요.",
};

interface Plan {
  name: string;
  price: string;
  period?: string;
  tagline: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  badge?: string;
  href?: string;
}

const PLANS: Plan[] = [
  {
    name: "무료 회원",
    price: "0원",
    tagline: "모두일보를 가볍게 시작하세요.",
    features: [
      "기본 기사 무제한 열람",
      "데일리 뉴스레터 ‘모두의 아침’",
      "기사 북마크 및 읽기 목록",
      "댓글 및 커뮤니티 참여",
    ],
    cta: "무료로 시작하기",
  },
  {
    name: "디지털 멤버십",
    price: "9,900원",
    period: "/월",
    tagline: "깊이 있는 저널리즘을 온전히 누리세요.",
    features: [
      "전 기사·심층 기획·아카이브 무제한",
      "디스플레이 광고 최소화",
      "프리미엄 뉴스레터 전체 구독",
      "에디터 추천 주간 리포트",
      "기기 제한 없는 동기화",
    ],
    cta: "멤버십 시작하기",
    highlight: true,
    badge: "인기",
  },
  {
    name: "기업 후원",
    price: "별도 협의",
    tagline: "기업·기관과 함께하는 신뢰 저널리즘.",
    features: [
      "맞춤형 후원·제휴 프로그램 설계",
      "공익 저널리즘 후원으로 브랜드 신뢰 제고",
      "지면·뉴스레터 감사 표기",
      "오프라인 저널리즘 행사 협력",
      "전용 담당자 배정 및 정기 리포트",
    ],
    cta: "기업 후원 문의하기",
    href: `mailto:help@modooilbo.com?subject=${encodeURIComponent(
      "[모두일보] 기업 후원 문의",
    )}&body=${encodeURIComponent("회사명:\n담당자:\n연락처:\n후원 희망 형태:\n문의 내용:\n")}`,
  },
];

interface CompareRow {
  label: string;
  free: boolean | string;
  member: boolean | string;
  supporter: boolean | string;
}

const COMPARE: CompareRow[] = [
  { label: "기본 기사 열람", free: true, member: true, supporter: true },
  { label: "심층 기획·전체 아카이브", free: false, member: true, supporter: true },
  { label: "광고 최소화", free: false, member: true, supporter: true },
  { label: "프리미엄 뉴스레터", free: false, member: true, supporter: true },
  { label: "후원자 리포트", free: false, member: false, supporter: true },
  { label: "오프라인 행사 초대", free: false, member: false, supporter: true },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "후원금은 어디에 쓰이나요?",
    a: "후원금 전액은 기자 인건비와 현장 취재비, 데이터·탐사보도 제작에 사용됩니다. 분기마다 후원자 리포트를 통해 사용 내역과 성과를 투명하게 공개합니다.",
  },
  {
    q: "멤버십과 후원은 무엇이 다른가요?",
    a: "디지털 멤버십은 모든 기사와 아카이브를 제한 없이 이용하는 유료 구독입니다. 기업 후원은 기업·기관이 맞춤형으로 공익 저널리즘을 후원·제휴하는 방식이며, 별도 협의로 진행됩니다.",
  },
  {
    q: "언제든 해지할 수 있나요?",
    a: "네. 약정 기간이나 위약금은 없습니다. 마이페이지에서 언제든 직접 해지할 수 있으며, 남은 결제 주기 동안은 혜택이 유지됩니다.",
  },
  {
    q: "결제 수단은 무엇이 있나요?",
    a: "국내 신용·체크카드, 간편결제, 계좌 자동이체를 지원할 예정입니다. 모든 결제는 PG사를 통해 안전하게 처리되며 카드 정보는 저장되지 않습니다.",
  },
  {
    q: "사업자·기관 단위로 후원할 수 있나요?",
    a: "단체 멤버십과 기관 후원 프로그램을 별도로 운영합니다. 제휴 문의 페이지를 통해 연락 주시면 담당자가 맞춤 제안을 안내해 드립니다.",
  },
];

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function DashIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
      className={className}
    >
      <path d="M5 12h14" />
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
          <p className="text-sm font-semibold uppercase tracking-wide text-signal-600">
            왜 후원이 필요한가
          </p>
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
              독자의 직접 후원은 우리가 광고주나 정파의 눈치를 보지 않고 오직 사실과 공익에만
              집중할 수 있게 하는 가장 단단한 토대입니다. 여러분의 멤버십과 후원은 권력을 감시하고,
              가려진 목소리를 전하며, 신뢰할 수 있는 기록을 남기는 일에 그대로 쓰입니다. 함께
              만들어 주세요.
            </p>
          </div>
        </div>
      </section>

      {/* 요금제 카드 */}
      <section className="container-page pb-4">
        <div className="grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-xl border bg-white p-6 dark:bg-ink-900",
                plan.highlight
                  ? "border-signal-600 shadow-lg ring-1 ring-signal-600/20 lg:-translate-y-2"
                  : "border-ink-200 dark:border-ink-800",
              )}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-signal-600 px-3 py-1 text-xs font-bold text-white">
                  {plan.badge}
                </span>
              )}
              <h3 className="font-headline text-xl font-bold text-ink-900 dark:text-white">
                {plan.name}
              </h3>
              <p className="mt-1 min-h-[2.5rem] text-sm text-ink-500 dark:text-ink-300">
                {plan.tagline}
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-headline text-3xl font-extrabold text-ink-900 dark:text-white">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-sm text-ink-500 dark:text-ink-400">{plan.period}</span>
                )}
              </div>

              <ul className="mt-6 space-y-3 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-ink-700 dark:text-ink-200">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-signal-600 dark:text-signal-400" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {plan.href ? (
                <a
                  href={plan.href}
                  className={cn(
                    "mt-8 block rounded-md px-6 py-3 text-center font-semibold transition-colors",
                    plan.highlight
                      ? "bg-signal-600 text-white hover:bg-signal-700"
                      : "border border-ink-300 text-ink-700 hover:border-signal-500 hover:text-signal-600 dark:border-ink-600 dark:text-ink-200",
                  )}
                >
                  {plan.cta}
                </a>
              ) : (
                <Link
                  href="#"
                  aria-disabled
                  className={cn(
                    "mt-8 block rounded-md px-6 py-3 text-center font-semibold transition-colors",
                    plan.highlight
                      ? "bg-signal-600 text-white hover:bg-signal-700"
                      : "border border-ink-300 text-ink-700 hover:border-signal-500 hover:text-signal-600 dark:border-ink-600 dark:text-ink-200",
                  )}
                >
                  {plan.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 혜택 비교 표 */}
      <section className="container-page py-12">
        <h2 className="font-headline text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">
          혜택 한눈에 비교
        </h2>
        <div className="mt-6 overflow-x-auto rounded-xl border border-ink-200 dark:border-ink-800">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-50 dark:border-ink-800 dark:bg-ink-900/60">
                <th className="px-4 py-4 text-left font-semibold text-ink-900 dark:text-white">
                  혜택
                </th>
                <th className="px-4 py-4 text-center font-semibold text-ink-700 dark:text-ink-200">
                  무료 회원
                </th>
                <th className="px-4 py-4 text-center font-semibold text-signal-600">
                  디지털 멤버십
                </th>
                <th className="px-4 py-4 text-center font-semibold text-ink-700 dark:text-ink-200">
                  기업 후원
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row, i) => (
                <tr
                  key={row.label}
                  className={cn(
                    "border-b border-ink-200 last:border-0 dark:border-ink-800",
                    i % 2 === 1 && "bg-ink-50/50 dark:bg-ink-900/30",
                  )}
                >
                  <td className="px-4 py-3 text-ink-700 dark:text-ink-200">{row.label}</td>
                  {([row.free, row.member, row.supporter] as const).map((val, idx) => (
                    <td key={idx} className="px-4 py-3 text-center">
                      {typeof val === "string" ? (
                        <span className="text-ink-700 dark:text-ink-200">{val}</span>
                      ) : val ? (
                        <CheckIcon className="mx-auto h-4 w-4 text-signal-600 dark:text-signal-400" />
                      ) : (
                        <DashIcon className="mx-auto h-4 w-4 text-ink-300 dark:text-ink-600" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page pb-12">
        <h2 className="font-headline text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">
          자주 묻는 질문
        </h2>
        <div className="mt-6 divide-y divide-ink-200 rounded-xl border border-ink-200 dark:divide-ink-800 dark:border-ink-800">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group p-5 [&_summary]:list-none">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold text-ink-900 dark:text-white">
                <span>{faq.q}</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className="h-5 w-5 shrink-0 text-ink-400 transition-transform group-open:rotate-180"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 데모 안내 */}
      <section className="container-page pb-16">
        <p className="rounded-lg border border-ink-200 bg-ink-50 px-4 py-3 text-center text-sm text-ink-500 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-400">
          정식 오픈 준비 중으로 실제 결제·후원은 진행되지 않습니다. 표기 금액·혜택은
          예시입니다.
        </p>
      </section>
    </>
  );
}
