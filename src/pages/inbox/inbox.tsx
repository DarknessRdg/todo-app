import { Typography } from "@/components/ui/typography";
import { TodoList } from "./list";

export function Inbox() {
  return (
    <>
      <Typography variant="h3">Inbox</Typography>
      <div className="mt-10">
        <TodoList />
      </div>
    </>
  );
}
