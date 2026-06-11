import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

const FOOTER_COLS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "회사",
    links: [
      { href: "/about", label: "회사소개" },
      { href: "/careers", label: "인재채용·기자모집" },
      { href: "/ethics", label: "윤리강령·편집위원회" },
      { href: "/advertise", label: "광고·제휴 문의" },
    ],
  },
  {
    title: "서비스",
    links: [
      { href: "/subscribe", label: "구독·후원 안내" },
      { href: "/newsletter", label: "뉴스레터" },
      { href: "/tips", label: "제보하기" },
      { href: "/contact", label: "고객센터" },
    ],
  },
  {
    title: "약관·정책",
    links: [
      { href: "/terms", label: "이용약관" },
      { href: "/privacy", label: "개인정보처리방침" },
      { href: "/ethics", label: "청소년보호정책" },
      { href: "/advertise", label: "광고문의" },
    ],
  },
];

const SNS = ["X", "f", "Y", "in"];

export function Footer() {
  return (
    <footer className="mt-16 border-t-2 border-ink-900 bg-ink-50 dark:border-ink-700 dark:bg-ink-950">
      <div className="container-page py-12">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          {/* 브랜드 + SNS */}
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-sm bg-signal-600 font-headline text-base font-black text-white">
                S
              </span>
              <span className="font-headline text-2xl font-extrabold text-ink-900 dark:text-white">
                시그널<span className="text-signal-600">저널</span>
              </span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-500 dark:text-ink-400">
              노이즈 속에서 신호를 읽습니다. 시그널저널은 신뢰할 수 있는 사실과 깊이 있는 분석으로
              더 나은 공론장을 만듭니다.
            </p>
            <div className="mt-5 flex gap-2">
              {SNS.map((s) => (
                <a
                  key={s}
                  href="#"
                  aria-label={`시그널저널 ${s}`}
                  className="grid h-9 w-9 place-items-center rounded-full border border-ink-300 text-sm font-bold text-ink-600 transition-colors hover:border-signal-500 hover:bg-signal-600 hover:text-white dark:border-ink-700 dark:text-ink-300"
                >
                  {s}
                </a>
              ))}
            </div>
            {/* 섹션 빠른 이동 */}
            <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-500 dark:text-ink-400">
              {CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <Link href={`/${c.slug}`} className="hover:text-signal-600">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 링크 컬럼 */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {FOOTER_COLS.map((col) => (
              <div key={col.title}>
                <h3 className="mb-3 text-sm font-bold text-ink-900 dark:text-white">{col.title}</h3>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
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
            <span>(주)시그널저널</span>
            <span>대표이사·발행인 한도현</span>
            <span>편집인 윤서진</span>
            <span>청소년보호책임자 김민재</span>
          </p>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <span>서울특별시 중구 세종대로 124 시그널빌딩</span>
            <span>등록번호 서울 아00000</span>
            <span>등록일 2026.01.01</span>
            <span>대표전화 02-0000-0000</span>
            <span>이메일 contact@signaljournal.kr</span>
          </p>
          <p className="mt-4 text-ink-400">
            © 2026 SIGNAL JOURNAL. All rights reserved. · 본 사이트의 모든 콘텐츠는 데모용 가상
            데이터입니다.
          </p>
        </div>
      </div>
    </footer>
  );
}
