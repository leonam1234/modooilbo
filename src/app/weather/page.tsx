import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { WeatherClient } from "./WeatherClient";

export const metadata: Metadata = {
  title: "날씨",
  description: "전국 주요 도시 현재 날씨와 주간 예보를 제공합니다. 기상 관측 자료를 바탕으로 도시별 기온과 하늘 상태, 앞으로 일주일의 흐름을 한 화면에서 확인할 수 있습니다. 외출과 일정 계획에 참고하십시오. 지역을 바꿔 원하는 도시의 예보를 볼 수 있습니다.",
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
