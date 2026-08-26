import { OverviewPanel } from "@/pages/inbox/overview-panel.tsx";
import { memo } from "react";

import type { TodoEntity } from "@/backend/todo-service";

/**
 * The panel is handed exactly the todos the page beside it is about — the inbox
 * passes everything, a project page passes its own. A rail reporting numbers
 * the list next to it does not contain is worse than no rail.
 */
export const RightRail = memo(function RightRail(props: {
  todos: TodoEntity[] | undefined;
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
