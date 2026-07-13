import type { Metadata } from "next";
import { BizComingSoon } from "@/components/BizComingSoon";
import { getBizMenu } from "@/lib/biz-menus";

const menu = getBizMenu("startup")!;

export const metadata: Metadata = {
  title: menu.name,
  description: menu.description,
  alternates: { canonical: "/startup/" },
  robots: { index: false, follow: true }, // 준비 중(빈) 페이지 — 콘텐츠 붙으면 해제
};

export default function StartupPage() {
  return <BizComingSoon slug="startup" />;
}
