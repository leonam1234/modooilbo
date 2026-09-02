import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { SITE } from "@/lib/site";
import { PlainEmail, PUBLIC_EMAILS } from "@/components/PlainEmail";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description:
    "모두일보는 이용자의 개인정보를 소중히 다루며, 관련 법령에 따라 수집·이용·보관·파기 절차를 투명하게 안내합니다. 수집하는 개인정보 항목과 이용 목적, 보유 기간과 파기 절차, 처리 위탁과 국외 이전 현황, 이용자의 권리와 행사 방법을 공개합니다.",
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
          {/* 제11조(고지의 의무)가 "시행일의 7일 전부터 고지"를 정하고 있으므로, 개정일과
              시행 예정일을 최소 7일 간격으로 함께 표기한다. 방침을 고칠 때 이 규칙을 깨지 말 것. */}
          <p className="mb-6 text-sm text-ink-500 dark:text-ink-400">
            시행 예정일: 2026-09-10 12:00 KST · 개정일: 2026년 9월 2일 (현재 시행일:
            2026년 8월 17일)
          </p>
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
                자동수집 항목: 접속 IP 주소, 쿠키·클라이언트 식별자, 방문 페이지 URL·제목,
                유입 경로, 접속 시각, 서비스 이용 기록, 접속 로그, 기기 정보(브라우저 종류, OS),
                화면 상호작용 기록(클릭·스크롤·마우스 이동 등 사용성 분석 목적)
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
              <li>방문·유입·기기별 서비스 이용 통계 분석 및 콘텐츠·사용성 개선</li>
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
              <li>
                Cloudflare, Inc. — 웹사이트 호스팅, 데이터 보관, 이메일 수·발신 처리 및 트래픽 통계
              </li>
              <li>
                Microsoft Corporation — 웹사이트 이용 분석 및 사용성 개선(Microsoft Clarity)
              </li>
              <li>
                Google LLC — 광고 게재·성과 측정(Google AdSense), 방문 및 이용 통계 분석·콘텐츠
                개선(Google Analytics)
              </li>
            </ul>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              위탁 업무의 내용이나 수탁자가 변경될 경우 이 방침을 통하여 공개합니다.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              6. 개인정보의 국외 이전
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              회사는 서비스 제공을 위하여 아래와 같이 개인정보를 국외로 이전합니다. 이용자는 국외
              이전을 거부할 수 있습니다. Google Analytics 국외 이전은 최초 분석 쿠키 선택창에서
              &ldquo;거부&rdquo;를 선택하거나, 이후 페이지 하단의 &ldquo;분석 쿠키 설정&rdquo;에서
              동의를 철회하여 거부할 수 있습니다. 웹브라우저에서 이 사이트의 쿠키와 사이트
              데이터(로컬 저장소 포함)를 삭제하거나 개인정보보호책임자에게 요청할 수도 있습니다.
              거부 또는 철회하면 Google Analytics
              태그를 불러오지 않아 분석 목적의 국외 이전이 발생하지 않으며, 기사 열람 등 기본
              서비스 이용에는 제한이 없습니다. 다만 해당 이용 기록은 방문 통계와 콘텐츠 개선
              분석에 반영되지 않습니다. 그 밖의 국외 이전은 브라우저의 쿠키 차단 기능을 이용하거나
              개인정보보호책임자에게 요청하여 거부할 수 있으며, 서비스 제공에 필수적인 처리를
              거부하면 해당 기능 이용이 제한될 수 있습니다.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-ink-600 dark:text-ink-300">
              <li>
                Cloudflare, Inc. (미국) — 이전 항목: 접속 IP 주소, 쿠키, 접속 로그, 기기 정보,
                회원 정보 · 이전 시점: 서비스 이용 시 네트워크를 통해 수시 이전 ·
                이용 목적: 호스팅 및 데이터 보관 · 보유 기간: 위탁 계약 종료 시까지
              </li>
              <li>
                Microsoft Corporation (미국) — 이전 항목: 접속 IP 주소, 쿠키, 기기 정보, 화면
                상호작용 기록 · 이전 시점: 서비스 이용 시 네트워크를 통해 수시 이전 ·
                이용 목적: 이용 분석 및 사용성 개선 · 보유 기간: 수집일로부터 최대 13개월
              </li>
              <li>
                Google LLC (이전 국가: 미국) · 주소: 1600 Amphitheatre Parkway Mountain View CA
                94043 USA · 개인정보 문의: {" "}
                <a
                  href="https://support.google.com/policies/troubleshooter/7575787"
                  className="break-all underline underline-offset-2 hover:text-brand-700 dark:hover:text-brand-300"
                >
                  https://support.google.com/policies/troubleshooter/7575787
                </a>{" "}
                · 이전 항목: 접속 IP 주소, 쿠키·클라이언트 식별자, 방문 페이지 URL·제목, 유입 경로,
                접속 시각, 브라우저·기기 정보 및 페이지 이용 이벤트 · 이전 시기 및 방법: Google
                AdSense 광고 서비스 이용 시 또는 이용자가 Google Analytics 분석을 허용한 뒤 서비스
                이용 시, 이용자의 기기에서 Google 서버로 인터넷 네트워크를 통해 수시 자동 전송 ·
                이전 목적: Google AdSense 광고 게재·성과 측정 및 Google Analytics 방문·이용 통계
                분석·콘텐츠 개선 · 보유 기간: Google Analytics 사용자·이벤트 단위 데이터는 회사
                정책상 수집일로부터 14개월 이내이며, 회사는 실제 속성 설정과 삭제 절차를 관리하여
                14개월을 초과해 보유하지 않도록 합니다. 그 밖의 Google AdSense 등 데이터는 Google
                정책 또는 위탁 계약 종료 시까지 보유합니다.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              7. 이용자 및 법정대리인의 권리와 행사 방법
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              이용자는 언제든지 자신의 개인정보를 조회하거나 수정할 수 있으며, 개인정보의 처리 정지
              및 삭제(회원 탈퇴)를 요청할 수 있습니다. 권리 행사는 서비스 내 설정 화면 또는
              개인정보보호책임자에게 서면·이메일로 요청하실 수 있으며, 회사는 지체 없이 조치합니다.
            </p>
          </section>

          <section id="analytics-cookies" className="mb-10 scroll-mt-28">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              8. 쿠키(Cookie)의 운용
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              회사는 이용자에게 맞춤형 서비스를 제공하기 위하여 쿠키를 사용합니다. 쿠키는 이용자의
              브라우저에 저장되는 소량의 정보입니다. Google Analytics 분석 쿠키(<code>_ga</code>,{" "}
              <code>_ga_*</code>)는 방문자와 세션을 구분하며 기본 만료 기간은 최대 2년입니다.
              이 쿠키 만료 기간과 Google Analytics 서버의 데이터 보유 기간은 별개이며, 회사는
              Google Analytics 사용자·이벤트 단위 데이터를 회사 정책상 수집일로부터 14개월을
              초과해 보유하지 않도록 관리합니다. Google Analytics는 2026-09-10 12:00 KST부터
              사이트의 별도 선택창에서 &ldquo;국외이전·분석 허용&rdquo;을 선택한 경우에만 태그를
              불러오며, 허용 전이나 거부 후에는 Google로 분석 데이터를 전송하지 않습니다.
            </p>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              이용자는 선택창에서 거부할 수 있고, 이후 페이지 하단의 &ldquo;분석 쿠키 설정&rdquo;에서
              언제든지 동의를 철회하거나 다시 선택할 수 있습니다. 웹브라우저 설정에서 이 사이트의
              쿠키와 사이트 데이터(로컬 저장소 포함)를 삭제하면 선택값도 초기화되어, 다시 허용하기
              전에는 분석 태그를 불러오지 않습니다. 분석 쿠키를 거부해도 기사 열람 등 기본 서비스
              이용에는 제한이 없습니다.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              9. 개인정보의 안전성 확보 조치
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              회사는 개인정보의 안전성 확보를 위하여 비밀번호의 암호화, 해킹 등에 대비한 접근통제
              장치 설치 및 운영, 개인정보 취급 직원의 최소화 및 정기적인 교육 등 기술적·관리적 보호
              조치를 시행하고 있습니다.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="font-headline text-xl font-bold text-ink-900 dark:text-white sm:text-2xl">
              10. 개인정보보호책임자
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
                  <dd>{SITE.privacyOfficer}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 font-medium text-ink-700 dark:text-ink-200">
                    이메일
                  </dt>
                  <dd><PlainEmail address={PUBLIC_EMAILS.privacy} /></dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 font-medium text-ink-700 dark:text-ink-200">
                    전화
                  </dt>
                  <dd>{SITE.tel} (평일 09:00 ~ 18:00)</dd>
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
              11. 고지의 의무
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
              본 개인정보처리방침의 내용 추가, 삭제 및 수정이 있을 경우 시행일의 7일 전부터
              서비스 공지사항을 통하여 고지합니다. 다만, 이용자 권리의 중대한 변경이 발생할 때에는
              최소 30일 전에 고지합니다.
            </p>
          </section>

          <section className="mt-12 border-t border-ink-200 pt-8 dark:border-ink-800">
            <p className="leading-relaxed text-ink-600 dark:text-ink-300">
              이 개정 방침은 2026-09-10 12:00 KST부터 적용되며, 그 전까지는 2026년 8월
              17일 시행 방침이 적용됩니다.
            </p>
          </section>
        </article>
      </div>
    </>
  );
}
