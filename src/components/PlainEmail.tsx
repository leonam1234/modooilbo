import { Fragment, type ReactNode } from "react";

/**
 * Cloudflare Email Address Obfuscation 예외 처리.
 *
 * Cloudflare는 HTML의 이메일 주소와 mailto 링크를 엣지에서
 * `/cdn-cgi/l/email-protection#...` 링크로 바꾼다. JS가 차단된 브라우저와
 * 텍스트 크롤러에서는 이 링크를 복원할 수 없으므로, 공개 연락 창구는 공식 예외
 * 주석(`email_off`) 안에 둔다.
 *
 * JSX 주석은 산출 HTML에 남지 않는다. 특히 링크는 텍스트만 감싸서는 안 되고
 * 앵커 전체가 두 주석 사이에 있어야 하므로, 최종 문자열을 한 번에 삽입한다.
 */

export const PUBLIC_EMAILS = {
  help: "help@modooilbo.com",
  newsroom: "newsroom@modooilbo.com",
  correction: "correction@modooilbo.com",
  ombudsman: "ombudsman@modooilbo.com",
  youth: "youth@modooilbo.com",
  privacy: "privacy@modooilbo.com",
  tips: "tip@modooilbo.com",
  advertising: "ad@modooilbo.com",
  members: "members@modooilbo.com",
} as const;

export type PublicEmailAddress = (typeof PUBLIC_EMAILS)[keyof typeof PUBLIC_EMAILS];

const PUBLIC_EMAIL_SET = new Set<string>(Object.values(PUBLIC_EMAILS));
// 허용 주소 자체가 아니라 이메일 토큰 전체를 먼저 잡는다. 그렇지 않으면
// `privatehelp@modooilbo.com` 안의 `help@modooilbo.com` 부분만 보호 예외가 된다.
const EMAIL_IN_TEXT = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function assertPublicEmail(address: string): asserts address is PublicEmailAddress {
  if (!PUBLIC_EMAIL_SET.has(address)) {
    throw new Error(`Email obfuscation bypass received an untrusted address: ${address}`);
  }
}

function protectedTextHtml(address: PublicEmailAddress): string {
  return `<!--email_off-->${escapeHtml(address)}<!--/email_off-->`;
}

/**
 * 코드에 고정된 주소 또는 이메일 정규식으로 분리한 주소만 넘긴다.
 * 사용자 입력 전체를 address로 전달하지 않는다.
 */
export function PlainEmail({ address }: { address: PublicEmailAddress }) {
  assertPublicEmail(address);
  return <span dangerouslySetInnerHTML={{ __html: protectedTextHtml(address) }} />;
}

/** 기사·정책 문장 안의 공개 이메일도 JS 없이 평문으로 읽을 수 있게 보존한다. */
export function PlainEmailText({ text }: { text: string }) {
  const matches = [...text.matchAll(EMAIL_IN_TEXT)];
  if (matches.length === 0) return text;

  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const [i, match] of matches.entries()) {
    const start = match.index ?? 0;
    if (start > cursor) nodes.push(text.slice(cursor, start));
    const address = match[0].toLowerCase();
    if (PUBLIC_EMAIL_SET.has(address)) {
      nodes.push(<PlainEmail key={`${start}-${i}`} address={address as PublicEmailAddress} />);
    } else {
      // 미허용 주소는 원문 그대로 둬 Cloudflare의 기본 난독화 보호를 유지한다.
      nodes.push(match[0]);
    }
    cursor = start + match[0].length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <Fragment>{nodes}</Fragment>;
}

type PlainEmailLinkProps = {
  address: PublicEmailAddress;
  label?: string;
  subject?: string;
  body?: string;
  className?: string;
  icon?: "mail";
};

/**
 * 공개된 모두일보 상수 주소 전용 링크.
 *
 * 앵커와 표시 문자열을 모두 escape하고, 런타임에도 허용 목록을 확인한다. 이 컴포넌트에
 * 사용자 입력 주소를 넘기면 안 된다. subject/body는 URI 인코딩되므로 기사 제목처럼
 * 동적인 일반 텍스트를 안전하게 받을 수 있다.
 */
export function PlainEmailLink({
  address,
  label = address,
  subject,
  body,
  className,
  icon,
}: PlainEmailLinkProps) {
  assertPublicEmail(address);

  const query = [
    subject === undefined ? null : `subject=${encodeURIComponent(subject)}`,
    body === undefined ? null : `body=${encodeURIComponent(body)}`,
  ].filter((part): part is string => part !== null);
  const href = `mailto:${address}${query.length > 0 ? `?${query.join("&")}` : ""}`;
  const classAttribute = className ? ` class="${escapeHtml(className)}"` : "";
  const iconHtml = icon === "mail"
    ? '<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path></svg>'
    : "";
  const html = `<!--email_off--><a href="${escapeHtml(href)}"${classAttribute}>${iconHtml}${escapeHtml(label)}</a><!--/email_off-->`;

  // display:contents로 기존 앵커의 flex/grid 배치와 여백을 유지한다.
  return <span className="contents" dangerouslySetInnerHTML={{ __html: html }} />;
}
