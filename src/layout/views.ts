import {
  type AppIcon,
  CompletedIcon,
  InboxIcon,
  LabelIcon,
  OverdueIcon,
  TodayIcon,
  UpcomingIcon,
} from "@/icons";
import type { Tint } from "@/lib/tint";

export type View = {
  /**
   * Stable identity, used for the react key and the test id. Deliberately not
   * derived from `title` so renaming a label cannot silently move a test id.
   */
  id: string;
  title: string;
  /** The url this view owns. Rendered as a real href, not an onClick. */
  path: string;
  icon: AppIcon;
  /**
   * The view's colour, worn by its icon. It is how the sidebar is scanned
   * without reading it: the red one is what you missed.
   */
  tint: Tint;
  /**
   * Further subtrees that belong to this view. A todo's own page is a row of
   * the inbox opened full screen, so `/todo/<id>` keeps Inbox highlighted.
   */
  owns?: string[];
};

// Views are filters over the same task set (business logic comes later). No
// counts here: a number in this file is a number nobody counted. The sidebar
// derives the ones it can from the stored todos.
export const views: View[] = [
  {
    id: "inbox",
    title: "Inbox",
    path: "/",
    icon: InboxIcon,
    tint: "blue",
    owns: ["/todo"],
  },
  {
    id: "today",
    title: "Today",
    path: "/today",
    icon: TodayIcon,
    tint: "orange",
  },
  {
    id: "upcoming",
    title: "Upcoming",
    path: "/upcoming",
    icon: UpcomingIcon,
    tint: "purple",
  },
  {
    id: "overdue",
    title: "Overdue",
    path: "/overdue",
    icon: OverdueIcon,
    tint: "red",
  },
  {
    id: "completed",
    title: "Completed",
    path: "/completed",
    icon: CompletedIcon,
    tint: "green",
  },
  {
    id: "labels",
    title: "Labels",
    path: "/labels",
    icon: LabelIcon,
    tint: "pink",
    // One label's todos live at `/label/<id>`, reached from this page.
    owns: ["/label"],
  },
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

  const subtrees = [
    ...(view.path === "/" ? [] : [view.path]),
    ...(view.owns ?? []),
  ];

  return subtrees.some(
    (subtree) => pathname === subtree || pathname.startsWith(`${subtree}/`)
  );
}
