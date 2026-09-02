"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { AdSenseLoader } from "@/components/AdSenseLoader";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { isThirdPartyTokenPath } from "@/lib/google-analytics";

/**
 * 이 컴포넌트가 관리하는 서드파티 도구(Clarity · AdSense 보조 로더 · GA4)를
 * **인증 착지 경로에서는 로드하지 않는다.**
 *
 * [왜] 비밀번호 재설정·가입확인·이메일 인증 토큰이 URL 쿼리스트링에 실려 온다:
 *   /reset/?token=<64hex>          1시간 유효 · 쓰면 비밀번호 교체 + 자동 로그인
 *   /verify-signup/?token=<64hex>  24시간 유효
 *   /verify-email/?token=<64hex>   30분 유효
 * Clarity 같은 클라이언트 도구는 현재 URL을 외부 요청에 포함할 수 있다. 즉 **계정 탈취용
 * 1회성 토큰이 외부 SaaS 로그에 평문으로 쌓일 수 있다.** 서버는 토큰을 SHA-256으로만
 * 저장하므로(_lib/auth.ts) 원문이 브라우저 밖으로 나가지 않게 해야 한다.
 * 전역 Referrer-Policy(public/_headers)만으로는 같은 오리진에서 실행되는 자바스크립트의
 * URL 접근을 막을 수 없으므로, 토큰 문서에는 더 강한 경로별 차단이 필요하다.
 *
 * [범위] 아래 경로에서만 뺀다. 나머지 페이지의 분석·광고는 그대로다.
 * 토큰을 프래그먼트(#)로 옮기는 개선과 병행 가능하지만, 그건 메일 링크 형식과
 * 프론트 파싱을 함께 바꿔야 해서 별건으로 둔다. 이 컴포넌트 바깥에 있는 RootLayout의
 * AdSense 심사용 head 태그와 조건부 Cloudflare Web Analytics beacon은 Cloudflare
 * Pages의 경로별 middleware가 실제 태그와 Next Flight 직렬화 노드를 함께 제거한다.
 */
const CLARITY_PROJECT = "y04dqzduac";

export function ThirdPartyScripts() {
  const pathname = usePathname() || "/";
  const blocked = isThirdPartyTokenPath(pathname);

  useEffect(() => {
    if (blocked) return;
    if (typeof window === "undefined") return;
    // 이미 붙었으면 다시 붙이지 않는다(라우트 이동마다 스크립트가 늘어나면 안 된다).
    if (document.getElementById("clarity-tag")) return;
    const w = window as any;
    w.clarity =
      w.clarity ||
      function (...args: unknown[]) {
        (w.clarity.q = w.clarity.q || []).push(args);
      };
    const t = document.createElement("script");
    t.id = "clarity-tag";
    t.async = true;
    t.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT}`;
    document.head.appendChild(t);
  }, [blocked]);

  return (
    <>
      <GoogleAnalytics blocked={blocked} />
      {!blocked && <AdSenseLoader />}
    </>
  );
}
