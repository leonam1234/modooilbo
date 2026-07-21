/**
 * 레이트리밋 — D1 원자 카운터(고정 창).
 *
 * ⚠️ 왜 KV를 버렸나(2026-07-15):
 *   기존 구현은 전부 `get → +1 → put`(read-modify-write)이었다. KV엔 원자 증감이 없어
 *   동시 요청이 같은 값을 읽고 같은 값을 쓰면 증가분이 통째로 사라진다 → 한도를 넘겨도
 *   카운터가 안 올라 제한이 뚫린다(댓글 도배·로그인 무차별 대입).
 *   게다가 호출부가 전부 `if (env.REACTIONS) { ...제한... }` 형태라 **바인딩이 없으면
 *   제한 자체가 사라졌다(fail-open)** — 잘못된 설정 하나로 무제한 통과.
 *
 * 지금 구조:
 *   · 원자성 — `INSERT ... ON CONFLICT DO UPDATE SET n = n + 1 RETURNING n` 단일 문.
 *     "증가시키고 나서 그 결과값으로 판정"하므로 경합에서도 한도를 넘길 수 없다.
 *   · fail-closed — DB 접근 실패는 예외를 그대로 던진다. 호출부가 잡아서 **거부**해야 한다
 *     (조용히 통과시키지 말 것. 그게 예전 fail-open 버그의 정체다).
 *
 * 창(window)은 고정 창이다: window_start = floor(now / 창길이).
 * 경계에서 최대 2배까지 몰릴 수 있으나(창 끝 + 다음 창 처음), 남용 억제 목적엔 충분하고
 * 슬라이딩 로그보다 훨씬 싸다.
 */

import { sha256Hex } from "./auth";

export interface RateLimitEnv {
  DB: any;
}

/** 레이트리밋 축 하나(예: IP축 5회/15분). */
export interface RateLimitRule {
  bucket: string;
  limit: number;
  windowSecs: number;
}

export interface RateLimitResult {
  /** 한도 이내인가(= 요청을 처리해도 되는가). */
  allowed: boolean;
  /** 이번 요청까지 포함한 현재 창의 누적 횟수. */
  count: number;
  /** 현재 창이 끝나는 시각(epoch ms) — 안내문에 남은 시간을 쓸 때. */
  resetAtMs: number;
}

/**
 * 버킷 카운터를 1 올리고 한도 이내인지 판정한다(원자적).
 * @throws D1 접근 실패 시 예외 — 호출부는 반드시 잡아서 거부(fail-closed)할 것.
 */
export async function hitRateLimit(
  env: RateLimitEnv,
  bucket: string,
  limit: number,
  windowSecs: number,
  nowMs: number,
  waitUntil?: (p: Promise<unknown>) => void,
): Promise<RateLimitResult> {
  const windowMs = windowSecs * 1000;
  const windowStart = Math.floor(nowMs / windowMs);

  const row = (await env.DB.prepare(
    `INSERT INTO rate_limits (bucket, window_start, n) VALUES (?1, ?2, 1)
     ON CONFLICT(bucket, window_start) DO UPDATE
       SET n = n + 1, updated_at = datetime('now','+9 hours')
     RETURNING n`,
  )
    .bind(bucket, windowStart)
    .first()) as { n?: number } | null;

  // RETURNING이 비는 건 정상 경로에선 불가능하다. 그래도 비면 "한도 초과"로 간주(fail-closed).
  const count = typeof row?.n === "number" ? row.n : limit + 1;

  // 새 창의 첫 요청일 때만 묵은 행 청소(D1엔 KV 같은 TTL이 없다). 빈도가 낮고
  // idx_rate_limits_updated 범위 스캔이라 대개 0행을 지우고 끝난다.
  if (count === 1) {
    const p = sweep(env);
    if (waitUntil) waitUntil(p);
    else await p;
  }

  return { allowed: count <= limit, count, resetAtMs: (windowStart + 1) * windowMs };
}

/**
 * 여러 축(IP·계정·사용자 …)을 **모두** 1씩 올리고 전 축이 한도 이내인지 판정한다.
 *
 * ⚠️ 어느 축이 걸리든 **모든 축을 빠짐없이 증가시킨 뒤** 판정한다(중간에 빠져나가지 않는다).
 *   축마다 "시도 횟수"의 의미를 일정하게 유지하기 위함이다.
 *
 * ⚠️ 트레이드오프(의도됨 — login.ts와 동일한 판단): 계정/이메일 축은 **남이 대신 태울 수 있다**.
 *   공격자가 피해자 주소로 한도만큼 요청하면 그 주소는 창이 끝날 때까지 막힌다(자가 해소).
 *   축이 IP뿐이면 분산 IP로 무력화되므로, 짧은 창(15분)을 조건으로 수용한다.
 *
 * @returns 전 축이 한도 이내면 true.
 * @throws D1 접근 실패 시 예외 — 호출부는 반드시 잡아서 거부(fail-closed)할 것.
 */
export async function hitRateLimits(
  env: RateLimitEnv,
  rules: RateLimitRule[],
  nowMs: number,
  waitUntil?: (p: Promise<unknown>) => void,
): Promise<boolean> {
  let allowed = true;
  for (const r of rules) {
    const res = await hitRateLimit(env, r.bucket, r.limit, r.windowSecs, nowMs, waitUntil);
    if (!res.allowed) allowed = false;
  }
  return allowed;
}

/**
 * 버킷 키 생성 — 식별자(IP·이메일·userId) **원문은 D1에 남기지 않는다**.
 * 용도별 솔트를 섞은 SHA-256만 저장하므로, rate_limits 테이블이 유출돼도
 * 누가 어떤 주소로 시도했는지 역산할 수 없다(같은 값이라도 scope/axis가 다르면 다른 해시).
 */
export async function rateBucket(
  scope: string,
  axis: "ip" | "acct" | "user",
  value: string,
): Promise<string> {
  return `${scope}:${axis}:${await sha256Hex(`modoo-rl-v1:${scope}:${axis}:${value}`)}`;
}

/** Cloudflare가 붙이는 실제 클라이언트 IP(위조 불가). 없으면 빈 문자열. */
export function clientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") || "";
}

/**
 * 성공 시 카운터 리셋(예: 로그인 성공 → 그 계정의 실패 누적 해제). 실패해도 치명적이지 않다.
 *
 * 🔴 **IP축은 리셋 대상이 아니다 — 성공 로그인으로 상쇄되면 스터핑 방어가 무너진다.**
 *   이 DELETE엔 window_start 조건이 없어 **해당 버킷의 현재 창 카운터가 통째로 사라진다**.
 *   IP축까지 넘기면 공격자가 자기 계정에 1회 정상 로그인하는 것만으로 그 IP의 누적 실패를
 *   전부 지울 수 있다 → 남의 계정에 7회씩 시도하고 자기 계정으로 리셋하는 사이클을 무한 반복
 *   (계정축은 계정마다 1씩만 올라 한도에 안 걸린다). 실제로 login.ts가 2026-07-21까지
 *   `[ipBucket, acctBucket]`을 넘겨 IP 제한이 무력화돼 있었다.
 *
 *   👉 여기에 넘겨도 되는 건 **"본인이 소유를 증명한 축"뿐**이다(계정·사용자축).
 *      IP처럼 **여러 주체가 공유하고 공격자가 임의로 고를 수 있는 축**은 넘기지 말 것.
 */
export async function resetRateLimit(env: RateLimitEnv, buckets: string[]): Promise<void> {
  if (!buckets.length) return;
  try {
    await env.DB.batch(
      // PK가 (bucket, window_start)라 bucket 접두 스캔으로 지워진다.
      buckets.map((b) => env.DB.prepare("DELETE FROM rate_limits WHERE bucket = ?1").bind(b)),
    );
  } catch {
    /* 리셋 실패는 무시 — 창이 지나면 자연히 풀린다. */
  }
}

/** 2일 지난 창 정리. 실패는 무시(청소는 요청 성패와 무관). */
async function sweep(env: RateLimitEnv): Promise<void> {
  try {
    await env.DB.prepare(
      "DELETE FROM rate_limits WHERE updated_at < datetime('now','+9 hours','-2 days')",
    ).run();
  } catch {
    /* noop */
  }
}
