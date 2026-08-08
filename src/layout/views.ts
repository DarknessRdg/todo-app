import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Inbox,
  Sun,
  Tag,
  type LucideIcon,
} from "lucide-react";

export type View = {
  /**
   * Stable identity, used for the react key and the test id. Deliberately not
   * derived from `title` so renaming a label cannot silently move a test id.
   */
  id: string;
  title: string;
  /** The url this view owns. Rendered as a real href, not an onClick. */
  path: string;
  icon: LucideIcon;
  count?: number;
  /**
   * Further subtrees that belong to this view. A todo's own page is a row of
   * the inbox opened full screen, so `/todo/<id>` keeps Inbox highlighted.
   */
  owns?: string[];
};

// Views are filters over the same task set (business logic comes later).
export const views: View[] = [
  { id: "inbox", title: "Inbox", path: "/", icon: Inbox, count: 12, owns: ["/todo"] },
  { id: "today", title: "Today", path: "/today", icon: Sun, count: 3 },
  { id: "upcoming", title: "Upcoming", path: "/upcoming", icon: CalendarDays, count: 8 },
  { id: "overdue", title: "Overdue", path: "/overdue", icon: CalendarClock, count: 2 },
  { id: "completed", title: "Completed", path: "/completed", icon: CheckCircle2 },
  { id: "labels", title: "Labels", path: "/labels", icon: Tag },
];

/**
 * Whether `pathname` falls inside the view's subtree.
 *
 * Inbox is the awkward one: its path is `/`, which is a prefix of literally
 * every url, so it is matched exactly and reaches the todo pages through
 * `owns` instead. Everything else matches its own path or anything nested
 * under it — `/labels/work` still highlights Labels.
 */
export function viewIsActive(view: View, pathname: string): boolean {
  if (pathname === view.path) return true;

  const subtrees = [...(view.path === "/" ? [] : [view.path]), ...(view.owns ?? [])];

  return subtrees.some(
    (subtree) => pathname === subtree || pathname.startsWith(`${subtree}/`)
  );
}
