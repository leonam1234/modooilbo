import { notFound } from "next/navigation";
import { getBizMenu } from "@/lib/biz-menus";
import { PageHeader } from "@/components/PageHeader";

/**
 * 신규 사업 메뉴의 "준비 중" 안내 페이지.
 * 콘텐츠(기사) 시스템이 붙기 전까지 404 대신 최소 안내를 보여 준다.
 */
export function BizComingSoon({ slug }: { slug: string }) {
  const menu = getBizMenu(slug);
  if (!menu) notFound();

  return (
    <>
      <PageHeader
        title={menu.name}
        subtitle={menu.description}
        breadcrumb={[{ label: menu.name }]}
      />
      <div className="container-page py-20">
        <p className="text-center text-lg font-headline text-ink-500 dark:text-ink-300">
          관련 기사를 준비하고 있습니다.
        </p>
        <p className="mt-2 text-center text-sm text-ink-400">
          곧 새로운 소식으로 찾아뵙겠습니다.
        </p>
      </div>
    </>
  );
}
