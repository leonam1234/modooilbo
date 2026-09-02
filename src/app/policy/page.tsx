import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { CONTENT_USE_POLICY } from "@/lib/content-use-policy";
import { PlainEmailLink, PUBLIC_EMAILS } from "@/components/PlainEmail";

export const metadata: Metadata = {
  title: "운영정책",
  description:
    "모두일보 자율 운영정책 — 허위·조작정보 대응, 신고·이의신청 절차, 댓글 운영 기준, AI 활용 고지를 안내합니다. 허위·조작정보 대응 원칙과 신고·이의신청 절차, 댓글 운영 기준, 팩트체크 협력과 투명성 보고, AI 도구 활용 범위와 편집국의 사실확인 책임까지 모두일보가 스스로 지키는 운영 규범을 문서로 남깁니다.",
  alternates: { canonical: "/policy/" },
};

const H = "font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl";
const P = "mt-3 leading-relaxed text-ink-600 dark:text-ink-300";
const LI = "leading-relaxed text-ink-600 dark:text-ink-300";

export default function PolicyPage() {
  return (
    <>
      <PageHeader
        title="운영정책"
        subtitle="정보통신망법(2026. 7. 7. 시행 개정)에 따른 모두일보의 자율 운영정책입니다."
        breadcrumb={[{ label: "운영정책" }]}
      />
      <div className="container-page py-10 sm:py-12">
        <article className="mx-auto max-w-3xl">
          <p className="mb-10 text-sm text-ink-500 dark:text-ink-400">시행일: 2026년 8월 30일</p>

          <section className="mb-10">
            <h2 className={H}>1. 허위·조작정보 대응 원칙</h2>
            <p className={P}>
              모두일보는 확인되지 않은 사실을 단정하지 않으며, 모든 기사는 공식 원출처(정부 발표,
              공공기관 자료, 공신력 있는 기록) 기반으로 작성하고 발행 전 팩트체크·표현 위험 검수를
              거칩니다. 사실과 다른 내용이 확인되면 지체 없이 정정하고{" "}
              <Link href="/corrections" className="underline">정정보도 모음</Link>에 기록합니다.
            </p>
          </section>

          <section className="mb-10">
            <h2 className={H}>2. 신고 및 처리 절차</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li className={LI}>누구나 기사·댓글에 대해 신고할 수 있습니다.</li>
              <li className={LI}>
                기사: 각 기사 하단의 <b>정정요청·신고</b> 또는{" "}
                <PlainEmailLink address={PUBLIC_EMAILS.help} className="underline" />
              </li>
              <li className={LI}>댓글: 각 댓글의 <b>신고</b> 버튼(로그인 필요) — 서로 다른 이용자 신고가 누적되면 자동으로 가려집니다.</li>
              <li className={LI}>접수 후 지체 없이 검토하며, 위반 확인 시 정정·삭제·가림 등 조치하고 결과를 신고자에게 회신합니다.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className={H}>3. 이의신청</h2>
            <p className={P}>
              신고 처리 결과 또는 게시물 조치에 동의하지 않는 신고자·게재자는{" "}
              <PlainEmailLink address={PUBLIC_EMAILS.help} className="underline" />으로
              이의신청할 수 있습니다. 접수일로부터 7일 이내에 재검토 결과를 안내합니다. 언론중재법에
              따른 조정·중재는 고충처리인(푸터 표기)을 통해 안내받을 수 있습니다.
            </p>
          </section>

          <section className="mb-10">
            <h2 className={H}>4. 댓글 운영 기준</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li className={LI}>욕설·혐오·차별 표현은 자동 필터(클린봇)로 등록이 제한됩니다.</li>
              <li className={LI}>불법정보, 허위·조작정보, 타인의 권리를 침해하는 게시물은 삭제 또는 가림 처리됩니다.</li>
              <li className={LI}>도배 방지를 위해 연속 작성이 제한됩니다.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className={H}>5. 팩트체크 협력</h2>
            <p className={P}>
              모두일보는 공식 출처 확인을 원칙으로 하며, 사실확인이 필요한 사안은 관계 기관·팩트체크
              단체의 공개 자료를 참조합니다. 외부의 사실확인 요청에 성실히 협조합니다.
            </p>
          </section>

          <section className="mb-10">
            <h2 className={H}>6. 투명성 보고</h2>
            <p className={P}>
              신고 접수·처리 현황은 반기별로{" "}
              <Link href="/transparency" className="underline">투명성 보고</Link> 페이지를 통해
              공개합니다.
            </p>
          </section>

          {/* 7절 — 각 기사 하단의 AI 활용 고지 배너가 "자세한 내용은 운영정책"이라며 이 페이지로
              보내는데 정작 해당 항목이 없었다(2026-08-21 확인). 고지가 근거 문서를 가리키지 못하는
              상태였으므로 그 참조를 여기서 받는다.
              ⚠️ 실제로 하는 것만 적는다 — 하지 않는 검증 체계를 지어내면 그 자체가 허위 고지다. */}
          <section className="mb-10">
            <h2 className={H}>7. AI 활용 고지</h2>
            <p className={P}>
              모두일보는 기사 작성 과정에 AI 도구를 활용합니다. 각 기사 하단에도 같은 내용을
              고지합니다.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li className={LI}>
                <b>사실확인 책임은 편집국에 있습니다.</b> AI 도구의 활용 여부와 무관하게, 발행된
                기사의 사실관계에 대한 책임은 모두일보 편집국이 집니다.
              </li>
              <li className={LI}>
                모든 기사는 발행 전 편집국 검수를 거칩니다. 수치·마감 시각·자격요건 등 독자의
                행동에 직접 영향을 주는 사항은 공식 원출처에서 다시 확인하며, 원출처를 확인할 수
                없으면 그 내용을 단정해 싣지 않습니다.
              </li>
              <li className={LI}>
                기사의 대표 이미지는 <b>AI로 생성한 이미지이며 실제 사진이 아닙니다.</b> 각 이미지
                설명에도 같은 내용을 표시합니다. 취재 현장을 촬영한 사진으로 오인되지 않도록 실제
                인물의 얼굴, 기업 로고·상표, 특정 장소의 재현을 넣지 않으며, 사고·범죄 현장을
                실사처럼 재현하지 않습니다.
              </li>
              <li className={LI}>
                사실과 다른 내용이 확인되면 위 <b>1·2·3항</b>의 정정·신고·이의신청 절차를 그대로
                따릅니다. AI 도구를 활용했다는 사정은 정정 의무를 덜지 않습니다.
              </li>
            </ul>
          </section>

          <section id="content-use" className="mb-10 scroll-mt-28">
            <h2 className={H}>8. 검색·인용 및 AI 학습 정책</h2>
            <p className={P}>{CONTENT_USE_POLICY.attribution}</p>
            <p className={P}>{CONTENT_USE_POLICY.training}</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li className={LI}>
                허용 범위는 검색 색인, 짧은 발췌, 실시간 검색·답변의 근거 인용입니다. 기사 전문의
                재게시, 원문을 대체하는 저장·배포, 유료 접근 제한의 우회까지 허용하는 것은 아닙니다.
              </li>
              <li className={LI}>
                <code>robots.txt</code>와 Cloudflare Content Signals에도 같은 원칙을 기계 판독 가능한
                형태로 표시합니다: <code>search=yes</code>, <code>ai-input=yes</code>,{" "}
                <code>ai-train=no</code>, <code>use=reference</code>.
              </li>
              <li className={LI}>
                검색·인용 전용 크롤러는 허용하고, 모델 학습 또는 검색과 학습을 함께 수행하는
                크롤러는 차단합니다.
              </li>
            </ul>
          </section>
        </article>
      </div>
    </>
  );
}
