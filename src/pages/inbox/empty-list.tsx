import { Text } from "@/components/ui/text";
import { testProp } from "@/lib/test-id";
import { ArrowUp, Feather } from "lucide-react";

export function EmptyList() {
  return (
    <div
      {...testProp("home.todo.empty")}
      className="bg-card flex flex-col items-center justify-center rounded-2xl px-6 py-16 text-center">
      <div className="bg-background text-muted-foreground mb-4 flex size-11 items-center justify-center rounded-full">
        <Feather className="size-5" />
      </div>
      <Text variant="large">Inbox zero</Text>
      <Text variant="muted" className="mt-1.5 max-w-xs">
        Nothing to organize yet. Capture your first thought in the bar above — it
        takes about two seconds.
      </Text>
      <Text
        variant="eyebrow"
        className="text-muted-foreground/80 mt-4 inline-flex items-center gap-1.5">
        <ArrowUp className="size-3.5" /> start typing
      </Text>
    </div>
  );
}
