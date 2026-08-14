/**
 * 구조화 데이터(JSON-LD) 주입용 서버 컴포넌트.
 *
 * 임의의 schema.org 객체를 받아 <script type="application/ld+json">로 직렬화한다.
 * 서버 컴포넌트이므로 정적 export 시 SSG HTML에 그대로 포함된다(크롤러/AI 노출).
 *
 * 주의: data는 신뢰된 빌드타임 값만 전달할 것(사용자 입력 직접 주입 금지).
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify는 `<`를 이스케이프하지 않는다 — 기사 제목 등에 `</script>`가
      // 섞이면 스크립트 블록을 탈출한다(외부 원문을 옮겨 적는 파이프라인이라 방심 금물).
      // < 치환은 JSON 파서에겐 동일한 문자라 구조화 데이터 의미는 그대로다.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
