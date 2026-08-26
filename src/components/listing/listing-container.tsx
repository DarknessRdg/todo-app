import type { ReactNode } from "react";

import { useListView } from "@/pages/inbox/use-todo-filter";
import { ListingContext } from "@/components/listing/listing-context";

/**
 * A list of todos, and everything a reader can do to one.
 *
 * The parts are assembled by the page rather than configured through props:
 * every view of this app is the same list asking a different question, and the
 * differences are which todos it is handed, what it pins on capture, and which
 * of the reader's controls make sense on it. Composition says all three by
 * being written down, and a page that needs its own banner simply writes one.
 *
 * This part owns the url — the filter and the sort together — and publishes it
 * to the rest through context, so the bar and the list cannot drift apart.
 */
export function ListingContainer({
  scopeKey,
  children,
}: {
  /**
   * Where this listing's collapsed sections are remembered, and what tells two
   * views apart. Derive it (`project:<id>`) rather than writing it twice.
   */
  scopeKey: string;
  children: ReactNode;
}) {
  const { filter, sort, setFilter, updateFilter, setSort } = useListView();

  return (
    <ListingContext.Provider
      value={{ filter, sort, setFilter, updateFilter, setSort, scopeKey }}>
      <div className="flex items-start gap-8">{children}</div>
    </ListingContext.Provider>
  );
}

/**
 * The reading column. Takes whatever the page puts in it — the header, the
 * capture bar, the filters, the list, and anything else that view happens to
 * want, which is what a `banner` prop would otherwise have had to stand in for.
 */
export function ListingMain({ children }: { children: ReactNode }) {
  return <div className="min-w-0 grow">{children}</div>;
}
