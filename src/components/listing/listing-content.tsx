import type { ReactNode } from "react";

import type { TodoEntity } from "@/backend/todo-service";
import { useListing } from "@/components/listing/listing-context";
import { TodoList } from "@/pages/inbox/list";

/**
 * The list itself: the todos this page is about, narrowed and ordered by
 * whatever the reader asked for.
 *
 * The todos come in as a prop rather than being fetched here. One query holds
 * every todo under one key — narrowing inside would mean a cache entry per view
 * and another thing for every mutation to invalidate — so the page picks its
 * own with a selector from `@/lib/todo-scope` and hands the result down.
 *
 * `undefined` means the query has not answered yet, which is not the same as a
 * page with nothing on it: one draws a skeleton, the other an empty state.
 */
export function ListingContent({
  todos,
  empty,
  sections = "split",
}: {
  todos: TodoEntity[] | undefined;
  /** What stands in for an empty list, when "Inbox zero" is the wrong words. */
  empty?: ReactNode;
  /**
   * `flat` puts everything in one list instead of splitting open from done —
   * for a page that is already only one of the two, where an open section would
   * be empty by construction.
   */
  sections?: "split" | "flat";
}) {
  const { filter, sort, scopeKey } = useListing();

  return (
    <TodoList
      todos={todos}
      filter={filter}
      sort={sort}
      scope={scopeKey}
      sections={sections}
      empty={empty}
    />
  );
}
