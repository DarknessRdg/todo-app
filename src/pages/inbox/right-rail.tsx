import { OverviewPanel } from "@/pages/inbox/overview-panel.tsx";

export function RightRail() {
  return (
    <aside className="sticky top-10 hidden w-[22rem] shrink-0 lg:block xl:w-[24rem]">
      <OverviewPanel />
    </aside>
  );
}
