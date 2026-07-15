import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { MailIcon } from "@/components/icons";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "고객센터",
  description:
    "모두일보 부서별 연락처와 자주 묻는 질문, 온라인 문의 양식을 안내합니다. 구독·광고·제보 등 무엇이든 문의해 주세요.",
  alternates: { canonical: "/contact/" },
};

const DEPARTMENTS: { name: string; desc: string; email: string; phone: string }[] = [
  {
    name: "편집국",
    desc: "보도 내용 및 기사 관련 문의",
    email: "newsroom@modooilbo.com",
    phone: "02-1234-5601",
  },
  {
    name: "광고·제휴",
    desc: "광고 집행, 콘텐츠 제휴 제안",
    email: "ad@modooilbo.com",
    phone: "02-1234-5620",
  },
  {
    name: "구독·후원",
    desc: "유료 구독, 멤버십, 결제 문의",
    email: "members@modooilbo.com",
    phone: "02-1234-5630",
  },
  {
    name: "제보",
    desc: "단독·탐사 보도를 위한 취재 제보",
    email: "tip@modooilbo.com",
    phone: "02-1234-5640",
  },
  {
    name: "일반문의",
    desc: "그 밖의 모든 문의 및 의견",
    email: "help@modooilbo.com",
    phone: "02-1234-5678",
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "유료 구독은 어떻게 신청하나요?",
    a: "홈페이지 우측 상단의 ‘구독’ 버튼을 통해 멤버십을 신청할 수 있습니다. 월간·연간 요금제를 제공하며, 결제일로부터 모든 프리미엄 기사를 제한 없이 보실 수 있습니다.",
  },
  {
    q: "구독 해지와 환불은 가능한가요?",
    a: "언제든 마이페이지에서 자동 갱신을 해지할 수 있습니다. 결제 후 7일 이내, 콘텐츠를 이용하지 않은 경우 전액 환불해 드리며 자세한 사항은 구독·후원 부서로 문의해 주세요.",
  },
  {
    q: "기사에 오류를 발견했습니다. 어떻게 알리나요?",
    a: "정정 요청은 correction@modooilbo.com 또는 아래 문의 양식(유형: 기타)으로 접수해 주세요. 편집위원회 검토 후 신속히 정정하고 그 내용을 기사에 밝힙니다.",
  },
  {
    q: "제보한 내용은 안전하게 보호되나요?",
    a: "제보자의 신원은 철저히 보호되며, 본인이 동의하지 않는 한 외부에 공개되지 않습니다. 민감한 제보는 제보 전용 채널(tip@modooilbo.com)을 이용해 주세요.",
  },
  {
    q: "기사를 다른 매체에 인용해도 되나요?",
    a: "출처(모두일보)와 원문 링크를 명확히 표기하는 범위에서 인용이 가능합니다. 전문 전재나 상업적 활용은 광고·제휴 부서와 사전 협의가 필요합니다.",
  },
  {
    q: "답변은 얼마나 걸리나요?",
    a: "접수된 문의는 영업일 기준 1~2일 이내에 담당 부서에서 입력하신 이메일로 답변드립니다. 문의가 많을 경우 다소 지연될 수 있는 점 양해 부탁드립니다.",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        title="고객센터"
        subtitle="궁금한 점이나 전하고 싶은 의견이 있으신가요? 부서별 연락처와 자주 묻는 질문을 확인하시고, 아래 양식으로 문의해 주세요."
        breadcrumb={[{ label: "고객센터" }]}
      />

      {/* 부서별 연락처 */}
      <section className="container-page py-12">
        <h2 className="font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
          부서별 연락처
        </h2>
        <p className="mt-2 max-w-2xl text-ink-500 dark:text-ink-300">
          용건에 맞는 부서로 연락하시면 더 빠르게 안내받으실 수 있습니다.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DEPARTMENTS.map((d) => (
            <div
              key={d.name}
              className="rounded-xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900"
            >
              <h3 className="text-lg font-bold text-ink-900 dark:text-white">{d.name}</h3>
              <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{d.desc}</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <dt className="sr-only">이메일</dt>
                  <MailIcon className="h-4 w-4 shrink-0 text-ink-500 dark:text-ink-400" />
                  <dd>
                    <a
                      href={`mailto:${d.email}`}
                      className="font-medium text-signal-600 hover:text-signal-700 dark:text-signal-400"
                    >
                      {d.email}
                    </a>
                  </dd>
                </div>
                <div className="flex items-center gap-2 text-ink-600 dark:text-ink-300">
                  <dt className="sr-only">전화</dt>
                  <span aria-hidden className="w-4 shrink-0 text-center text-ink-500 dark:text-ink-400">
                    ☎
                  </span>
                  <dd>{d.phone}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-ink-500 dark:text-ink-400">
          운영시간 평일 09:00~18:00 (점심 12:00~13:00 · 주말 및 공휴일 휴무)
        </p>
      </section>

      {/* 자주 묻는 질문 */}
      <section className="border-t border-ink-200 bg-ink-50 py-12 dark:border-ink-800 dark:bg-ink-900/40">
        <div className="container-page">
          <h2 className="font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
            자주 묻는 질문
          </h2>
          <p className="mt-2 max-w-2xl text-ink-500 dark:text-ink-300">
            문의 전에 아래 내용을 먼저 확인해 보세요.
          </p>
          <div className="mt-8 space-y-4">
            {FAQ.map((f, i) => (
              <details
                key={i}
                className="group rounded-xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink-900 dark:text-white">
                  <span>
                    <span className="mr-2 font-headline text-signal-600 dark:text-signal-400">Q.</span>
                    {f.q}
                  </span>
                  <span
                    aria-hidden
                    className="shrink-0 text-ink-500 dark:text-ink-400 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 문의 폼 */}
      <section className="container-page py-12">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
            문의하기
          </h2>
          <p className="mt-2 text-ink-500 dark:text-ink-300">
            아래 양식을 작성해 주시면 담당 부서에서 확인 후 이메일로 답변드립니다.
          </p>
          <div className="mt-8">
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
