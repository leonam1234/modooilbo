/**
 * JSON 요청 본문 공용 관문.
 *
 * Cloudflare의 요청 본문 상한(플랜에 따라 100MB 이상)은 Workers isolate 메모리
 * 상한보다 클 수 있다. `request.json()`은 검증 전에 본문 전체를 버퍼링하므로,
 * 작은 API 입력을 먼저 바이트 단위로 제한한 뒤 JSON 객체만 반환한다.
 *
 * Content-Type은 강제하지 않는다. sendBeacon과 기존 클라이언트가
 * `text/plain`으로 JSON을 보낼 수 있기 때문이다. 대신 브라우저가 보낸
 * Origin/Fetch Metadata/Referer로 교차 출처 변경 요청을 본문 처리 전에 거부한다.
 */

export const DEFAULT_JSON_BODY_LIMIT = 64 * 1024;

export type JsonObject = Record<string, unknown>;
export type JsonObjectResult =
  | { ok: true; value: JsonObject }
  | { ok: false; status: 400 | 403 | 413 };

function isCrossOriginBrowserRequest(request: Request): boolean {
  const target = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  // Origin은 경로 없는 직렬화된 출처다. null, 접미 도메인, 형제 서브도메인도 거부한다.
  if (origin !== null && origin !== target) return true;
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site" || site === "same-site") return true;
  // Origin이 없는 구형 브라우저의 대체 근거. 접두 문자열 비교를 하지 않는다.
  if (origin === null) {
    const referer = request.headers.get("referer");
    if (referer !== null) {
      try {
        if (new URL(referer).origin !== target) return true;
      } catch {
        return true;
      }
    }
  }
  // 브라우저 출처 헤더 없는 기존 서버 클라이언트는 유지한다. 인증/레이트리밋의 대체가 아니다.
  return false;
}

export async function readJsonObject(
  request: Request,
  maxBytes = DEFAULT_JSON_BODY_LIMIT,
): Promise<JsonObjectResult> {
  if (isCrossOriginBrowserRequest(request)) return { ok: false, status: 403 };
  const contentLength = request.headers.get("content-length");
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > maxBytes) {
    return { ok: false, status: 413 };
  }

  if (!request.body) return { ok: false, status: 400 };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        // 공격자가 취소 완료를 지연하는 스트림을 보낼 수 있으므로 기다리지 않는다.
        // 이미 상한을 넘었다는 판정은 확정됐고, 취소 실패도 응답 상태를 바꾸면 안 된다.
        void reader.cancel().catch(() => {});
        return { ok: false, status: 413 };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400 };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return { ok: false, status: 400 };
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, status: 400 };
  }
  return { ok: true, value: value as JsonObject };
}
