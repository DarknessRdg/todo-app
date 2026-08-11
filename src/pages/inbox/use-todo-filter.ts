import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

import {
  parseTodoFilter,
  todoFilterToParams,
  type TodoFilter,
} from "@/lib/todo-filter";

/**
 * The list filter, held in the url.
 *
 * Replaces rather than pushes: narrowing a list is not a place the reader
 * navigated to, and a history entry per keystroke would make Back mean
 * "undo one letter of my search".
 */
export function useTodoFilter() {
  const [params, setParams] = useSearchParams();

  const filter = useMemo(() => parseTodoFilter(params), [params]);

  /**
   * Takes the previous filter rather than a value, so it can be handed to a
   * memoised child without changing identity on every keystroke — the calendar
   * in the rail is a month of buttons and has no business redrawing because a
   * letter was typed in the search box.
   */
  const updateFilter = useCallback(
    (change: (previous: TodoFilter) => TodoFilter) => {
      setParams(
        (previous) => {
          const next = todoFilterToParams(change(parseTodoFilter(previous)));

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

  const setFilter = useCallback(
    (next: TodoFilter) => updateFilter(() => next),
    [updateFilter]
  );

  return { filter, setFilter, updateFilter };
}
