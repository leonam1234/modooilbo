import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "운영정책",
  description:
    "모두일보 자율 운영정책 — 허위·조작정보 대응, 신고·이의신청 절차, 댓글 운영 기준, AI 콘텐츠 정책을 안내합니다.",
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
          <p className="mb-10 text-sm text-ink-500 dark:text-ink-400">시행일: 2026년 7월 7일</p>

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
            <h2 className={H}>2. AI 활용 고지</h2>
            <p className={P}>
              모두일보의 기사와 이미지는 AI 도구를 활용해 제작되며, 편집국 검수를 거쳐 게시됩니다.
              생성 이미지는 본문에 &ldquo;AI 생성 이미지&rdquo;로 표기합니다. 실존 인물·기관을
              허위로 묘사하는 조작 콘텐츠는 제작하지 않습니다.
            </p>
          </section>

          <section className="mb-10">
            <h2 className={H}>3. 신고 및 처리 절차</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li className={LI}>누구나 기사·댓글에 대해 신고할 수 있습니다.</li>
              <li className={LI}>
                기사: 각 기사 하단의 <b>정정요청·신고</b> 또는{" "}
                <a href="mailto:help@modooilbo.com" className="underline">help@modooilbo.com</a>
              </li>
              <li className={LI}>댓글: 각 댓글의 <b>신고</b> 버튼(로그인 필요) — 서로 다른 이용자 신고가 누적되면 자동으로 가려집니다.</li>
              <li className={LI}>접수 후 지체 없이 검토하며, 위반 확인 시 정정·삭제·가림 등 조치하고 결과를 신고자에게 회신합니다.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className={H}>4. 이의신청</h2>
            <p className={P}>
              신고 처리 결과 또는 게시물 조치에 동의하지 않는 신고자·게재자는{" "}
              <a href="mailto:help@modooilbo.com" className="underline">help@modooilbo.com</a>으로
              이의신청할 수 있습니다. 접수일로부터 7일 이내에 재검토 결과를 안내합니다. 언론중재법에
              따른 조정·중재는 고충처리인(푸터 표기)을 통해 안내받을 수 있습니다.
            </p>
          </section>

          <section className="mb-10">
            <h2 className={H}>5. 댓글 운영 기준</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li className={LI}>욕설·혐오·차별 표현은 자동 필터(클린봇)로 등록이 제한됩니다.</li>
              <li className={LI}>불법정보, 허위·조작정보, 타인의 권리를 침해하는 게시물은 삭제 또는 가림 처리됩니다.</li>
              <li className={LI}>도배 방지를 위해 연속 작성이 제한됩니다.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className={H}>6. 팩트체크 협력</h2>
            <p className={P}>
              모두일보는 공식 출처 확인을 원칙으로 하며, 사실확인이 필요한 사안은 관계 기관·팩트체크
              단체의 공개 자료를 참조합니다. 외부의 사실확인 요청에 성실히 협조합니다.
            </p>
          </section>

          <section className="mb-10">
            <h2 className={H}>7. 투명성 보고</h2>
            <p className={P}>
              신고 접수·처리 현황은 반기별로{" "}
              <Link href="/transparency" className="underline">투명성 보고</Link> 페이지를 통해
              공개합니다.
            </p>
          </section>
        </article>
      </div>
    </>
  );
}
