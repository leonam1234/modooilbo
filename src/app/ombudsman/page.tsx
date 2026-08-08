import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "고충처리인 제도",
  description:
    "모두일보 고충처리인의 역할과 접수 방법, 처리 절차를 안내합니다. 보도로 인한 피해나 불만을 접수해 처리합니다.",
  alternates: { canonical: "/ombudsman/" },
};

const STEPS: { step: string; title: string; body: string }[] = [
  {
    step: "1",
    title: "접수",
    body: "이메일 또는 대표전화로 접수합니다. 어떤 기사의 어느 대목인지, 무엇이 사실과 다른지 적어주시면 확인이 빨라집니다. 기사 주소를 함께 보내주시면 가장 좋습니다.",
  },
  {
    step: "2",
    title: "확인",
    body: "고충처리인이 취재 기록과 원출처를 다시 확인합니다. 필요하면 담당 기자와 편집국에 자료 제출을 요구합니다.",
  },
  {
    step: "3",
    title: "회신",
    body: "접수일부터 7일 이내에 처리 결과 또는 처리 계획을 알려드립니다. 확인에 시간이 더 필요하면 그 사유와 예상 시점을 먼저 회신합니다.",
  },
  {
    step: "4",
    title: "조치와 공개",
    body: "오류가 확인되면 기사를 바로잡고 정정 사실을 기사에 남깁니다. 그 내역은 정정·반론 보도 모음에 공개하며 삭제하지 않습니다.",
  },
];

export default function OmbudsmanPage() {
  return (
    <>
      <PageHeader
        title="고충처리인 제도"
        subtitle="보도로 인한 피해나 불만을 접수해 처리합니다. 무엇을 어떻게 바로잡았는지 기록으로 남깁니다."
        breadcrumb={[{ label: "고충처리인 제도" }]}
      />

      <div className="container-page py-12">
        <article className="max-w-3xl">
          {/* 담당자·연락처 — 가장 먼저 필요한 정보라 맨 위에 둔다 */}
          <div className="rounded-xl border border-ink-200 bg-ink-50 p-6 dark:border-ink-800 dark:bg-ink-900/40">
            <dl className="space-y-2.5 text-sm">
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <dt className="w-24 shrink-0 font-semibold text-ink-500 dark:text-ink-400">고충처리인</dt>
                <dd className="text-ink-700 dark:text-ink-200">{SITE.ombudsman}</dd>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <dt className="w-24 shrink-0 font-semibold text-ink-500 dark:text-ink-400">이메일</dt>
                <dd className="break-all text-ink-700 dark:text-ink-200">
                  <a
                    href={`mailto:${SITE.email}?subject=%5B%EA%B3%A0%EC%B6%A9%EC%B2%98%EB%A6%AC%5D%20`}
                    className="font-medium text-signal-600 hover:text-signal-700 dark:text-signal-400"
                  >
                    {SITE.email}
                  </a>
                </dd>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <dt className="w-24 shrink-0 font-semibold text-ink-500 dark:text-ink-400">대표전화</dt>
                <dd className="text-ink-700 dark:text-ink-200">
                  <a href={`tel:${SITE.tel.replace(/-/g, "")}`} className="font-medium text-signal-600 hover:text-signal-700 dark:text-signal-400">
                    {SITE.tel}
                  </a>
                </dd>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <dt className="w-24 shrink-0 font-semibold text-ink-500 dark:text-ink-400">주소</dt>
                <dd className="text-ink-700 dark:text-ink-200">{SITE.address}</dd>
              </div>
            </dl>
          </div>

          <h2 className="mt-12 font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
            무엇을 하는가
          </h2>
          <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
            고충처리인은 모두일보의 보도로 권익이 침해됐다는 의견을 접수해 사실을 확인하고, 필요한
            경우 편집국에 시정을 권고합니다. 「언론중재 및 피해구제 등에 관한 법률」이 정한 고충처리인
            직무를 따르며, 편집국의 지휘를 받지 않고 독립적으로 판단합니다.
          </p>
          <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
            같은 법은 일간신문·방송·뉴스통신 사업자에게 고충처리인 설치를 의무로 정하고 있고
            인터넷신문은 그 대상이 아닙니다. 모두일보는 의무가 없음에도 자발적으로 이 제도를 둡니다.
          </p>

          <h2 className="mt-12 font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
            처리 절차
          </h2>
          {/* 표 대신 카드 — 좁은 화면에서 표는 가로 스크롤을 만든다 */}
          <ol className="mt-4 space-y-3">
            {STEPS.map((s) => (
              <li
                key={s.step}
                className="rounded-xl border border-ink-200 bg-ink-50 p-5 dark:border-ink-800 dark:bg-ink-900/40"
              >
                <p className="flex items-baseline gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-signal-600 text-xs font-bold text-white">
                    {s.step}
                  </span>
                  <span className="font-bold text-ink-900 dark:text-white">{s.title}</span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">{s.body}</p>
              </li>
            ))}
          </ol>

          <h2 className="mt-12 font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
            함께 보기
          </h2>
          <ul className="mt-3 space-y-2 leading-relaxed text-ink-600 dark:text-ink-300">
            <li>
              <Link href="/corrections" className="font-medium text-signal-600 hover:text-signal-700 dark:text-signal-400">
                정정·반론 보도 모음
              </Link>{" "}
              — 지금까지 바로잡은 기록
            </li>
            <li>
              <Link href="/committee" className="font-medium text-signal-600 hover:text-signal-700 dark:text-signal-400">
                이용자위원회
              </Link>{" "}
              — 보도 전반을 정기적으로 검토하는 자문기구
            </li>
            <li>
              <Link href="/ethics#correction" className="font-medium text-signal-600 hover:text-signal-700 dark:text-signal-400">
                정정·반론 보도 원칙
              </Link>{" "}
              — 판단 기준 전문
            </li>
          </ul>

          <p className="mt-12 border-t border-ink-200 pt-6 text-sm leading-relaxed text-ink-500 dark:border-ink-800 dark:text-ink-400">
            언론중재위원회 조정·중재 신청 등 법적 구제 절차는 고충처리인 접수와 별개로 진행할 수
            있습니다. 고충처리인에게 접수했다는 이유로 다른 권리가 제한되지 않습니다.
          </p>
        </article>
      </div>
    </>
  );
}
