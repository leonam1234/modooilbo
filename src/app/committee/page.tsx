import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SITE } from "@/lib/site";
import { COMMITTEE_MEMBERS, COMMITTEE_MINUTES } from "@/lib/committee";

export const metadata: Metadata = {
  title: "이용자위원회",
  description:
    "모두일보 이용자위원회의 운영규칙과 구성, 회의 기록을 공개합니다. 독자의 의견을 정기적으로 듣고 무엇을 고쳤는지 남깁니다.",
  alternates: { canonical: "/committee/" },
};

const TOC = [
  { id: "purpose", label: "왜 두는가" },
  { id: "members", label: "위원 구성" },
  { id: "minutes", label: "회의 기록" },
  { id: "rules", label: "운영규칙" },
];

/** 규칙 본문. 조문을 화면에 그대로 싣는다 — 규칙을 공개하지 않으면 위원회가 있다고 말할 수 없다. */
const RULES: { chapter: string; articles: { no: string; title: string; body: string[] }[] }[] = [
  {
    chapter: "제1장 총칙",
    articles: [
      {
        no: "제1조",
        title: "목적",
        body: [
          "이 규칙은 「신문 등의 진흥에 관한 법률」 제6조 제2항에 따른 독자권익위원회로서, 주식회사 모두일보가 발행하는 인터넷신문 모두일보(이하 '본사')에 이용자위원회(이하 '위원회')를 두고 운영하는 데 필요한 사항을 정함을 목적으로 한다.",
          "같은 항은 위원회 설치를 의무가 아닌 임의 사항으로 정하고 있으나, 본사는 보도의 신뢰를 스스로 검증할 장치가 필요하다고 판단해 자발적으로 이를 설치한다.",
        ],
      },
      {
        no: "제2조",
        title: "기능",
        body: [
          "위원회는 다음 사항을 다룬다.",
          "1. 보도의 정확성·공정성과 취재 윤리에 관한 의견 제시",
          "2. 이용자의 불만·의견과 그 처리 결과에 대한 검토",
          "3. 편집 방향과 콘텐츠 품질에 관한 제안 및 권고",
          "4. 정정·반론 보도의 적정성 검토",
          "5. 그 밖에 이용자 권익 보호를 위해 위원회가 필요하다고 인정하는 사항",
        ],
      },
      {
        no: "제3조",
        title: "독립성",
        body: [
          "위원회는 본사의 편집·경영 방침으로부터 독립하여 직무를 수행한다. 본사는 위원회의 심의 내용을 이유로 위원에게 불이익을 주지 아니한다.",
        ],
      },
    ],
  },
  {
    chapter: "제2장 구성",
    articles: [
      {
        no: "제4조",
        title: "구성",
        body: [
          "① 위원회는 위원장 1명을 포함하여 5명 이상 7명 이하의 위원으로 구성한다.",
          "② 외부 위원이 전체 위원의 과반수가 되도록 한다.",
          "③ 외부 위원이란 발행 법인, 그 모회사 및 모회사의 다른 자회사 등 계열회사와 고용·거래 관계가 없는 사람을 말한다. 계열회사 임원의 배우자·직계존비속은 외부 위원이 될 수 없다.",
          "④ 특정 성별이 위원 수의 10분의 7을 초과하지 않도록 노력한다.",
        ],
      },
      {
        no: "제5조",
        title: "위원의 자격",
        body: [
          "위원은 다음 어느 하나에 해당하는 사람 중에서 위촉한다.",
          "1. 언론·미디어 분야의 전문가",
          "2. 법학·행정학·경제학 등 관련 학문 분야의 전문가",
          "3. 중소기업·소상공인 등 본사 보도가 주로 다루는 분야의 실무 경험자",
          "4. 노무·법무·회계 등 기업 실무 자격을 갖춘 사람",
          "5. 그 밖에 이용자 권익 증진에 기여할 수 있다고 인정되는 사람",
        ],
      },
      {
        no: "제6조",
        title: "위촉과 해촉",
        body: [
          "① 위원은 발행인이 위촉한다.",
          "② 위원이 직무 수행이 곤란하거나 직무와 관련한 비위가 확인된 경우, 또는 본인이 사임 의사를 밝힌 경우 발행인이 해촉할 수 있다.",
        ],
      },
      {
        no: "제7조",
        title: "임기",
        body: [
          "① 위원의 임기는 1년으로 하며 연임할 수 있다.",
          "② 임기가 만료되어도 후임 위원이 위촉될 때까지 직무를 계속 수행한다.",
          "③ 보궐 위원의 임기는 전임자의 잔여 임기로 한다.",
        ],
      },
      {
        no: "제8조",
        title: "위원장과 간사",
        body: [
          "① 위원장은 외부 위원 중에서 위원들이 호선한다.",
          "② 위원회의 사무를 처리하기 위해 간사 1명을 두며, 본사의 고충처리인이 이를 겸한다.",
          "③ 고충처리인은 위원장이 될 수 없다. 이용자 불만을 접수·처리하는 사람이 그 처리를 평가하는 자리를 함께 맡으면 위원회의 독립성이 성립하지 않기 때문이다.",
        ],
      },
      {
        no: "제9조",
        title: "제척과 회피",
        body: [
          "위원은 자신이 직접적인 이해관계를 가진 안건의 심의에서 제외되며, 공정한 직무 수행이 어렵다고 판단되면 스스로 회피할 수 있다.",
        ],
      },
    ],
  },
  {
    chapter: "제3장 운영",
    articles: [
      {
        no: "제10조",
        title: "회의",
        body: [
          "① 정기회의는 반기에 1회 이상 개최한다.",
          "② 위원장이 필요하다고 인정하거나 재적위원 3분의 1 이상이 요구하는 경우, 또는 발행인이 요청하는 경우 임시회의를 소집할 수 있다.",
          "③ 회의는 대면 또는 비대면 방식으로 개최할 수 있다. 부득이한 경우 서면으로 의견을 제출할 수 있으나, 서면으로만 진행하는 회의가 연간 정기회의의 2분의 1을 넘을 수 없다.",
          "④ 소집 통지는 회의 7일 전까지 안건과 함께 한다. 긴급한 경우에는 그러하지 아니하다.",
        ],
      },
      {
        no: "제11조",
        title: "안건의 처리",
        body: [
          "① 간사는 접수된 이용자 의견을 정리해 위원장에게 보고하고, 필요하면 안건으로 올린다.",
          "② 위원회가 권고 또는 의견을 채택하면 그 내용을 서면으로 발행인에게 전달한다.",
          "③ 발행인은 권고를 받은 날부터 30일 이내에 처리 결과 또는 처리 계획을 위원회에 통보한다.",
          "④ 위원회의 권고와 본사의 처리 결과는 이 페이지에 공개한다.",
        ],
      },
      {
        no: "제12조",
        title: "회의록",
        body: [
          "① 간사는 회의 종료일부터 7일 이내에 회의록을 작성하고 위원장의 확인을 받는다.",
          "② 회의록에는 일시, 참석 위원, 안건, 제시된 의견의 요지, 처리 결과를 적는다.",
          "③ 회의록은 3년 이상 보존하며 이 페이지에서 공개한다. 공개한 회의록은 삭제하지 아니한다.",
        ],
      },
      {
        no: "제13조",
        title: "공개",
        body: [
          "① 위원의 성명·소속과 위촉일은 이 페이지에 공개한다.",
          "② 위원회 운영 결과는 반기에 1회 이상 이 페이지를 통해 안내한다.",
        ],
      },
    ],
  },
  {
    chapter: "제4장 보칙",
    articles: [
      {
        no: "제14조",
        title: "지원과 비밀 유지",
        body: [
          "① 본사는 위원회 운영에 필요한 자료와 행정 지원을 제공한다.",
          "② 위원에게는 예산의 범위에서 수당을 지급할 수 있다.",
          "③ 위원은 직무상 알게 된 비밀을 누설하여서는 아니 되며, 이는 퇴임 후에도 같다.",
        ],
      },
      {
        no: "제15조",
        title: "개정",
        body: ["이 규칙의 개정은 위원회의 의견을 들어 발행인이 결정한다."],
      },
    ],
  },
];

export default function CommitteePage() {
  const external = COMMITTEE_MEMBERS.filter((m) => m.external).length;

  return (
    <>
      <PageHeader
        title="이용자위원회"
        subtitle="독자의 의견을 정기적으로 듣고, 무엇을 고쳤는지 기록으로 남깁니다. 운영규칙과 회의록을 그대로 공개합니다."
        breadcrumb={[{ label: "이용자위원회" }]}
      />

      <div className="container-page py-12">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
          {/* 목차 — lg 미만에서는 본문 위로 쌓인다 */}
          <aside className="mb-10 lg:mb-0">
            <nav
              aria-label="목차"
              className="lg:sticky lg:top-24 rounded-xl border border-ink-200 bg-ink-50 p-5 dark:border-ink-800 dark:bg-ink-900/40"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-500 dark:text-ink-400">목차</p>
              <ul className="mt-3 space-y-2 text-sm">
                {TOC.map((t) => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      className="text-ink-600 transition-colors hover:text-signal-600 dark:text-ink-300 dark:hover:text-signal-400"
                    >
                      {t.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <article className="max-w-3xl">
            <p className="text-sm text-ink-500 dark:text-ink-400">
              제정 2026년 8월 7일 · {SITE.legalName}
            </p>

            {/* 왜 두는가 */}
            <section id="purpose" className="scroll-mt-24">
              <h2 className="mt-8 font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
                왜 두는가
              </h2>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                신문사가 자기 보도를 스스로만 평가하면 그 평가를 믿을 근거가 없습니다. 이용자위원회는
                바깥의 시선으로 모두일보를 정기적으로 살펴보고, 그 지적에 편집국이 무엇을 어떻게
                고쳤는지까지 기록으로 남기는 장치입니다.
              </p>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                「신문 등의 진흥에 관한 법률」 제6조 제2항은 인터넷신문사업자가 독자권익위원회를 &lsquo;둘 수
                있다&rsquo;고 정합니다. 의무가 아니라 임의 사항입니다. 모두일보는 매일 24편을 발행하는
                매체로서 스스로를 검증할 외부 장치가 필요하다고 판단해 자발적으로 이를 두기로 하고, 외부 위원 위촉을 진행하고 있습니다.
              </p>
              <div className="mt-4 rounded-xl border border-ink-200 bg-ink-50 p-6 dark:border-ink-800 dark:bg-ink-900/40">
                <p className="text-sm font-semibold text-ink-900 dark:text-white">고충처리인과 무엇이 다른가</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                  고충처리인은 개별 사안을 접수해 처리하는 사후 창구입니다. 이용자위원회는 일정 기간의
                  보도 전반을 놓고 방향을 살피는 합의제 자문기구입니다. 두 제도는 서로를 대신하지
                  않으며, 접수 창구는{" "}
                  <Link href="/ombudsman" className="font-medium text-signal-600 hover:text-signal-700 dark:text-signal-400">
                    고충처리인 제도
                  </Link>
                  에서 안내합니다.
                </p>
              </div>
            </section>

            {/* 위원 구성 */}
            <section id="members" className="scroll-mt-24">
              <h2 className="mt-12 font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
                위원 구성
              </h2>
              {COMMITTEE_MEMBERS.length > 0 ? (
                <>
                  <p className="mt-3 text-sm text-ink-500 dark:text-ink-400">
                    총 {COMMITTEE_MEMBERS.length}명 · 외부 위원 {external}명
                  </p>
                  {/* 표가 아니라 카드로 쌓는다 — 좁은 화면에서 표는 가로 스크롤을 만든다 */}
                  <ul className="mt-4 space-y-3">
                    {COMMITTEE_MEMBERS.map((m) => (
                      <li
                        key={`${m.name}-${m.appointedAt}`}
                        className="rounded-xl border border-ink-200 bg-ink-50 p-5 dark:border-ink-800 dark:bg-ink-900/40"
                      >
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className="font-bold text-ink-900 dark:text-white">{m.name}</span>
                          <span className="text-xs font-semibold text-signal-600 dark:text-signal-400">{m.role}</span>
                          <span className="text-xs text-ink-500 dark:text-ink-400">
                            {m.external ? "외부" : "내부"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{m.affiliation}</p>
                        <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">위촉 {m.appointedAt}</p>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="mt-4 rounded-xl border border-ink-200 bg-ink-50 p-6 dark:border-ink-800 dark:bg-ink-900/40">
                  <p className="font-bold text-ink-900 dark:text-white">위원 위촉을 준비하고 있습니다.</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                    운영규칙 제4조에 따라 위원장 1명을 포함한 5~7명으로 구성하며, 외부 위원이 과반이
                    되도록 합니다. 위촉이 끝나면 위원의 성명·소속과 위촉일을 이 자리에 공개합니다.
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                    위원으로 참여하실 뜻이 있는 분은{" "}
                    <a
                      href={`mailto:${SITE.email}?subject=%5B%EB%AA%A8%EB%91%90%EC%9D%BC%EB%B3%B4%5D%20%EC%9D%B4%EC%9A%A9%EC%9E%90%EC%9C%84%EC%9B%90%ED%9A%8C%20%EC%B0%B8%EC%97%AC%20%EB%AC%B8%EC%9D%98`}
                      className="font-medium text-signal-600 hover:text-signal-700 dark:text-signal-400"
                    >
                      {SITE.email}
                    </a>
                    로 연락해 주십시오.
                  </p>
                </div>
              )}
            </section>

            {/* 회의 기록 */}
            <section id="minutes" className="scroll-mt-24">
              <h2 className="mt-12 font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
                회의 기록
              </h2>
              {COMMITTEE_MINUTES.length > 0 ? (
                <div className="mt-4 space-y-6">
                  {[...COMMITTEE_MINUTES]
                    .sort((a, b) => b.round - a.round)
                    .map((m) => (
                      <div
                        key={m.round}
                        className="rounded-xl border border-ink-200 bg-ink-50 p-6 dark:border-ink-800 dark:bg-ink-900/40"
                      >
                        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className="font-headline text-lg font-extrabold text-ink-900 dark:text-white">
                            제{m.round}차 회의
                          </span>
                          <span className="text-sm text-ink-500 dark:text-ink-400">
                            {m.heldAt} · {m.format}
                          </span>
                        </p>
                        <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">
                          참석 {m.attendees.join(", ")}
                        </p>
                        <p className="mt-4 text-sm font-semibold text-ink-900 dark:text-white">안건</p>
                        <ul className="mt-1 space-y-1 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                          {m.agenda.map((a, i) => (
                            <li key={i}>· {a}</li>
                          ))}
                        </ul>
                        <p className="mt-4 text-sm font-semibold text-ink-900 dark:text-white">위원회 의견</p>
                        <ul className="mt-1 space-y-1 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                          {m.opinions.map((o, i) => (
                            <li key={i}>· {o}</li>
                          ))}
                        </ul>
                        <p className="mt-4 rounded-lg border-l-2 border-signal-500 bg-white px-4 py-3 text-sm leading-relaxed text-ink-700 dark:bg-ink-900 dark:text-ink-200">
                          <span className="font-semibold">편집국 처리</span>
                          {m.respondedAt ? ` (${m.respondedAt})` : ""} — {m.response}
                        </p>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-ink-200 bg-ink-50 p-6 dark:border-ink-800 dark:bg-ink-900/40">
                  <p className="font-bold text-ink-900 dark:text-white">아직 개최된 회의가 없습니다.</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                    위원 위촉이 끝나면 첫 회의를 열고 회의록을 이 자리에 공개합니다. 공개한 회의록은
                    삭제하지 않습니다.
                  </p>
                </div>
              )}
            </section>

            {/* 운영규칙 */}
            <section id="rules" className="scroll-mt-24">
              <h2 className="mt-12 font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
                운영규칙
              </h2>
              <p className="mt-3 text-sm text-ink-500 dark:text-ink-400">모두일보 이용자위원회 운영규칙 · 제정 2026년 8월 7일</p>

              {RULES.map((ch) => (
                <div key={ch.chapter}>
                  <h3 className="mt-8 font-headline text-lg font-bold text-ink-900 dark:text-white">{ch.chapter}</h3>
                  {ch.articles.map((a) => (
                    <div key={a.no} className="mt-4">
                      <p className="text-sm font-semibold text-ink-900 dark:text-white">
                        {a.no}({a.title})
                      </p>
                      {a.body.map((line, i) => (
                        <p key={i} className="mt-1 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                          {line}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              ))}

              <p className="mt-8 border-t border-ink-200 pt-6 text-sm leading-relaxed text-ink-500 dark:border-ink-800 dark:text-ink-400">
                부칙 · 이 규칙은 제정일부터 시행한다. 위원회가 구성되기 전까지 이용자 의견 처리는
                고충처리인이 담당한다.
              </p>
            </section>
          </article>
        </div>
      </div>
    </>
  );
}
