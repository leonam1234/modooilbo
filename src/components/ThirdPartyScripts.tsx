"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { AdSenseLoader } from "@/components/AdSenseLoader";

/**
 * 서드파티 스크립트(Clarity 세션 리플레이 · AdSense)를 **인증 착지 경로에서는 로드하지 않는다.**
 *
 * [왜] 비밀번호 재설정·가입확인·이메일 인증 토큰이 URL 쿼리스트링에 실려 온다:
 *   /reset/?token=<64hex>          1시간 유효 · 쓰면 비밀번호 교체 + 자동 로그인
 *   /verify-signup/?token=<64hex>  24시간 유효
 *   /verify-email/?token=<64hex>   30분 유효
 * Clarity 는 세션 리플레이 도구라 페이지 URL을 녹화에 그대로 저장하고, AdSense 는
 * 컨텍스트 타깃팅을 위해 URL을 광고 요청에 실어 보낸다. 즉 **계정 탈취용 1회성 토큰이
 * 외부 SaaS 로그에 평문으로 쌓인다.** 서버는 토큰을 SHA-256으로만 저장하는데(_lib/auth.ts)
 * 정작 원문이 밖으로 새면 그 노력이 통째로 무의미해진다.
 * Referrer-Policy(public/_headers)로는 못 막는다 — 이건 Referer 가 아니라 같은 오리진에서
 * 실행되는 자바스크립트다.
 *
 * [범위] 아래 경로에서만 뺀다. 나머지 페이지의 분석·광고는 그대로다.
 * 토큰을 프래그먼트(#)로 옮기는 개선과 병행 가능하지만, 그건 메일 링크 형식과
 * 프론트 파싱을 함께 바꿔야 해서 별건으로 둔다. 이 차단만으로도 유출 경로는 닫힌다.
 */
const TOKEN_PATHS = ["/reset", "/verify-signup", "/verify-email", "/forgot"];

const CLARITY_PROJECT = "y04dqzduac";

function isTokenPath(pathname: string): boolean {
  return TOKEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function ThirdPartyScripts() {
  const pathname = usePathname() || "/";
  const blocked = isTokenPath(pathname);

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

  if (blocked) return null;
  return <AdSenseLoader />;
}
