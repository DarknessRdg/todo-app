import { useMemo } from "react";
import { CheckCircle2 } from "lucide-react";

import { EmptyList } from "@/pages/inbox/empty-list";
import { todosCompleted } from "@/lib/todo-scope";
import {
  ListingContainer,
  ListingContent,
  ListingFilter,
  ListingHeader,
  ListingMain,
  ListingModal,
  ListingRail,
} from "@/components/listing";
import { useTodoList } from "@/pages/inbox/use-todo-list";

/**
 * Everything finished.
 *
 * One flat list rather than the usual open/done split: the page is already only
 * one of the two, so a "To do" heading would stand over nothing and a "Done"
 * heading would name the whole page twice.
 */
export function CompletedPage() {
  const { allTodos } = useTodoList();

  const todos = useMemo(() => todosCompleted(allTodos), [allTodos]);

  return (
    <ListingContainer scopeKey="completed">
      <ListingMain>
        <ListingHeader testId="completed.page.title" eyebrow="Views">
          Completed
        </ListingHeader>

        {/* Hiding done todos here would empty the page by construction. */}
        <ListingFilter hide={["done"]} />

        <ListingContent
          todos={todos}
          sections="flat"
          empty={
            <EmptyList
              testId="completed.todo.empty"
              icon={<CheckCircle2 className="size-5" />}
              title="Nothing finished yet"
              message="Tick something off and it will be kept here."
            />
          }
        />
      </ListingMain>

      <ListingRail todos={todos} />
      <ListingModal />
    </ListingContainer>
  );
}
