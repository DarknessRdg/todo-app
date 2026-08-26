import { createContext, useContext } from "react";

import type { TodoFilter, TodoSort } from "@/lib/todo-filter";

/**
 * What every part of a listing needs to know, published by `ListingContainer`.
 *
 * On a context rather than passed down as props: the parts are assembled by the
 * page, in whatever arrangement it likes, so there is no single chain to hand
 * anything along. It also means the bar and the list cannot disagree about
 * which filter is in force — there is one value, and both read it.
 */
export type ListingContextValue = {
  filter: TodoFilter;
  sort: TodoSort;
  setFilter: (filter: TodoFilter) => void;
  updateFilter: (change: (previous: TodoFilter) => TodoFilter) => void;
  setSort: (sort: TodoSort) => void;
  /**
   * Where this listing's collapsed sections are remembered. Derived from what
   * the page is about (`project:<id>`), never hand-written twice, or two views
   * quietly share one flag.
   */
  scopeKey: string;
};

export const ListingContext = createContext<ListingContextValue | undefined>(
  undefined
);

/**
 * The listing a part belongs to.
 *
 * Throws rather than falling back: a part rendered outside a container would
 * otherwise silently show an unfiltered list, which looks like a filter bug
 * rather than a missing wrapper.
 */
export function useListing(): ListingContextValue {
  const value = useContext(ListingContext);

  if (value === undefined) {
    throw new Error("A listing part must be rendered inside a ListingContainer");
  }

  return value;
}
