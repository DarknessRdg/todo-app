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
      <p className="text-foreground text-lg font-semibold">Inbox zero</p>
      <p className="text-muted-foreground mt-1.5 max-w-xs text-sm">
        Nothing to organize yet. Capture your first thought in the bar above — it
        takes about two seconds.
      </p>
      <p className="text-muted-foreground/80 mt-4 inline-flex items-center gap-1.5 text-xs font-medium">
        <ArrowUp className="size-3.5" /> start typing
      </p>
    </div>
  );
}
