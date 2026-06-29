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
      // schema.org 데이터는 빌드타임 상수에서 생성됨
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
