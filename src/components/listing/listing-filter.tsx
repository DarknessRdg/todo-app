import { FilterBar, type FilterControl } from "@/pages/inbox/filter-bar";
import { useListing } from "@/components/listing/listing-context";

/**
 * The reader's own controls: what to hide, and what order to read it in.
 *
 * `hide` drops the ones this page has already decided — see `FilterControl`.
 * The page pins those by handing the listing a narrower set of todos, so a
 * control for the same dimension could only ever disagree with the heading.
 */
export function ListingFilter({ hide }: { hide?: FilterControl[] }) {
  const { filter, sort, setFilter, setSort } = useListing();

  return (
    <div className="mb-6">
      <FilterBar
        filter={filter}
        onChange={setFilter}
        sort={sort}
        onSortChange={setSort}
        hide={hide}
      />
    </div>
  );
}
