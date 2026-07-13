import type { Metadata } from "next";
import { BizComingSoon } from "@/components/BizComingSoon";
import { getBizMenu } from "@/lib/biz-menus";

const menu = getBizMenu("deals")!;

export const metadata: Metadata = {
  title: menu.name,
  description: menu.description,
  alternates: { canonical: "/deals/" },
  robots: { index: false, follow: true }, // 준비 중(빈) 페이지 — 콘텐츠 붙으면 해제
};

export default function DealsPage() {
  return <BizComingSoon slug="deals" />;
}
