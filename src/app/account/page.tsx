import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { AccountClient } from "./AccountClient";

export const metadata: Metadata = {
  title: "마이페이지",
  description: "모두일보 계정 정보를 확인하고 관리합니다.",
};

export default function AccountPage() {
  return (
    <>
      <PageHeader
        title="마이페이지"
        subtitle="계정 정보 확인·관리"
        breadcrumb={[{ label: "마이페이지" }]}
      />
      <section className="container-page py-10">
        <AccountClient />
      </section>
    </>
  );
}
