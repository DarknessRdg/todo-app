import { testProp } from "@/lib/test-id";
import { Text } from "@/components/ui/text";
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
      <Text variant="h2" as="h1">
        {title}
      </Text>
      <Text variant="muted">
        Not built yet — everything still lives in the inbox.
      </Text>
    </div>
  );
}
