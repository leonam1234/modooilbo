import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { WeatherClient } from "./WeatherClient";

export const metadata: Metadata = {
  title: "날씨",
  description: "전국 주요 도시 현재 날씨와 주간 예보",
};

export default function WeatherPage() {
  return (
    <>
      <PageHeader title="날씨" subtitle="현재 날씨와 주간 예보" breadcrumb={[{ label: "날씨" }]} />
      <div className="container-page max-w-4xl py-10">
        <WeatherClient />
      </div>
    </>
  );
}
