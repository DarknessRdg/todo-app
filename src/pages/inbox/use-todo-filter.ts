import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

import {
  parseTodoListView,
  todoListViewToParams,
  type TodoFilter,
  type TodoSort,
} from "@/lib/todo-filter";

/**
 * How a list is being read — what it hides and what order it is in — held in
 * the url.
 *
 * Replaces rather than pushes: narrowing a list is not a place the reader
 * navigated to, and a history entry per keystroke would make Back mean
 * "undo one letter of my search".
 *
 * Filter and sort are written together through `todoListViewToParams` rather
 * than separately, because this replaces the whole query string: a sort param
 * set anywhere else would be dropped by the next letter typed in the search
 * box.
 */
export function useListView() {
  const [params, setParams] = useSearchParams();

  const { filter, sort } = useMemo(() => parseTodoListView(params), [params]);

  const update = useCallback(
    (change: (previous: { filter: TodoFilter; sort: TodoSort }) => {
      filter: TodoFilter;
      sort: TodoSort;
    }) => {
      setParams(
        (previous) => {
          const next = todoListViewToParams(
            change(parseTodoListView(previous))
          );

          // `?todo=<id>` is the open modal, not a filter — writing the filter
          // must not close a todo the reader is reading.
          const openTodo = previous.get("todo");
          if (openTodo !== null) next.set("todo", openTodo);

          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  /**
   * Takes the previous filter rather than a value, so it can be handed to a
   * memoised child without changing identity on every keystroke — the calendar
   * in the rail is a month of buttons and has no business redrawing because a
   * letter was typed in the search box.
   */
  const updateFilter = useCallback(
    (change: (previous: TodoFilter) => TodoFilter) =>
      update((view) => ({ ...view, filter: change(view.filter) })),
    [update]
  );

  const setFilter = useCallback(
    (next: TodoFilter) => updateFilter(() => next),
    [updateFilter]
  );

  const setSort = useCallback(
    (next: TodoSort) => update((view) => ({ ...view, sort: next })),
    [update]
  );

  return { filter, sort, setFilter, updateFilter, setSort };
}
