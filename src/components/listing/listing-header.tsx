import type { ReactNode } from "react";

import { Text } from "@/components/ui/text";
import type { TestIdProps } from "@/lib/test-id";

/** What this listing is: the group it belongs to, and its name. */
export function ListingHeader({
  eyebrow,
  children,
  testId,
}: TestIdProps & { eyebrow: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <Text variant="eyebrow" className="mb-1">
        {eyebrow}
      </Text>
      <Text testId={testId} variant="h1">
        {children}
      </Text>
    </div>
  );
}
