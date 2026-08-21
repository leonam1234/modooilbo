/**
 * 리퀴드 글라스 굴절 필터 정의 — 화면에 아무것도 그리지 않는 정의 전용 SVG.
 *
 * `.glass` 계열이 `backdrop-filter: url(#lg-*)` 로 이 필터를 참조한다.
 * 이 컴포넌트를 layout 에서 빼면 굴절이 조용히 사라진다(에러는 안 난다).
 *
 * ⚠️ 크로미움 전용이다. 사파리·파이어폭스는 backdrop-filter 에서 url() 을 받지 않아
 *    globals.css 의 @supports 가 걸러내고 기존 blur 유리로 남는다. 그쪽이 기본값이다.
 *
 * ⚠️ scale 은 픽셀 절대값이다 — 요소 짧은 변의 8~15% 가 기준.
 *    작은 크롬(버튼·탭)에 큰 값을 넣으면 배경이 찢어진다.
 *
 * ⚠️ color-interpolation-filters="sRGB" 를 빼지 말 것. 기본값(linearRGB)이면 색이 씻긴다.
 */
export function GlassFilters() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
      <defs>
        {/* 작은 플로팅 크롬(맨위로 버튼·랭킹 탭) — 44px 안팎 */}
        <filter id="lg-sm" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.045 0.06" numOctaves={2} seed={9} result="n" />
          <feGaussianBlur in="n" stdDeviation="1" result="ns" />
          <feDisplacementMap in="SourceGraphic" in2="ns" scale="8" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* 넓은 패널(검색 오버레이·모바일 드로어) */}
        <filter id="lg-lg" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.024" numOctaves={2} seed={9} result="n" />
          <feGaussianBlur in="n" stdDeviation="1.3" result="ns" />
          <feDisplacementMap in="SourceGraphic" in2="ns" scale="14" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
