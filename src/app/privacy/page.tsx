import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description:
    "모두일보는 이용자의 개인정보를 소중히 다루며, 관련 법령에 따라 수집·이용·보관·파기 절차를 투명하게 안내합니다.",
  alternates: { canonical: "/privacy/" },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        title="개인정보처리방침"
        subtitle="모두일보는 이용자의 개인정보를 소중히 여기며 관련 법령을 준수합니다."
        breadcrumb={[{ label: "개인정보처리방침" }]}
      />

      <div className="container-page py-10 sm:py-12">
        <article className="mx-auto max-w-3xl">
          <p className="mb-6 text-sm text-ink-400">시행일: 2026년 1월 1일</p>
          <p className="mb-10 leading-relaxed text-ink-600 dark:text-ink-300">
            모두일보(이하 &ldquo;회사&rdquo;)은 「개인정보 보호법」 등 관련 법령에 따라 이용자의
            개인정보를 보호하고 이와 관련한 고충을 신속하게 처리할 수 있도록 다음과 같은
            개인정보처리방침을 수립·공개합니다.
          </p>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              1. 수집하는 개인정보 항목
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              회사는 회원가입, 서비스 이용 과정에서 아래와 같은 개인정보를 수집합니다.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-ink-600 dark:text-ink-300">
              <li>필수항목: 이름, 이메일 주소, 비밀번호</li>
              <li>선택항목: 뉴스레터 수신 여부, 관심 분야</li>
              <li>
                자동수집 항목: 접속 IP 주소, 쿠키, 서비스 이용 기록, 접속 로그, 기기 정보(브라우저
                종류, OS)
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              2. 개인정보의 수집·이용 목적
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              회사는 수집한 개인정보를 다음의 목적을 위하여 활용하며, 목적이 변경될 경우 사전에
              동의를 받습니다.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-ink-600 dark:text-ink-300">
              <li>회원 가입 의사 확인, 회원제 서비스 제공 및 본인 식별·인증</li>
              <li>뉴스레터 발송, 신규 서비스 및 이벤트 정보 안내(동의한 회원에 한함)</li>
              <li>서비스 이용 통계 분석 및 콘텐츠 개선, 맞춤형 콘텐츠 제공</li>
              <li>부정 이용 방지, 비인가 사용 방지 및 민원 처리</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              3. 개인정보의 보유·이용 기간
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              회사는 원칙적으로 개인정보 수집·이용 목적이 달성된 후에는 해당 정보를 지체 없이
              파기합니다. 다만, 관계 법령에 의하여 보존할 필요가 있는 경우 아래와 같이 일정 기간
              보관합니다.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-ink-600 dark:text-ink-300">
              <li>회원 정보: 회원 탈퇴 시까지</li>
              <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
              <li>소비자의 불만 또는 분쟁 처리에 관한 기록: 3년 (전자상거래법)</li>
              <li>접속 로그 기록: 3개월 (통신비밀보호법)</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              4. 개인정보의 제3자 제공
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              회사는 이용자의 개인정보를 본 방침에서 명시한 범위 내에서만 처리하며, 이용자의 사전
              동의 없이는 해당 범위를 초과하여 이용하거나 제3자에게 제공하지 않습니다. 다만, 다음의
              경우에는 예외로 합니다.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-ink-600 dark:text-ink-300">
              <li>이용자가 사전에 제3자 제공에 동의한 경우</li>
              <li>법령의 규정에 의하거나 수사기관의 적법한 요청이 있는 경우</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              5. 개인정보 처리의 위탁
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              회사는 원활한 서비스 제공을 위하여 아래와 같이 개인정보 처리 업무를 외부에 위탁할 수
              있으며, 위탁 시 관련 법령에 따라 수탁자가 개인정보를 안전하게 처리하도록 관리·감독합니다.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-ink-600 dark:text-ink-300">
              <li>클라우드 인프라 운영: 클라우드 인프라 사업자 (데이터 보관 및 서버 운영)</li>
              <li>이메일·뉴스레터 발송: 이메일·뉴스레터 발송 대행사 (발송 업무)</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              6. 이용자 및 법정대리인의 권리와 행사 방법
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              이용자는 언제든지 자신의 개인정보를 조회하거나 수정할 수 있으며, 개인정보의 처리 정지
              및 삭제(회원 탈퇴)를 요청할 수 있습니다. 권리 행사는 서비스 내 설정 화면 또는
              개인정보보호책임자에게 서면·이메일로 요청하실 수 있으며, 회사는 지체 없이 조치합니다.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              7. 쿠키(Cookie)의 운용
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              회사는 이용자에게 맞춤형 서비스를 제공하기 위하여 쿠키를 사용합니다. 쿠키는 이용자의
              브라우저에 저장되는 소량의 정보로, 이용자는 웹브라우저 설정을 통해 쿠키 저장을 거부할
              수 있습니다. 다만, 쿠키 저장을 거부할 경우 일부 맞춤형 서비스 이용에 제한이 있을 수
              있습니다.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              8. 개인정보의 안전성 확보 조치
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              회사는 개인정보의 안전성 확보를 위하여 비밀번호의 암호화, 해킹 등에 대비한 접근통제
              장치 설치 및 운영, 개인정보 취급 직원의 최소화 및 정기적인 교육 등 기술적·관리적 보호
              조치를 시행하고 있습니다.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              9. 개인정보보호책임자
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              회사는 개인정보 처리에 관한 업무를 총괄하여 책임지고, 개인정보 처리와 관련한 이용자의
              불만 처리 및 피해 구제를 위하여 아래와 같이 개인정보보호책임자를 지정하고 있습니다.
            </p>
            <div className="mt-4 rounded-xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
              <dl className="space-y-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 font-medium text-ink-700 dark:text-ink-200">
                    책임자
                  </dt>
                  <dd>정한별 / 편집국 디지털전략실장</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 font-medium text-ink-700 dark:text-ink-200">
                    이메일
                  </dt>
                  <dd>privacy@modooilbo.com</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 font-medium text-ink-700 dark:text-ink-200">
                    전화
                  </dt>
                  <dd>02-1234-5678 (평일 09:00 ~ 18:00)</dd>
                </div>
              </dl>
            </div>
            <p className="mt-4 leading-relaxed text-ink-600 dark:text-ink-300">
              개인정보 침해에 대한 신고나 상담이 필요한 경우, 개인정보분쟁조정위원회, 한국인터넷
              진흥원 개인정보침해신고센터 등 관계 기관에 문의하실 수 있습니다.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              10. 고지의 의무
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              본 개인정보처리방침의 내용 추가, 삭제 및 수정이 있을 경우 시행일의 7일 전부터
              서비스 공지사항을 통하여 고지합니다. 다만, 이용자 권리의 중대한 변경이 발생할 때에는
              최소 30일 전에 고지합니다.
            </p>
          </section>

          <section className="mt-12 border-t border-ink-200 pt-8 dark:border-ink-800">
            <p className="leading-relaxed text-ink-600 dark:text-ink-300">
              본 방침은 2026년 1월 1일부터 적용됩니다.
            </p>
          </section>
        </article>
      </div>
    </>
  );
}
