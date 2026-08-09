import { RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { testProp, type TestIdProps } from "@/lib/test-id";

type TodoLookupFailedProps = TestIdProps & {
  onRetry: () => void;
};

/**
 * Shown when reading a todo *failed*, as opposed to the todo not being there.
 * The distinction is the whole point: answering "no such todo" to a broken
 * database sends the reader hunting for a mistake they did not make.
 *
 * Automatic retries are off for this read (there is no network to wait out —
 * see `use-todo-details.ts`), so the retry is offered as a button instead.
 */
export function TodoLookupFailed({ onRetry, testId }: TodoLookupFailedProps) {
  return (
    <div className="flex flex-col items-start gap-3" {...testProp(testId)}>
      <Text variant="eyebrow">Error</Text>
      <Text variant="h2">This todo could not be read</Text>
      <Text variant="muted">
        The stored data could not be opened. The todo may still be there — this
        is not the same as it being gone.
      </Text>

      <Button
        // The dotted path continues from the root id, so a caller only names
        // the state once and the button follows.
        testId={testId === undefined ? undefined : `${testId}.retry.button`}
        onClick={onRetry}
        className="mt-3 gap-1.5 rounded-full">
        <RotateCw className="size-4" />
        Try again
      </Button>
    </div>
  );
}
