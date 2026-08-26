import type { TodoEntity } from "@/backend/todo-service";
import { RightRail } from "@/pages/inbox/right-rail";

/**
 * The panel beside the list: what this page adds up to, and a calendar.
 *
 * Deliberately given the page's todos and *not* the reader's filter. The rail
 * summarises the view the page is titled after — a number that moves when you
 * type in the search box is not a summary of anything. That used to be a
 * comment; now it is the shape of the part, which cannot be passed a filter at
 * all.
 */
export function ListingRail({
  todos,
  highlight,
  selectedDay,
  onSelectDay,
}: {
  todos: TodoEntity[] | undefined;
  highlight?: { from: Date; to: Date };
  selectedDay?: Date;
  onSelectDay?: (day: Date | undefined) => void;
}) {
  return (
    <RightRail
      todos={todos}
      highlight={highlight}
      selectedDay={selectedDay}
      onSelectDay={onSelectDay}
    />
  );
}
