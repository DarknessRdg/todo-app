import type { CreateTodoEntity } from "@/backend/todo-service";
import { useAppForm, useFieldContext } from "@/components/app-form/app-form";
import { TodoCheckerInput } from "@/components/todo";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { Text } from "@/components/ui/text";
import { useTodoCreate } from "@/pages/inbox/use-todo-create";
import {
  CalendarIcon,
  ChevronDownIcon,
  FolderIcon,
  SendIcon,
} from "lucide-react";
import { useState } from "react";

export function NewInput() {
  const { create, validateField } = useTodoCreate();

  const form = useAppForm({
    defaultValues: {
      title: "",
      dueDate: new Date(),
    } as CreateTodoEntity,
    onSubmit: ({ value, formApi }) => {
      create.mutate(value);
      toast.success("Captured", { description: value.title });
      formApi.reset();
    },
  });

  const resetFieldErrors = (field: keyof CreateTodoEntity) => {
    form.setFieldMeta(field, (meta) => ({
      ...meta,
      errorMap: {},
    }));
  };

  const inlineValidate = (field: keyof CreateTodoEntity) => {
    const error = validateField(form.state.values, field);
    if (!error) {
      // Passing onChange should also clear a stale onBlur error, so reset all.
      resetFieldErrors(field);
    }
    return error;
  };

  const inputValidations = (fieldName: keyof CreateTodoEntity) => {
    return {
      onChange: () => inlineValidate(fieldName),
    };
  };

  return (
    <form.AppForm>
      <form.FormSubmit>
        <div className="bg-card focus-within:ring-ring flex items-center gap-2.5 rounded-2xl px-3.5 transition-shadow focus-within:ring-2">
          <TodoCheckerInput
            done={false}
            disabled
            className="cursor-default opacity-70"
          />

          <form.AppField
            name="title"
            validators={inputValidations("title")}
            children={(field) => (
              <field.Input
                testId="home.todo.create.input"
                aria-invalid={!form.state.isFieldsValid}
                disabled={form.state.isSubmitting}
                placeholder="Capture a thought…"
                autoFocus
                autoComplete="off"
                className="h-14 grow border-0 bg-transparent px-0 py-0 text-base shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
              />
            )}
          />

          <div className="flex shrink-0 items-center gap-1.5">
            <form.AppField
              name="dueDate"
              validators={inputValidations("dueDate")}
              children={(field) => (
                <DueDateButton initial={field.state.value as Date} />
              )}
            />

            <SelectProjectsButton />

            <span className="kbd mr-0.5 hidden sm:inline-flex">↵</span>

            <form.SubmitButton
              testId="home.todo.create.submit"
              label={<SendIcon className="size-4" />}
              size="icon"
              className="size-9 shrink-0 rounded-full"
              aria-label="Add task"
            />
          </div>
        </div>
      </form.FormSubmit>

      {form.state.errors.length > 0 && (
        <Text
          testId="home.todo.create.error"
          className="text-destructive mt-2 px-1 text-sm">
          {form.state.errors}
        </Text>
      )}
    </form.AppForm>
  );
}

function DueDateButton({ initial }: { initial: Date }) {
  const field = useFieldContext<Date | undefined>();

  const [open, setOpen] = useState(false);

  const onChange = (date: Date) => {
    field.handleChange(date);
    setOpen(false);
  };

  const today = () => onChange(new Date());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          testId="home.todo.create.duedate.button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground h-8 gap-1.5 px-2"
          type="button">
          <CalendarIcon className="size-4" />
          <span className="text-xs tabular-nums">
            {field.state.value?.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
          <ChevronDownIcon className="size-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="end">
        <div className="mb-3 flex flex-nowrap items-center justify-between px-4 pt-3">
          <div>
            <Text variant="h6">Due date</Text>
            <Text variant="muted">When it's due</Text>
          </div>
          <Button
            testId="home.todo.create.duedate.today"
            size="sm"
            variant="outline"
            onClick={today}>
            Today
          </Button>
        </div>
        <Calendar
          mode="single"
          selected={initial}
          today={new Date()}
          captionLayout="label"
          onSelect={(date) => (date ? onChange(date) : null)}
        />
      </PopoverContent>
    </Popover>
  );
}

function SelectProjectsButton() {
  return (
    <Select>
      <SelectTrigger
        testId="home.todo.create.project.button"
        className="text-muted-foreground hover:text-foreground h-8 gap-1.5 border-0 bg-transparent px-2 shadow-none"
        size="sm">
        <FolderIcon className="size-4" />
        <SelectValue placeholder="Inbox" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Areas</SelectLabel>
          <SelectItem value="personal">Personal</SelectItem>
          <SelectItem value="work">Work</SelectItem>
          <SelectItem value="learning">Learning</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
