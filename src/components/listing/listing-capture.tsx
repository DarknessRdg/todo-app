import { NewInput } from "@/pages/inbox/new-input";
import type { TodoPriority } from "@/lib/priority";

/**
 * The capture bar, carrying whatever this page pins onto what is written here.
 *
 * A page that pins a project or a date is making a promise — "what you add here
 * belongs here" — and these are how it keeps it. A page where the promise
 * cannot be kept simply does not render this part: a todo captured on
 * `/completed` would not appear there, and a bar that swallows what you type is
 * worse than no bar.
 */
export function ListingCapture({
  projectId,
  dueDate,
  priority,
}: {
  projectId?: string;
  dueDate?: Date;
  priority?: TodoPriority;
}) {
  return (
    <div className="my-6">
      <NewInput projectId={projectId} dueDate={dueDate} priority={priority} />
    </div>
  );
}
