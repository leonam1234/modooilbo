import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { SITE } from "@/lib/site";

const FOOTER_COLS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "회사",
    links: [
      { href: "/about", label: "회사소개" },
      { href: "/careers", label: "인재채용·기자모집" },
      { href: "/ethics", label: "윤리강령·편집위원회" },
      { href: "/transparency", label: "투명성 보고" },
      { href: "/advertise", label: "광고·제휴 문의" },
    ],
  },
  {
    title: "서비스",
    links: [
      { href: "/subscribe", label: "구독·후원 안내" },
      { href: "/newsletter", label: "뉴스레터" },
      { href: "https://www.youtube.com/@모두일보", label: "유튜브 채널" },
      { href: "/tips", label: "제보하기" },
      { href: "/contact", label: "고객센터" },
    ],
  },
  {
    title: "약관·정책",
    links: [
      { href: "/terms", label: "이용약관" },
      { href: "/policy", label: "운영정책" },
      { href: "/privacy", label: "개인정보처리방침" },
      { href: "/ethics", label: "청소년보호정책" },
      { href: "/corrections", label: "정정보도 모음" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="paper-band mt-16 border-t-2 border-ink-900 dark:border-ink-700">
      <div className="container-page py-12">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          {/* 브랜드 + SNS */}
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-sm bg-signal-600 font-headline text-base font-black text-white">
                M
              </span>
              <span className="font-headline text-2xl font-extrabold text-ink-900 dark:text-white">
                모두<span className="text-signal-600">일보</span>
              </span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-500 dark:text-ink-400">
              모두를 위한 신뢰의 뉴스. 모두일보는 신뢰할 수 있는 사실과 깊이 있는 분석으로
              더 나은 공론장을 만듭니다.
            </p>
            <a
              href="mailto:help@modooilbo.com?subject=%5B%EB%AA%A8%EB%91%90%EC%9D%BC%EB%B3%B4%5D%20%EA%B8%B0%EC%97%85%20%EB%AC%B8%EC%9D%98&body=%ED%9A%8C%EC%82%AC%EB%AA%85%3A%0A%EB%8B%B4%EB%8B%B9%EC%9E%90%3A%0A%EC%97%B0%EB%9D%BD%EC%B2%98%3A%0A%EB%AC%B8%EC%9D%98%20%EB%82%B4%EC%9A%A9%3A%0A"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-700 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
              기업 문의
            </a>
            {/* 섹션 빠른 이동 */}
            <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-500 dark:text-ink-400">
              {CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <Link prefetch={false} href={`/${c.slug}`} className="hover:text-signal-600">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
            {/* 공식 SNS — SITE.sameAs에 실계정 URL이 있을 때만 렌더(데드링크 방지) */}
            {SITE.sameAs.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-500 dark:text-ink-400">
                {SITE.sameAs.map((url) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-signal-600"
                    >
                      {new URL(url).hostname.replace(/^www\./, "")}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 링크 컬럼 */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {FOOTER_COLS.map((col) => (
              <div key={col.title}>
                <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">{col.title}</h3>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link prefetch={false}
                        href={l.href}
                        className="text-sm text-ink-500 hover:text-signal-600 dark:text-ink-400"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* 법적 정보 */}
        <div className="mt-10 border-t border-ink-200 pt-6 text-xs leading-relaxed text-ink-400 dark:border-ink-800">
          <p className="flex flex-wrap gap-x-3 gap-y-1">
            <span>{SITE.legalName}</span>
            <span>{`대표이사·발행인 ${SITE.publisher}`}</span>
            <span>{`편집인 ${SITE.editor}`}</span>
            <span>{`청소년보호책임자 ${SITE.youthOfficer}`}</span>
            <span>{`고충처리인 ${SITE.ombudsman}`}</span>
          </p>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <span>{SITE.address}</span>
            <span>{`등록번호 ${SITE.regNumber}`}</span>
            <span>{`등록일 ${SITE.regDate}`}</span>
            <span>{`대표전화 ${SITE.tel}`}</span>
            <span>{`이메일 ${SITE.email}`}</span>
          </p>
          <p className="mt-4 text-ink-400">
            {`© ${SITE.copyrightYear} MODOO ILBO. All rights reserved.`}
          </p>
        </div>
      </div>
    </footer>
  );
}
