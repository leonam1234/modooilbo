/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Pages 정적 배포 최적화: 전 페이지 정적 export (서버리스/엣지 CDN)
  output: "export",
  // 정적 호스팅에서 폴더/index.html 구조로 안정적인 라우팅
  trailingSlash: true,
  images: {
    // 정적 export는 Next 이미지 최적화 서버를 사용하지 않음 → 원본 직접 서빙
    // (운영 시 Cloudflare Images 로더로 교체 가능)
    unoptimized: true,
  },
  eslint: {
    // ESLint 설정 파일 부재로 빌드가 막히지 않도록 (타입체크는 유지)
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
