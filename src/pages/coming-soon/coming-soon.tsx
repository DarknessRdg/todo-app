import { testProp } from "@/lib/test-id";
import { views } from "@/layout/views";
import { useLocation } from "react-router";

/**
 * Stands in for the views the sidebar links to but that are not built yet.
 *
 * The sidebar entries are real anchors, so every one of them has to resolve to
 * a route — without this the router matches nothing and the app renders a blank
 * page. Replace the route with the real view as each one lands.
 */
export function ComingSoon() {
  const { pathname } = useLocation();
  const title =
    views.find((view) => view.path === pathname)?.title ?? "This view";

  return (
    <div
      className="flex flex-col gap-2 py-16"
      {...testProp("coming-soon")}>
      <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
      <p className="text-muted-foreground text-sm">
        Not built yet — everything still lives in the inbox.
      </p>
    </div>
  );
}
