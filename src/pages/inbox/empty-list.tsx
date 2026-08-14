import { Text } from "@/components/ui/text";
import { testProp, type TestIdProps } from "@/lib/test-id";
import { ArrowUp, Feather } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The nothing-here panel. The words are a prop because "Inbox zero" is a lie on
 * any page that is a filter over the inbox — a day with nothing due is not an
 * empty workspace, and telling the reader it is sends them looking for todos
 * that are there.
 */
export function EmptyList({
  testId = "home.todo.empty",
  icon = <Feather className="size-5" />,
  title = "Inbox zero",
  message = "Nothing to organize yet. Capture your first thought in the bar above — it takes about two seconds.",
}: TestIdProps & {
  icon?: ReactNode;
  title?: string;
  message?: string;
}) {
  return (
    <div
      {...testProp(testId)}
      className="bg-card flex flex-col items-center justify-center rounded-2xl px-6 py-16 text-center">
      <div className="bg-background text-muted-foreground mb-4 flex size-11 items-center justify-center rounded-full">
        {icon}
      </div>
      <Text variant="large">{title}</Text>
      <Text variant="muted" className="mt-1.5 max-w-xs">
        {message}
      </Text>
      <Text
        variant="eyebrow"
        className="text-muted-foreground/80 mt-4 inline-flex items-center gap-1.5">
        <ArrowUp className="size-3.5" /> start typing
      </Text>
    </div>
  );
}
