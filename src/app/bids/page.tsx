import type { Metadata } from "next";
import { CategoryListPage, categoryMetadata } from "@/components/CategoryListPage";

// 공공입찰 — 기업 데이터 뉴스 '사업' 축의 정식 카테고리 목록 페이지.
// 정적 export를 위해 물리 라우트로 존재하되, 화면·메타데이터 구현은 종합뉴스 [category]와
// 공유한다(CategoryListPage). 라우트별로 다른 것은 슬러그뿐이다.
export const metadata: Metadata = categoryMetadata("bids");

export default function BidsPage() {
  return <CategoryListPage slug="bids" />;
}
