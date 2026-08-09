import { testProp } from "@/lib/test-id";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Link, useLocation } from "react-router";

/**
 * The catch-all. Renders in place rather than redirecting: the url that missed
 * is the most useful thing on the page — it is what the reader has to correct,
 * and rewriting it would lose the evidence.
 */
export function NotFound() {
  const { pathname } = useLocation();

  return (
    <div className="flex flex-col items-start gap-3 py-16" {...testProp("not-found")}>
      <Text variant="eyebrow">404</Text>
      {/* Sized as a section heading, but the page's only h1. */}
      <Text variant="h2" as="h1">
        There is nothing at this address
      </Text>
      <Text variant="muted">
        <span className="font-mono">{pathname}</span> does not match anything in
        the app.
      </Text>

      <Button asChild className="mt-3 rounded-full">
        <Link to="/" {...testProp("not-found.inbox.link")}>
          Back to the inbox
        </Link>
      </Button>
    </div>
  );
}
