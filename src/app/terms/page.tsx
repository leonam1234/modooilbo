import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "이용약관",
  description: "모두일보 서비스 이용약관 — 회원과 회사의 권리·의무 및 이용 조건을 안내합니다.",
};

export default function TermsPage() {
  return (
    <>
      <PageHeader
        title="이용약관"
        subtitle="모두일보 서비스 이용에 관한 회원과 회사의 권리·의무 및 책임사항을 규정합니다."
        breadcrumb={[{ label: "이용약관" }]}
      />

      <div className="container-page py-10 sm:py-12">
        <article className="mx-auto max-w-3xl">
          <p className="mb-10 text-sm text-ink-400">시행일: 2026년 1월 1일</p>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              제1조 (목적)
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              본 약관은 모두일보(이하 &ldquo;회사&rdquo;)이 운영하는 온라인 뉴스 서비스(이하
              &ldquo;서비스&rdquo;)를 이용함에 있어 회사와 이용자 간의 권리, 의무 및 책임사항,
              기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              제2조 (용어의 정의)
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              본 약관에서 사용하는 용어의 정의는 다음과 같습니다.
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 leading-relaxed text-ink-600 dark:text-ink-300">
              <li>
                &ldquo;서비스&rdquo;란 회사가 제공하는 뉴스 기사, 칼럼, 사진·영상 콘텐츠 및 이에
                부수하는 모든 서비스를 의미합니다.
              </li>
              <li>
                &ldquo;이용자&rdquo;란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및
                비회원을 말합니다.
              </li>
              <li>
                &ldquo;회원&rdquo;이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 회사의
                정보를 지속적으로 제공받으며 서비스를 계속 이용할 수 있는 자를 말합니다.
              </li>
              <li>
                &ldquo;콘텐츠&rdquo;란 회사가 서비스를 통해 제공하는 부호·문자·음성·음향·이미지
                또는 영상 등의 정보를 말합니다.
              </li>
            </ol>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              제3조 (약관의 효력 및 변경)
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이
              발생합니다. 회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있으며,
              약관을 개정할 경우 적용일자 및 개정사유를 명시하여 시행일 7일 전부터 공지합니다.
              다만, 이용자에게 불리한 변경의 경우 30일 전부터 공지합니다.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              제4조 (이용계약의 성립)
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              이용계약은 이용자가 본 약관의 내용에 동의하고 회사가 정한 가입 양식에 따라 회원정보를
              기입한 후 가입 신청을 하면, 회사가 이를 승낙함으로써 성립합니다. 회사는 다음 각 호에
              해당하는 신청에 대하여는 승낙을 하지 않거나 사후에 이용계약을 해지할 수 있습니다.
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 leading-relaxed text-ink-600 dark:text-ink-300">
              <li>실명이 아니거나 타인의 명의를 이용한 경우</li>
              <li>허위의 정보를 기재하거나 회사가 요구하는 내용을 기재하지 않은 경우</li>
              <li>이전에 본 약관 위반 등의 사유로 이용 자격을 상실한 적이 있는 경우</li>
            </ol>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              제5조 (회원정보의 변경)
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              회원은 개인정보 관리화면을 통하여 언제든지 본인의 개인정보를 열람하고 수정할 수
              있습니다. 회원은 가입 신청 시 기재한 사항이 변경되었을 경우 이를 수정하여야 하며,
              수정하지 않아 발생한 불이익에 대하여 회사는 책임지지 않습니다.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              제6조 (회사의 의무)
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              회사는 관련 법령과 본 약관이 금지하거나 미풍양속에 반하는 행위를 하지 않으며, 지속적이고
              안정적으로 서비스를 제공하기 위하여 최선을 다합니다. 회사는 이용자가 안전하게 서비스를
              이용할 수 있도록 개인정보 보호를 위한 보안 시스템을 갖추고 개인정보처리방침을 공시하고
              준수합니다.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              제7조 (이용자의 의무)
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              이용자는 다음 행위를 하여서는 안 됩니다.
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 leading-relaxed text-ink-600 dark:text-ink-300">
              <li>신청 또는 변경 시 허위 내용을 등록하는 행위</li>
              <li>타인의 정보를 도용하는 행위</li>
              <li>회사가 게시한 정보를 무단으로 변경하는 행위</li>
              <li>회사와 기타 제3자의 저작권 등 지식재산권을 침해하는 행위</li>
              <li>외설 또는 폭력적인 메시지 등 공서양속에 반하는 정보를 공개 또는 게시하는 행위</li>
            </ol>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              제8조 (저작권의 귀속 및 이용제한)
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              회사가 작성한 콘텐츠에 대한 저작권 및 기타 지식재산권은 회사에 귀속합니다. 이용자는
              서비스를 이용함으로써 얻은 정보 중 회사에 지식재산권이 귀속된 정보를 회사의 사전 승낙
              없이 복제·송신·출판·배포·방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게
              이용하게 하여서는 안 됩니다.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              제9조 (서비스의 제공 및 중단)
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다. 다만, 회사는 시스템 정기점검,
              증설 및 교체, 설비의 장애, 천재지변 등 불가항력적 사유가 발생한 경우 서비스의 전부
              또는 일부를 일시적으로 중단할 수 있으며, 이 경우 사전에 그 사유와 기간을 공지합니다.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              제10조 (계약 해지 및 이용 제한)
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              회원은 언제든지 회원정보 관리화면을 통하여 이용계약 해지(회원 탈퇴)를 신청할 수
              있으며, 회사는 관련 법령이 정하는 바에 따라 이를 즉시 처리합니다. 회원이 본 약관의
              의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 회사는 사전 통지 후 서비스
              이용을 단계적으로 제한하거나 계약을 해지할 수 있습니다.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              제11조 (책임의 제한)
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는
              서비스 제공에 관한 책임이 면제됩니다. 회사는 이용자의 귀책사유로 인한 서비스 이용의
              장애에 대하여는 책임을 지지 않으며, 이용자가 서비스에 게재한 정보·자료·사실의 신뢰도 및
              정확성 등에 대하여도 책임을 지지 않습니다.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              제12조 (분쟁의 해결 및 준거법)
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              본 약관과 관련하여 회사와 이용자 간에 발생한 분쟁에 대하여는 대한민국 법을 준거법으로
              하며, 분쟁으로 인한 소송이 제기될 경우 민사소송법상의 관할 법원을 제1심 관할 법원으로
              합니다. 회사와 이용자는 분쟁을 원만하게 해결하기 위하여 필요한 모든 노력을 다합니다.
            </p>
          </section>

          <section className="mt-12 border-t border-ink-200 pt-8 dark:border-ink-800">
            <h3 className="font-headline text-lg font-bold text-ink-900 dark:text-white">
              부칙
            </h3>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              본 약관은 2026년 1월 1일부터 시행합니다. 본 약관 시행 이전에 가입한 회원에게도 본
              약관이 적용되며, 종전의 약관은 본 약관으로 대체됩니다.
            </p>
          </section>
        </article>
      </div>
    </>
  );
}
