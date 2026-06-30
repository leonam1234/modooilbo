import type { Metadata } from "next";
import type { SVGProps } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ArrowRightIcon, ClockIcon } from "@/components/icons";
import { ApplyForm } from "./ApplyForm";

export const metadata: Metadata = {
  title: "인재채용",
  description:
    "모두일보와 함께 모두를 위한 신뢰의 뉴스를 만들 동료를 찾습니다. 기자·PD·데이터 저널리스트·개발자·마케터 채용 공고와 지원 안내.",
  alternates: { canonical: "/careers/" },
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

function CompassIcon(props: IconProps) {
  return (
    <svg {...baseStroke} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </svg>
  );
}
function ShieldIcon(props: IconProps) {
  return (
    <svg {...baseStroke} {...props}>
      <path d="M12 3 5 6v5c0 4 3 7 7 9 4-2 7-5 7-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function UsersIcon(props: IconProps) {
  return (
    <svg {...baseStroke} {...props}>
      <path d="M16 19a4 4 0 0 0-8 0" />
      <circle cx="12" cy="9" r="3" />
      <path d="M21 18a3.5 3.5 0 0 0-5-3.2M3 18a3.5 3.5 0 0 1 5-3.2" />
    </svg>
  );
}
function SparkIcon(props: IconProps) {
  return (
    <svg {...baseStroke} {...props}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="m6.5 6.5 2.5 2.5M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5" />
    </svg>
  );
}
function ClockBenefitIcon(props: IconProps) {
  return (
    <svg {...baseStroke} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function CameraIcon(props: IconProps) {
  return (
    <svg {...baseStroke} {...props}>
      <path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L19 6h0a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </svg>
  );
}
function BookIcon(props: IconProps) {
  return (
    <svg {...baseStroke} {...props}>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
      <path d="M4 5v14" />
    </svg>
  );
}
function PalmIcon(props: IconProps) {
  return (
    <svg {...baseStroke} {...props}>
      <path d="M3 20h18" />
      <path d="M12 20V9" />
      <path d="M12 9c0-3 2-5 5-5-1 3-3 5-5 5z" />
      <path d="M12 11c0-3-2-5-5-5 1 3 3 5 5 5z" />
    </svg>
  );
}
function HeartIcon(props: IconProps) {
  return (
    <svg {...baseStroke} {...props}>
      <path d="M12 20s-7-4.5-9-9a4.5 4.5 0 0 1 9-1.5A4.5 4.5 0 0 1 21 11c-2 4.5-9 9-9 9z" />
    </svg>
  );
}
function HomeIcon(props: IconProps) {
  return (
    <svg {...baseStroke} {...props}>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v9h12v-9" />
    </svg>
  );
}
function CalendarIcon(props: IconProps) {
  return (
    <svg {...baseStroke} {...props}>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 9h16M8 3v4M16 3v4" />
    </svg>
  );
}
function BriefcaseIcon(props: IconProps) {
  return (
    <svg {...baseStroke} {...props}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
    </svg>
  );
}

const TALENTS = [
  {
    icon: CompassIcon,
    title: "사실에 집요한 사람",
    body: "한 줄을 쓰기 위해 열 번 확인합니다. 추측이 아닌 검증된 사실로 독자의 신뢰를 얻는 사람을 찾습니다.",
  },
  {
    icon: ShieldIcon,
    title: "공정함을 지키는 사람",
    body: "어떤 압력에도 흔들리지 않고 균형을 지킵니다. 권력과 자본으로부터 독립된 시선을 견지합니다.",
  },
  {
    icon: UsersIcon,
    title: "독자를 향하는 사람",
    body: "기사는 결국 사람을 위한 것입니다. 독자가 무엇을 궁금해하고 필요로 하는지 먼저 생각합니다.",
  },
  {
    icon: SparkIcon,
    title: "새로움을 두려워하지 않는 사람",
    body: "데이터, 영상, 인터랙티브 — 더 잘 전달하는 방법이 있다면 기꺼이 배우고 시도합니다.",
  },
];

const BENEFITS = [
  {
    icon: ClockBenefitIcon,
    title: "자율 출퇴근",
    body: "코어타임 외에는 스스로 시간을 설계합니다. 취재 일정에 맞춰 유연하게 일합니다.",
  },
  {
    icon: CameraIcon,
    title: "취재 지원",
    body: "출장비·장비·자료 구입까지, 좋은 기사를 위한 비용은 회사가 책임집니다.",
  },
  {
    icon: BookIcon,
    title: "교육비 지원",
    body: "연 200만 원 한도의 교육·도서·콘퍼런스 비용을 지원해 성장을 돕습니다.",
  },
  {
    icon: PalmIcon,
    title: "안식월",
    body: "3년 근속마다 한 달의 유급 안식월. 충분히 멈추고 다시 멀리 나아갑니다.",
  },
  {
    icon: HeartIcon,
    title: "건강·심리 케어",
    body: "종합 건강검진과 전문 심리 상담을 지원해 몸과 마음을 함께 챙깁니다.",
  },
  {
    icon: HomeIcon,
    title: "하이브리드 근무",
    body: "주 2일 재택을 기본으로, 집중이 필요한 마감에는 원격 근무를 자유롭게 활용합니다.",
  },
];

const POSITIONS = [
  {
    role: "정치부 기자",
    dept: "편집국 정치부",
    type: "정규직 · 경력",
    deadline: "2026.06.30",
    desc: "국회·정당·정책을 깊이 있게 취재하고, 정치 현상의 맥락과 본질을 분석합니다.",
  },
  {
    role: "경제부 기자",
    dept: "편집국 경제부",
    type: "정규직 · 경력",
    deadline: "2026.06.30",
    desc: "거시경제·산업·자본시장을 취재하며 복잡한 경제 이슈를 명료하게 풀어냅니다.",
  },
  {
    role: "디지털 뉴스 PD",
    dept: "디지털콘텐츠국",
    type: "정규직 · 경력/신입",
    deadline: "2026.07.10",
    desc: "영상·숏폼·라이브 등 디지털 포맷으로 뉴스를 기획하고 제작합니다.",
  },
  {
    role: "데이터 저널리스트",
    dept: "디지털콘텐츠국 데이터팀",
    type: "정규직 · 경력",
    deadline: "2026.07.10",
    desc: "데이터 수집·분석·시각화로 숨은 사실을 발굴하고 인터랙티브 기사를 만듭니다.",
  },
  {
    role: "프론트엔드 개발자",
    dept: "프로덕트개발팀",
    type: "정규직 · 경력",
    deadline: "2026.07.20",
    desc: "Next.js 기반 뉴스 플랫폼을 개발하며 빠르고 접근성 높은 독자 경험을 만듭니다.",
  },
  {
    role: "그로스 마케터",
    dept: "마케팅팀",
    type: "정규직 · 경력",
    deadline: "2026.07.20",
    desc: "구독·유입·리텐션 전략을 설계하고 데이터 기반 실험으로 성장을 견인합니다.",
  },
];

const PROCESS = [
  { step: "01", title: "서류 전형", body: "지원서와 포트폴리오를 검토합니다." },
  { step: "02", title: "실무 과제", body: "직무별 과제로 실제 역량을 확인합니다." },
  { step: "03", title: "심층 면접", body: "동료·리더와 두 차례 인터뷰를 진행합니다." },
  { step: "04", title: "처우 협의", body: "연봉과 근무 조건을 투명하게 논의합니다." },
  { step: "05", title: "입사", body: "온보딩과 함께 새로운 시작을 환영합니다." },
];

const cardCls =
  "rounded-xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900";

export default function CareersPage() {
  return (
    <>
      <PageHeader
        title="인재채용"
        subtitle="신호를 찾는 사람들과 함께합니다"
        breadcrumb={[{ label: "인재채용" }]}
      />

      {/* 인트로 */}
      <section className="container-page py-10 sm:py-12">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-signal-600">
            Why Modoo Ilbo
          </p>
          <h2 className="mt-2 font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
            우리는 노이즈가 아니라 신호를 만듭니다
          </h2>
          <div className="mt-5 space-y-4 text-lg leading-relaxed text-ink-600 dark:text-ink-300">
            <p>
              매일 쏟아지는 정보 속에서 무엇이 진짜 중요한지 가려내는 일. 모두일보는 속도
              경쟁이 아니라 신뢰 경쟁에서 이기는 언론을 지향합니다. 우리는 클릭이 아니라
              독자의 시간을 존중하는 저널리즘을 만듭니다.
            </p>
            <p>
              그래서 함께 일하는 사람을 가장 중요하게 생각합니다. 기자와 PD, 데이터
              저널리스트, 엔지니어, 마케터가 한 팀으로 모여 취재부터 전달까지 경계 없이
              협업합니다. 직급보다 질문이, 연차보다 근거가 존중받는 수평적인 문화 속에서
              각자의 전문성이 빛납니다.
            </p>
            <p>
              저널리즘의 본질을 지키면서도 가장 현대적인 방식으로 뉴스를 전하고 싶은 분이라면,
              지금 모두일보의 문을 두드려 주세요. 당신이 찾던 신호가 여기 있을지 모릅니다.
            </p>
          </div>
        </div>
      </section>

      {/* 인재상 */}
      <section className="border-y border-ink-200 bg-ink-50 dark:border-ink-800 dark:bg-ink-900/40">
        <div className="container-page py-10 sm:py-12">
          <h2 className="font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
            우리가 찾는 사람
          </h2>
          <p className="mt-2 max-w-2xl text-ink-500 dark:text-ink-300">
            모두일보의 동료라면 함께 지키고 싶은 네 가지 태도입니다.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TALENTS.map((t) => (
              <div key={t.title} className={cardCls}>
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-signal-50 text-signal-600 dark:bg-signal-950/50 dark:text-signal-400">
                  <t.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-headline text-lg font-bold text-ink-900 dark:text-white">
                  {t.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                  {t.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 복지·문화 */}
      <section className="container-page py-10 sm:py-12">
        <h2 className="font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
          복지와 일하는 문화
        </h2>
        <p className="mt-2 max-w-2xl text-ink-500 dark:text-ink-300">
          좋은 저널리즘은 건강한 일상에서 나옵니다. 일에 몰입할 수 있도록 든든하게
          지원합니다.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-signal-50 text-signal-600 dark:bg-signal-950/50 dark:text-signal-400">
                <b.icon className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-semibold text-ink-900 dark:text-white">{b.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                  {b.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 채용 공고 */}
      <section className="border-y border-ink-200 bg-ink-50 dark:border-ink-800 dark:bg-ink-900/40">
        <div className="container-page py-10 sm:py-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
                채용 공고
              </h2>
              <p className="mt-2 text-ink-500 dark:text-ink-300">
                현재 {POSITIONS.length}개 포지션에서 새로운 동료를 모집합니다.
              </p>
            </div>
            <a
              href="#apply"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-signal-600 hover:text-signal-700"
            >
              바로 지원하기
              <ArrowRightIcon className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {POSITIONS.map((p) => (
              <div
                key={p.role}
                className="flex flex-col rounded-xl border border-ink-200 bg-white p-6 transition-colors hover:border-signal-300 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-signal-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-headline text-xl font-bold text-ink-900 dark:text-white">
                      {p.role}
                    </h3>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink-500 dark:text-ink-300">
                      <BriefcaseIcon className="h-4 w-4" />
                      {p.dept}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-signal-50 px-3 py-1 text-xs font-semibold text-signal-700 dark:bg-signal-950/50 dark:text-signal-400">
                    {p.type}
                  </span>
                </div>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                  {p.desc}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-4 dark:border-ink-800">
                  <span className="inline-flex items-center gap-1.5 text-sm text-ink-500 dark:text-ink-400">
                    <CalendarIcon className="h-4 w-4" />
                    마감 {p.deadline}
                  </span>
                  <a
                    href="#apply"
                    className="inline-flex items-center gap-1 rounded-md bg-signal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-signal-700"
                  >
                    지원하기
                    <ArrowRightIcon className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 채용 절차 */}
      <section className="container-page py-10 sm:py-12">
        <h2 className="font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
          채용 절차
        </h2>
        <p className="mt-2 max-w-2xl text-ink-500 dark:text-ink-300">
          지원부터 입사까지 평균 3~4주가 소요됩니다. 각 단계마다 결과를 안내해 드립니다.
        </p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PROCESS.map((s, i) => (
            <li key={s.step} className="relative">
              <div className="h-full rounded-xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
                <span className="font-headline text-2xl font-extrabold text-signal-600">
                  {s.step}
                </span>
                <h3 className="mt-2 font-semibold text-ink-900 dark:text-white">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                  {s.body}
                </p>
              </div>
              {i < PROCESS.length - 1 && (
                <ChevronRightIcon
                  className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 text-ink-300 lg:block dark:text-ink-700"
                  aria-hidden
                />
              )}
            </li>
          ))}
        </ol>
        <p className="mt-6 inline-flex items-center gap-1.5 text-sm text-ink-400">
          <ClockIcon className="h-4 w-4" />
          전형 일정은 지원자 사정에 맞춰 조정될 수 있습니다.
        </p>
      </section>

      {/* 지원 폼 */}
      <section
        id="apply"
        className="scroll-mt-24 border-t border-ink-200 bg-ink-50 dark:border-ink-800 dark:bg-ink-900/40"
      >
        <div className="container-page py-10 sm:py-12">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <h2 className="font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
                지원하기
              </h2>
              <p className="mt-2 text-ink-500 dark:text-ink-300">
                아래 양식을 작성해 주세요. 여러 직무에 관심이 있다면 가장 우선하는 분야로
                지원해 주시면 됩니다.
              </p>
            </div>
            <div className="mt-8">
              <ApplyForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function ChevronRightIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
