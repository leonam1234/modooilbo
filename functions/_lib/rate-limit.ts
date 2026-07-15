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

export interface RateLimitEnv {
  DB: any;
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

/** 성공 시 카운터 리셋(예: 로그인 성공 → 실패 누적 해제). 실패해도 치명적이지 않다. */
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
