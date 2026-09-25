/**
 * /partners/* → 410 Gone.
 *
 * 광고·후원 계약사 명단 페이지는 2026-09-25 계약 전부 해지와 함께 폐지했다. 정적 export 에서
 * 파일이 사라지면 Pages 는 404 를 준다. 구글 문서상 404 와 410 은 색인 제거 면에서 같게
 * 취급되지만, 404 는 "없어진 건지 잠시 깨진 건지"를 재크롤로 확인하고 410 은 영구 삭제 신호라
 * 그 확인 없이 처리한다. 의미가 정확한 쪽을 골랐다. X-Robots-Tag 는 무해한 중복이지 근거가 아니다.
 *
 * 사람에게는 사이트의 404 페이지를 그대로 보여준다(빈 화면 대신). ASSETS 는 Pages 가
 * 정적 산출물에 자동으로 붙여 주는 바인딩이다.
 *
 * ⚠️ 이 파일을 지우면 조용히 404 로 돌아갈 뿐 사이트는 깨지지 않는다. 명단 페이지를
 *    되살릴 결정이 나면 이 파일부터 지워야 한다 — 남아 있으면 새 페이지가 410 에 가려진다.
 */
export const onRequest: PagesFunction<{ ASSETS: Fetcher }> = async ({ request, env }) => {
  const notFound = await env.ASSETS.fetch(new Request(new URL("/404.html", request.url), { method: "GET" }));
  const headers = new Headers(notFound.headers);
  headers.set("Cache-Control", "public, max-age=3600");
  headers.set("X-Robots-Tag", "noindex");
  return new Response(request.method === "HEAD" ? null : notFound.body, { status: 410, headers });
};
