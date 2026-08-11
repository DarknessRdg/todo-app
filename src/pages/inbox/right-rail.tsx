import { OverviewPanel } from "@/pages/inbox/overview-panel.tsx";
import { memo } from "react";

/**
 * `projectId` narrows the panel to the todos the page beside it is showing —
 * the inbox passes nothing and counts everything, a project page passes its own
 * id. A rail reporting numbers the list next to it does not contain is worse
 * than no rail.
 */
export const RightRail = memo(function RightRail(props: {
  projectId?: string;
  dueOn?: Date;
  /** The days the list is filtered to, drawn behind the dates. */
  highlight?: { from: Date; to: Date };
  selectedDay?: Date;
  /** Present when the calendar is a control, not just a picture. */
  onSelectDay?: (day: Date | undefined) => void;
}) {
  return (
    <aside className="sticky top-10 hidden w-[22rem] shrink-0 lg:block xl:w-[24rem]">
      <OverviewPanel {...props} />
    </aside>
  );
});
