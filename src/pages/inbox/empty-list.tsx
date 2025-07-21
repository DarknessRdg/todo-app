import { ChecklistBroSVG } from "@/assets/checklist-bro-svg";
import { useAppForm } from "@/components/app-form/app-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Typography } from "@/components/ui/typography";
import { useTodoCreate } from "@/pages/inbox/use-todo-create";
import { CheckIcon } from "lucide-react";
import { useState } from "react";

export function EmptyList() {
  const [submitDisabled, setSubmitDisabled] = useState(true);
  const createHook = useTodoCreate();

  const form = useAppForm({
    defaultValues: {
      title: "",
    },
    listeners: {
      onChange: ({ formApi }) =>
        setSubmitDisabled(formApi.state.values.title.length === 0),
    },
    onSubmit: ({ value }) => {
      createHook.create.mutate({ title: value.title });
    },
  });

  return (
    <Card className="flex min-h-[50vh] flex-col items-center justify-center gap-2 shadow-none">
      <ChecklistBroSVG className="size-2/12" />
      <div className="-mt-6 pb-5 text-center">
        <Typography variant="large" className="font-semibold">
          No
          <Typography variant={"code"} className="mx-2 inline-block">
            TodDo
          </Typography>
          added
        </Typography>
        <Typography variant="muted">
          Type your first todo title below
        </Typography>
      </div>

      <form
        className="w-full"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}>
        <div className="flex- flex w-full items-center justify-center gap-2">
          <form.AppField
            name="title"
            children={(field) => (
              <field.Input
                className="w-4/12"
                autoFocus
                placeholder="What are going to do?"
              />
            )}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  type="submit"
                  variant="default"
                  disabled={submitDisabled}>
                  {createHook.create.isPending ? <Spinner /> : <CheckIcon />}
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <Typography variant="p">
                {submitDisabled
                  ? "Type something to add the todo"
                  : "Create the Todo"}
              </Typography>
            </TooltipContent>
          </Tooltip>
        </div>
      </form>
    </Card>
  );
}
