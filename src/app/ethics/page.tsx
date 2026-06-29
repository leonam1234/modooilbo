import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "윤리강령",
  description:
    "모두일보의 편집강령, 취재·보도 윤리, 정정·반론 보도 원칙, 댓글·커뮤니티 정책과 청소년보호정책을 안내합니다.",
};

const TOC: { id: string; label: string }[] = [
  { id: "preamble", label: "편집강령 전문" },
  { id: "reporting", label: "취재·보도 윤리" },
  { id: "correction", label: "정정·반론 보도 원칙" },
  { id: "community", label: "댓글·커뮤니티 정책" },
  { id: "youth", label: "청소년보호정책" },
];

export default function EthicsPage() {
  return (
    <>
      <PageHeader
        title="윤리강령"
        subtitle="모두일보가 모든 보도와 운영에서 지키는 약속입니다. 편집강령, 취재 윤리, 정정·반론, 커뮤니티 및 청소년보호정책을 담았습니다."
        breadcrumb={[{ label: "윤리강령" }]}
      />

      <div className="container-page py-12">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
          {/* 목차 */}
          <aside className="mb-10 lg:mb-0">
            <nav
              aria-label="목차"
              className="lg:sticky lg:top-24 rounded-xl border border-ink-200 bg-ink-50 p-5 dark:border-ink-800 dark:bg-ink-900/40"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-400">목차</p>
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

          {/* 본문 */}
          <article className="max-w-3xl">
            <p className="text-sm text-ink-400">최종 개정 2026년 5월 1일 · 모두일보 편집위원회</p>

            {/* 편집강령 전문 */}
            <section id="preamble" className="scroll-mt-24">
              <h2 className="mt-8 font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
                편집강령 전문
              </h2>
              <p className="mt-5 leading-relaxed text-ink-600 dark:text-ink-300">
                모두일보는 사실에 충실하고 진실을 추구하는 언론을 지향한다. 우리는 헌법이
                보장하는 언론의 자유와 그에 따르는 사회적 책임을 함께 짊어지며, 시민의 알 권리에
                봉사하는 것을 존립의 이유로 삼는다.
              </p>
              <p className="mt-4 leading-relaxed text-ink-600 dark:text-ink-300">
                본 강령은 모두일보의 모든 임직원과 기고자에게 적용되며, 취재와 편집, 보도의 전
                과정에서 판단의 기준이 된다. 우리는 어떠한 외부의 압력이나 이해관계로부터도
                독립하여 보도하며, 그 독립성을 제도와 관행으로 지켜 나간다.
              </p>

              <h3 className="mt-7 text-lg font-bold text-ink-900 dark:text-white">제1조(목적)</h3>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                이 강령은 모두일보가 추구하는 저널리즘의 가치와 행동 기준을 명시하여, 보도의
                신뢰성과 공정성을 높이고 독자의 권익을 보호하는 데 목적이 있다.
              </p>

              <h3 className="mt-7 text-lg font-bold text-ink-900 dark:text-white">제2조(독립성)</h3>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                편집권은 편집국에 있으며, 광고·경영 부문과 분리하여 운영한다. 어떠한 광고주나
                후원자, 정치 세력도 보도의 방향과 내용에 영향을 미칠 수 없다.
              </p>

              <h3 className="mt-7 text-lg font-bold text-ink-900 dark:text-white">제3조(공정성)</h3>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                우리는 사안의 여러 측면을 균형 있게 전하며, 비판의 대상에게는 반론의 기회를
                보장한다. 의견과 사실을 명확히 구분하여 표기한다.
              </p>
            </section>

            {/* 취재·보도 윤리 */}
            <section id="reporting" className="scroll-mt-24">
              <h2 className="mt-12 font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
                취재·보도 윤리
              </h2>

              <h3 className="mt-6 text-lg font-bold text-ink-900 dark:text-white">
                제4조(사실 확인)
              </h3>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                모든 보도는 게재 전 사실 확인을 거친다. 핵심 사실은 가능한 한 둘 이상의 독립된
                출처로 교차 확인하며, 확인되지 않은 정보는 추측이나 단정의 형태로 전하지 않는다.
                인용과 통계, 인물의 직함과 발언은 원문에 충실하게 표기한다.
              </p>

              <h3 className="mt-7 text-lg font-bold text-ink-900 dark:text-white">
                제5조(익명취재원)
              </h3>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                취재원은 실명 표기를 원칙으로 한다. 다만 공익적 가치가 크고 취재원이 신변상·직업상
                불이익을 받을 우려가 있는 경우에 한해 익명을 허용하며, 이때에도 그 사유를 데스크와
                협의하고 기록으로 남긴다. 익명 취재원에게 정보의 대가로 금품을 제공하지 않는다.
              </p>

              <h3 className="mt-7 text-lg font-bold text-ink-900 dark:text-white">
                제6조(이해상충)
              </h3>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                기자는 자신이 직접적인 이해관계를 가진 사안을 취재·보도하지 않는다. 취재 대상으로부터
                금품, 향응, 부당한 편의를 받지 않으며, 주식 등 직무와 관련된 거래에서 미공개 정보를
                이용하지 않는다. 이해상충의 소지가 있을 경우 즉시 회사에 알리고 해당 보도에서
                배제될 수 있다.
              </p>

              <h3 className="mt-7 text-lg font-bold text-ink-900 dark:text-white">
                제7조(인격권 보호)
              </h3>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                보도 과정에서 개인의 명예와 사생활, 초상권을 존중한다. 범죄 피해자와 미성년자,
                사회적 약자의 신원은 공익상 불가피한 경우를 제외하고 보호하며, 불필요하게 자극적인
                묘사나 차별적 표현을 사용하지 않는다.
              </p>
            </section>

            {/* 정정·반론 보도 원칙 */}
            <section id="correction" className="scroll-mt-24">
              <h2 className="mt-12 font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
                정정·반론 보도 원칙
              </h2>

              <h3 className="mt-6 text-lg font-bold text-ink-900 dark:text-white">
                제8조(오류의 정정)
              </h3>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                보도에 사실과 다른 내용이 확인되면 신속하게 바로잡는다. 정정 시에는 무엇이 어떻게
                잘못되었는지를 해당 기사에 명확히 밝히며, 오류를 은폐하거나 사후에 임의로 삭제하지
                않는다.
              </p>

              <h3 className="mt-7 text-lg font-bold text-ink-900 dark:text-white">
                제9조(반론권 보장)
              </h3>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                보도로 인해 자신의 권익이 침해되었다고 판단하는 당사자는 반론 보도를 요청할 수 있다.
                모두일보는 정당한 반론 요청을 성실히 검토하여 합리적인 범위에서 신속히 반영한다.
              </p>

              <h3 className="mt-7 text-lg font-bold text-ink-900 dark:text-white">
                제10조(정정·반론 신청 방법)
              </h3>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                정정 및 반론 보도 청구는 이메일{" "}
                <a
                  href="mailto:correction@modooilbo.com"
                  className="font-medium text-signal-600 hover:text-signal-700 dark:text-signal-400"
                >
                  correction@modooilbo.com
                </a>{" "}
                로 접수한다. 접수된 사안은 편집위원회가 검토하며, 분쟁이 원만히 해결되지 않을 경우
                언론중재위원회의 조정 절차를 따른다.
              </p>
            </section>

            {/* 댓글·커뮤니티 정책 */}
            <section id="community" className="scroll-mt-24">
              <h2 className="mt-12 font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
                댓글·커뮤니티 정책
              </h2>

              <h3 className="mt-6 text-lg font-bold text-ink-900 dark:text-white">
                제11조(건강한 토론)
              </h3>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                모두일보의 댓글과 커뮤니티는 서로 다른 의견이 존중받으며 만나는 공론장이다.
                독자는 기사에 대해 자유롭게 의견을 나눌 수 있으나, 그 자유는 타인의 권리를 해치지
                않는 범위에서 행사되어야 한다.
              </p>

              <h3 className="mt-7 text-lg font-bold text-ink-900 dark:text-white">
                제12조(금지되는 게시물)
              </h3>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                다음의 게시물은 사전 통보 없이 삭제될 수 있으며, 반복 위반 시 이용이 제한된다.
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-ink-600 dark:text-ink-300">
                <li>욕설·비방·혐오 표현 등 타인의 인격을 침해하는 내용</li>
                <li>특정 성별·지역·종교·인종 등에 대한 차별과 선동</li>
                <li>허위사실 유포, 명예훼손, 사생활 침해에 해당하는 내용</li>
                <li>음란물 및 청소년에게 유해한 정보</li>
                <li>광고·홍보·도배 등 토론과 무관한 영리성 게시물</li>
              </ul>

              <h3 className="mt-7 text-lg font-bold text-ink-900 dark:text-white">
                제13조(운영과 이의 제기)
              </h3>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                커뮤니티는 운영 원칙에 따라 관리되며, 조치에 이의가 있는 이용자는 고객센터를 통해
                재검토를 요청할 수 있다. 우리는 표현의 자유와 이용자 보호 사이의 균형을 신중히
                지키고자 노력한다.
              </p>
            </section>

            {/* 청소년보호정책 */}
            <section id="youth" className="scroll-mt-24">
              <h2 className="mt-12 font-headline text-2xl font-extrabold text-ink-900 dark:text-white sm:text-3xl">
                청소년보호정책
              </h2>
              <p className="mt-5 leading-relaxed text-ink-600 dark:text-ink-300">
                모두일보는 청소년이 건전한 인격체로 성장할 수 있도록 유해 정보로부터 청소년을
                보호하고, 관련 법령(정보통신망법, 청소년보호법 등)을 준수한다.
              </p>

              <h3 className="mt-7 text-lg font-bold text-ink-900 dark:text-white">
                제14조(유해정보로부터의 보호)
              </h3>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                청소년에게 유해한 내용이 포함된 콘텐츠에는 별도의 표시를 하고, 접근을 제한하는 등의
                보호 조치를 취한다. 유해정보에 대한 모니터링을 상시 실시하여 신속히 차단한다.
              </p>

              <h3 className="mt-7 text-lg font-bold text-ink-900 dark:text-white">
                제15조(청소년보호책임자)
              </h3>
              <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
                모두일보는 청소년 보호 업무를 총괄하는 청소년보호책임자를 지정하여 운영한다.
                청소년 유해정보 신고 및 관련 문의는 아래로 연락하면 된다.
              </p>
              <div className="mt-4 rounded-xl border border-ink-200 bg-ink-50 p-6 dark:border-ink-800 dark:bg-ink-900/40">
                <dl className="space-y-2.5 text-sm">
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 font-semibold text-ink-500 dark:text-ink-400">
                      직책
                    </dt>
                    <dd className="text-ink-700 dark:text-ink-200">청소년보호책임자</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 font-semibold text-ink-500 dark:text-ink-400">
                      성명
                    </dt>
                    <dd className="text-ink-700 dark:text-ink-200">김민재</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 font-semibold text-ink-500 dark:text-ink-400">
                      전화
                    </dt>
                    <dd className="text-ink-700 dark:text-ink-200">02-1234-5690</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 font-semibold text-ink-500 dark:text-ink-400">
                      이메일
                    </dt>
                    <dd className="text-ink-700 dark:text-ink-200">
                      <a
                        href="mailto:youth@modooilbo.com"
                        className="font-medium text-signal-600 hover:text-signal-700 dark:text-signal-400"
                      >
                        youth@modooilbo.com
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            <p className="mt-12 border-t border-ink-200 pt-6 text-sm text-ink-400 dark:border-ink-800">
              본 윤리강령은 사회 변화와 독자 의견을 반영하여 편집위원회의 의결을 거쳐 개정될 수
              있습니다. 본 페이지의 내용은 데모용으로 작성된 가상의 문서입니다.
            </p>
          </article>
        </div>
      </div>
    </>
  );
}
