#!/usr/bin/env node
/**
 * 주간 뉴스레터 발송 — launchd(com.modooilbo.newsletter)가 매주 월 08:00 실행.
 * 대상: newsletter_subs 전체 + 회원 중 뉴스레터 동의(users.newsletter=1, 합성 이메일 제외)
 * 내용: 지난주 가장 많이 읽힌 뉴스 TOP 5 (/api/most-read + articles-index)
 * 발송: modooilbo-mailer 워커 경유(개별 발송, 수신거부 서명 링크 포함)
 * 실행 로그: iCloud backups/d1/newsletter.log
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const REPO = join(homedir(), "GIT/modooilbo");
const LOG = join(
  homedir(),
  "Library/Mobile Documents/com~apple~CloudDocs/Documents/Codex/모두일보/backups/d1/newsletter.log",
);
const MAILER = "https://modooilbo-mailer.bridzzikorea.workers.dev";

function log(msg) {
  const line = `${new Date().toISOString().slice(0, 19)} ${msg}`;
  console.log(line);
  try { appendFileSync(LOG, line + "\n"); } catch {}
}

// 1) 수신자 목록 (D1 remote)
const key = execFileSync("security", ["find-generic-password", "-s", "modooilbo-mailer-key", "-w"]).toString().trim();
const q =
  "SELECT email FROM newsletter_subs UNION SELECT email FROM users WHERE newsletter = 1 AND email NOT LIKE '%@users.modooilbo.com'";
const raw = execFileSync(
  join(REPO, "node_modules/.bin/wrangler"),
  ["d1", "execute", "modooilbo-members", "--remote", "--json", "--command", q],
  { cwd: REPO },
).toString();
const rows = JSON.parse(raw)[0]?.results ?? [];
const emails = rows.map((r) => r.email);
if (!emails.length) { log("SKIP 수신자 0명"); process.exit(0); }

// 2) 지난주 많이 본 TOP 5
const most = await (await fetch("https://modooilbo.com/api/most-read")).json();
const index = await (await fetch("https://modooilbo.com/articles-index.json")).json();
const byId = new Map(index.map((a) => [a.id, a]));
const top = (most.items ?? []).map((x) => byId.get(x.id)).filter(Boolean).slice(0, 5);
if (top.length < 3) { log("SKIP 기사 부족"); process.exit(0); }

const listHtml = top
  .map(
    (a, i) =>
      `<tr><td style="padding:10px 0;border-bottom:1px solid #eee"><span style="font-weight:800;color:#999">${i + 1}</span>&nbsp;&nbsp;<a href="https://modooilbo.com/article/${a.slug}/" style="color:#191919;text-decoration:none;font-weight:600">${a.title}</a></td></tr>`,
  )
  .join("");

let sent = 0, failed = 0;
for (const to of emails) {
  const sig = createHash("sha256").update(to.toLowerCase() + key).digest("hex");
  const unsub = `https://modooilbo.com/api/newsletter?unsub=${encodeURIComponent(to.toLowerCase())}&t=${sig}`;
  const html = `<div style="font-family:'Apple SD Gothic Neo',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#191919">
    <h2 style="font-weight:800;margin:0">모두<span style="color:#6b6b73">일보</span></h2>
    <p style="color:#777;font-size:13px;margin:4px 0 20px">균형 있게 보는 오늘의 뉴스 — 주간 브리핑</p>
    <p style="line-height:1.7">지난 한 주, 독자들이 가장 많이 읽은 뉴스입니다.</p>
    <table style="width:100%;border-collapse:collapse">${listHtml}</table>
    <p style="margin-top:24px"><a href="https://modooilbo.com" style="display:inline-block;background:#191919;color:#fff;text-decoration:none;font-weight:700;padding:11px 22px;border-radius:8px">모두일보에서 더 보기</a></p>
    <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0"/>
    <p style="font-size:12px;color:#999;line-height:1.7">이 메일은 모두일보 뉴스레터 구독자에게 발송되었습니다.<br/><a href="${unsub}" style="color:#999">수신거부</a> · help@modooilbo.com</p>
  </div>`;
  try {
    const r = await fetch(MAILER, {
      method: "POST",
      headers: { "x-mailer-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        to,
        from: { email: "no-reply@modooilbo.com", name: "모두일보" },
        replyTo: { email: "help@modooilbo.com" },
        subject: `[모두일보] 이번 주 가장 많이 읽힌 뉴스 — ${top[0].title.slice(0, 30)}…`,
        text: top.map((a, i) => `${i + 1}. ${a.title}\nhttps://modooilbo.com/article/${a.slug}/`).join("\n\n") + `\n\n수신거부: ${unsub}`,
        html,
      }),
    });
    r.ok ? sent++ : failed++;
  } catch {
    failed++;
  }
  await new Promise((res) => setTimeout(res, 400)); // 발송 간격
}
log(`OK 발송 ${sent}건 / 실패 ${failed}건 / TOP: ${top[0].title.slice(0, 30)}`);
