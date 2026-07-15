/**
 * 메일 발송 공용 유틸 — Pages Functions 전용.
 *
 * 경로: Pages는 send_email 바인딩을 지원하지 않는다(2026-07 확인) → 전용 Worker
 *   (modooilbo-mailer, MAILER_URL + MAILER_KEY) 경유. 바인딩(EMAIL)이 생기면 그쪽 우선.
 * 발신은 항상 no-reply@modooilbo.com, 회신은 help@modooilbo.com.
 *
 * request-reset.ts · request-email.ts · newsletter.ts가 같은 본문 조립·발송 코드를
 * 각자 복사해 두고 있어 하나로 합쳤다(동작은 종전과 동일).
 */

export interface MailerEnv {
  /** CF Email 바인딩(현재 Pages 미지원 — 생기면 자동으로 우선 사용). */
  EMAIL?: any;
  MAILER_URL?: string;
  MAILER_KEY?: string;
}

export const MAIL_FROM = { email: "no-reply@modooilbo.com", name: "모두일보" } as const;
export const MAIL_REPLY_TO = { email: "help@modooilbo.com" } as const;

/** 메일 HTML에 들어가는 사용자 입력(닉네임·이메일 등) 이스케이프 — HTML 주입 방지. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 랜덤 토큰(hex). 메일 링크용 1회용 토큰 생성에 쓴다. */
export function randHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 모두일보 메일 공통 레이아웃(로고 + 본문 + 꼬리말). */
export function mailShell(bodyHtml: string, footerHtml: string): string {
  return `<div style="font-family:'Apple SD Gothic Neo',AppleGothic,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#191919">
  <h2 style="font-weight:800;margin:0 0 16px">모두<span style="color:#6b6b73">일보</span></h2>
  ${bodyHtml}
  <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0"/>
  <p style="font-size:12px;color:#999;line-height:1.7">${footerHtml}</p>
</div>`;
}

/** 검정 알약 버튼(메일 CTA). */
export function mailButton(link: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${link}" style="display:inline-block;background:#191919;color:#fff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:8px">${label}</a></p>
  <p style="font-size:13px;color:#777;line-height:1.7">버튼이 안 되면 링크를 복사해 주소창에 붙여넣으세요:<br/><a href="${link}" style="color:#555">${link}</a></p>`;
}

/** 발송. 성공 여부만 돌려준다(예외는 삼키고 false). */
export async function sendMail(
  env: MailerEnv,
  msg: { to: string; subject: string; text: string; html: string },
): Promise<boolean> {
  const { to, subject, text, html } = msg;
  try {
    if (env.EMAIL?.send) {
      await env.EMAIL.send({ to, from: MAIL_FROM, subject, text, html, replyTo: MAIL_REPLY_TO });
      return true;
    }
    if (env.MAILER_URL && env.MAILER_KEY) {
      const res = await fetch(env.MAILER_URL, {
        method: "POST",
        headers: { "x-mailer-key": env.MAILER_KEY, "content-type": "application/json" },
        body: JSON.stringify({ to, from: MAIL_FROM, replyTo: MAIL_REPLY_TO, subject, text, html }),
      });
      return res.ok;
    }
  } catch {
    /* 발송 실패는 false */
  }
  return false;
}
