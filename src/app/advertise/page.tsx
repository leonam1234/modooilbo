import type { Metadata } from "next";
import type { SVGProps } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ArrowRightIcon } from "@/components/icons";
import { AdInquiryForm } from "./AdInquiryForm";

export const metadata: Metadata = {
  title: "광고·제휴",
  description:
    "월 순방문자 1,200만, 페이지뷰 4,800만의 신뢰받는 매체 모두일보와 함께하세요. 디스플레이·네이티브·뉴스레터·브랜디드 콘텐츠 광고 및 콘텐츠·API 제휴 안내.",
  alternates: { canonical: "/advertise/" },
};

type IconProps = SVGProps<SVGSVGElement>;

const baseStroke = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function BannerIcon(props: IconProps) {
  return (
    <svg {...baseStroke} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 14h6" />
    </svg>
  );
}
function NativeIcon(props: IconProps) {
  return (
    <svg {...baseStroke} {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h5M8 13h8M8 17h8" />
      <circle cx="16" cy="9" r="1.4" />
    </svg>
  );
}
function NewsletterIcon(props: IconProps) {
  return (
    <svg {...baseStroke} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 8 9 5 9-5" />
    </svg>
  );
}
function ContentIcon(props: IconProps) {
  return (
    <svg {...baseStroke} {...props}>
      <path d="M4 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M14 3v5h5M8 13h8M8 17h5" />
    </svg>
  );
}
function HandshakeIcon(props: IconProps) {
  return (
    <svg {...baseStroke} {...props}>
      <path d="m11 17 2 2a1 1 0 0 0 1.5-.1l3-3.5" />
      <path d="M3 11 8 6l4 3 3-3 6 5" />
      <path d="M3 11l4 4M21 11l-4 4" />
    </svg>
  );
}
function PlugIcon(props: IconProps) {
  return (
    <svg {...baseStroke} {...props}>
      <path d="M9 3v5M15 3v5" />
      <path d="M7 8h10v3a5 5 0 0 1-10 0z" />
      <path d="M12 16v5" />
    </svg>
  );
}
function EventIcon(props: IconProps) {
  return (
    <svg {...baseStroke} {...props}>
      <path d="M12 3 3 8l9 5 9-5z" />
      <path d="M7 10.5V15c0 1.5 2.5 3 5 3s5-1.5 5-3v-4.5" />
    </svg>
  );
}

const METRICS = [
  { value: "1,200만", label: "월간 순방문자(UV)", note: "국내 종합 뉴스 매체 상위권" },
  { value: "4,800만", label: "월간 페이지뷰(PV)", note: "1인당 평균 4회 이상 열람" },
  { value: "38만", label: "뉴스레터 구독자", note: "평균 오픈율 42%" },
  { value: "6분 30초", label: "평균 체류 시간", note: "심층 기사 중심의 높은 몰입도" },
];

const PRODUCTS = [
  {
    icon: BannerIcon,
    title: "디스플레이 배너",
    body: "메인·기사·섹션 지면의 프리미엄 배너로 강력한 브랜드 노출을 확보합니다. PC·모바일 반응형 지원.",
    formats: ["빌보드 / 탑 배너", "사이드 / 인아티클", "타깃팅 · 빈도 제어"],
  },
  {
    icon: NativeIcon,
    title: "네이티브 광고",
    body: "기사 피드에 자연스럽게 녹아드는 광고 포맷으로 거부감 없이 높은 클릭률을 만듭니다.",
    formats: ["피드형 네이티브", "추천 위젯", "성과형 과금 옵션"],
  },
  {
    icon: NewsletterIcon,
    title: "뉴스레터 스폰서십",
    body: "38만 구독자의 받은 편지함에 단독 노출. 충성도 높은 독자에게 메시지를 직접 전합니다.",
    formats: ["전용 스폰서 슬롯", "단독 발송(솔로) 옵션", "성과 리포트 제공"],
  },
  {
    icon: ContentIcon,
    title: "브랜디드 콘텐츠",
    body: "에디터팀이 직접 기획·제작하는 스폰서드 콘텐츠로 브랜드 스토리를 깊이 있게 전달합니다.",
    formats: ["인터랙티브 기사", "영상 · 숏폼 제작", "확산 패키지 포함"],
  },
];

const PARTNERSHIPS = [
  {
    icon: HandshakeIcon,
    title: "콘텐츠 제휴",
    body: "기사·영상·데이터의 상호 게재 및 공동 기획. 양사 독자 모두에게 가치를 더합니다.",
  },
  {
    icon: PlugIcon,
    title: "API · 신디케이션",
    body: "콘텐츠 피드 API와 신디케이션으로 모두일보의 기사를 귀사 서비스에 안정적으로 공급합니다.",
  },
  {
    icon: EventIcon,
    title: "이벤트 공동주최",
    body: "포럼·콘퍼런스·시상식을 함께 기획하고 운영하며 브랜드 영향력을 확장합니다.",
  },
];

const PROCESS = [
  { step: "01", title: "문의 접수", body: "아래 양식으로 광고·제휴 의향을 보내 주세요." },
  { step: "02", title: "상담 · 제안", body: "담당 매니저가 목표에 맞는 맞춤 제안서를 드립니다." },
  { step: "03", title: "계약 체결", body: "상품·일정·단가를 확정하고 계약을 진행합니다." },
  { step: "04", title: "집행 · 리포트", body: "캠페인을 집행하고 성과 리포트를 공유합니다." },
];

const cardCls =
  "rounded-xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900";

export default function AdvertisePage() {
  return (
    <>
      <PageHeader
        title="광고·제휴"
        subtitle="신뢰받는 매체에서, 브랜드의 신호를 가장 또렷하게 전하세요"
        breadcrumb={[{ label: "광고·제휴" }]}
      />

      {/* 매체 소개 + 도달 지표 */}
      <section className="container-page py-10 sm:py-12">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-signal-600">
            Media Kit
          </p>
          <h2 className="mt-2 font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
            품질이 곧 도달입니다
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-600 dark:text-ink-300">
            모두일보는 정치·경제·사회·국제·문화·테크 전 분야에서 깊이 있는 저널리즘을
            선보이는 종합 뉴스 매체입니다. 신뢰를 우선하는 콘텐츠는 구매력과 의사결정권을 가진
            독자층을 모으고, 그만큼 브랜드 메시지의 영향력도 커집니다.
          </p>
        </div>

        <dl className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {METRICS.map((m) => (
            <div key={m.label} className={cardCls}>
              <dt className="text-sm font-medium text-ink-500 dark:text-ink-300">{m.label}</dt>
              <dd className="mt-2 font-headline text-3xl font-extrabold text-signal-600">
                {m.value}
              </dd>
              <p className="mt-2 text-xs text-ink-400">{m.note}</p>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-ink-400">
          ※ 상기 수치는 예시이며, 실제 집행 시점의 매체 자료를 별도로
          제공해 드립니다.
        </p>
      </section>

      {/* 광고 상품 */}
      <section className="border-y border-ink-200 bg-ink-50 dark:border-ink-800 dark:bg-ink-900/40">
        <div className="container-page py-10 sm:py-12">
          <h2 className="font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
            광고 상품
          </h2>
          <p className="mt-2 max-w-2xl text-ink-500 dark:text-ink-300">
            캠페인 목표에 맞춰 단일 상품부터 통합 패키지까지 유연하게 구성해 드립니다.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {PRODUCTS.map((p) => (
              <div key={p.title} className="flex flex-col rounded-xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-signal-50 text-signal-600 dark:bg-signal-950/50 dark:text-signal-400">
                    <p.icon className="h-6 w-6" />
                  </span>
                  <h3 className="font-headline text-xl font-bold text-ink-900 dark:text-white">
                    {p.title}
                  </h3>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                  {p.body}
                </p>
                <ul className="mt-4 flex flex-1 flex-col gap-2">
                  {p.formats.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal-500" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-4 dark:border-ink-800">
                  <span className="text-sm text-ink-500 dark:text-ink-400">
                    단가{" "}
                    <span className="font-semibold text-ink-900 dark:text-white">문의</span>
                  </span>
                  <a
                    href="#inquiry"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-signal-600 hover:text-signal-700"
                  >
                    상담 요청
                    <ArrowRightIcon className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 제휴 유형 */}
      <section className="container-page py-10 sm:py-12">
        <h2 className="font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
          제휴 유형
        </h2>
        <p className="mt-2 max-w-2xl text-ink-500 dark:text-ink-300">
          광고를 넘어 장기적인 파트너십으로 함께 성장할 방법을 제안합니다.
        </p>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {PARTNERSHIPS.map((p) => (
            <div key={p.title} className={cardCls}>
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-signal-50 text-signal-600 dark:bg-signal-950/50 dark:text-signal-400">
                <p.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-headline text-lg font-bold text-ink-900 dark:text-white">
                {p.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 진행 절차 */}
      <section className="border-y border-ink-200 bg-ink-50 dark:border-ink-800 dark:bg-ink-900/40">
        <div className="container-page py-10 sm:py-12">
          <h2 className="font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
            진행 절차
          </h2>
          <p className="mt-2 max-w-2xl text-ink-500 dark:text-ink-300">
            문의부터 집행까지, 전담 매니저가 처음부터 끝까지 함께합니다.
          </p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map((s) => (
              <li
                key={s.step}
                className="rounded-xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900"
              >
                <span className="font-headline text-2xl font-extrabold text-signal-600">
                  {s.step}
                </span>
                <h3 className="mt-2 font-semibold text-ink-900 dark:text-white">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 문의 폼 */}
      <section id="inquiry" className="scroll-mt-24">
        <div className="container-page py-10 sm:py-12">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <h2 className="font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
                광고·제휴 문의
              </h2>
              <p className="mt-2 text-ink-500 dark:text-ink-300">
                아래 양식을 남겨 주시면 담당 매니저가 영업일 기준 2일 이내에 회신드립니다.
              </p>
            </div>
            <div className="mt-8">
              <AdInquiryForm />
            </div>
            <p className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">
              빠른 상담이 필요하신가요? 광고·제휴 문의{" "}
              <a
                href="mailto:ad@modooilbo.com"
                className="font-semibold text-signal-600 hover:text-signal-700"
              >
                ad@modooilbo.com
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
