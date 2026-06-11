import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { TipForm } from "./TipForm";

export const metadata: Metadata = {
  title: "제보하기",
  description:
    "당신의 제보가 세상을 바꿉니다. 시그널저널은 제보자의 신원을 철저히 보호하며, 모든 제보를 신중하게 검증해 보도로 이어갑니다.",
};

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

const STEPS: { step: string; title: string; desc: string }[] = [
  {
    step: "01",
    title: "접수",
    desc: "제보가 도착하면 담당 데스크가 24시간 이내에 내용을 확인하고 접수 여부를 검토합니다.",
  },
  {
    step: "02",
    title: "검증",
    desc: "취재팀이 사실관계를 교차 확인하고 추가 자료를 수집합니다. 필요 시 제보자께 보안 채널로 연락드립니다.",
  },
  {
    step: "03",
    title: "보도",
    desc: "검증을 통과한 사안은 기사로 작성되어 데스크 감수를 거쳐 보도됩니다. 제보자의 신원은 끝까지 보호됩니다.",
  },
];

export default function TipsPage() {
  return (
    <>
      <PageHeader
        title="제보하기"
        subtitle="당신의 제보가 세상을 바꿉니다"
        breadcrumb={[{ label: "제보하기" }]}
      />

      {/* 안내 */}
      <section className="container-page py-10 sm:py-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
          <div className="space-y-4 leading-relaxed text-ink-600 dark:text-ink-300">
            <p>
              권력의 부조리, 우리 사회가 놓치고 있는 진실, 누군가는 반드시 알아야 할 사실. 작은
              제보 하나가 큰 변화의 출발점이 됩니다. 시그널저널의 기자들은 여러분이 보내주신 단서를
              끝까지 추적해 보도로 완성합니다.
            </p>
            <p>
              모든 제보는 데스크의 검토와 취재팀의 교차 검증을 거칩니다. 확인되지 않은 내용을 그대로
              보도하지 않으며, 제보의 공익성과 사실관계를 신중히 따져 기사화 여부를 결정합니다.
              제보가 곧바로 기사가 되지 않더라도, 모든 단서는 후속 취재의 소중한 밑거름이 됩니다.
            </p>
            <p>
              무엇보다 제보자의 안전을 최우선으로 합니다. 시그널저널은 취재원 보호를 언론 윤리의
              근간으로 삼으며, 어떤 경우에도 제보자의 신원과 제보 사실을 외부에 밝히지 않습니다.
            </p>

            {/* 강조 박스 — 제보자 보호 원칙 */}
            <div className="!mt-6 rounded-xl border border-signal-200 bg-signal-50 p-6 dark:border-signal-900 dark:bg-signal-950/30">
              <div className="flex items-center gap-2.5">
                <ShieldIcon className="h-5 w-5 shrink-0 text-signal-600 dark:text-signal-400" />
                <h2 className="font-headline text-lg font-bold text-ink-900 dark:text-white">
                  제보자 보호 원칙
                </h2>
              </div>
              <ul className="mt-4 space-y-2.5 text-sm text-ink-700 dark:text-ink-200">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-600 dark:bg-signal-400" />
                  <span>
                    <strong className="font-semibold">익명 보장</strong> — 익명 제보를 선택하시면
                    연락처를 받지 않으며, 신원을 특정할 수 있는 어떤 정보도 요구하지 않습니다.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-600 dark:bg-signal-400" />
                  <span>
                    <strong className="font-semibold">취재원 비공개</strong> — 제보자의 동의 없이는
                    수사기관을 포함한 누구에게도 신원을 공개하지 않습니다.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-600 dark:bg-signal-400" />
                  <span>
                    <strong className="font-semibold">최소 수집·안전 보관</strong> — 보도에 필요한
                    정보만 받고, 제보 자료는 접근이 제한된 환경에서 안전하게 관리합니다.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* 절차 */}
          <aside>
            <h2 className="font-headline text-lg font-bold text-ink-900 dark:text-white">
              제보가 보도가 되기까지
            </h2>
            <ol className="mt-4 space-y-4">
              {STEPS.map((s) => (
                <li
                  key={s.step}
                  className="flex gap-4 rounded-xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900"
                >
                  <span className="font-headline text-2xl font-extrabold text-signal-600/70 dark:text-signal-400/70">
                    {s.step}
                  </span>
                  <div>
                    <h3 className="font-semibold text-ink-900 dark:text-white">{s.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-500 dark:text-ink-300">
                      {s.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>

      {/* 제보 폼 */}
      <section className="border-t border-ink-200 bg-ink-50 py-12 dark:border-ink-800 dark:bg-ink-900/40">
        <div className="container-page">
          <div className="mx-auto max-w-2xl">
            <h2 className="font-headline text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">
              제보 접수
            </h2>
            <p className="mt-2 text-ink-500 dark:text-ink-300">
              아래 양식을 작성해 주세요. 자세한 내용일수록 빠르고 정확한 취재에 도움이 됩니다.
            </p>
            <div className="mt-6">
              <TipForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
