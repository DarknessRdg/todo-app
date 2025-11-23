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
import { Typography } from "@/components/ui/typography";
import { useTodoCreate } from "@/pages/inbox/use-todo-create";
import {
  CalendarIcon,
  ChevronDownIcon,
  FolderIcon,
  SendIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const InputTextRightPaddingPx = 15;

export function NewInput() {
  const rightGroupRef = useRef<HTMLDivElement>(null);
  const [rightPadding, setRightPadding] = useState(0);

  const { create, validateField } = useTodoCreate();

  const form = useAppForm({
    defaultValues: {
      title: "",
      dueDate: new Date(),
    } as CreateTodoEntity,
    onSubmit: ({ value, formApi }) => {
      create.mutate(value);
      toast.success("Todo created !");
      formApi.reset();
    }
  });


  const resetFieldErrors = (field: keyof CreateTodoEntity) => {
    form.setFieldMeta(field, (meta) => ({
      ...meta,
      errorMap: {}
    }))
  }

  const inlineValidate = (field: keyof CreateTodoEntity) => {
    const error = validateField(form.state.values, field);
    if (!error) {
      // tanstack register errors by 'on<>' validation type
      // it stores in a map such as:
      //
      // {
      //   title: {
      //     onBlur: ["title-required"],
      //     onChange: []
      //   }
      // }
      //
      // However, if our form validation passes `onChange` it should
      // also erase the `onBlur` validation as it passed all the validation.
      // That is why we need to reset all the errors if succeeded one validation.
      resetFieldErrors(field)
    }
    return error
  }

  const inputValidations = (fieldName: keyof CreateTodoEntity) => {
    return {
      onChange: () => inlineValidate(fieldName),
    };
  };

  useEffect(() => {
    if (rightGroupRef.current) {
      const observer = new ResizeObserver(() => {
        if (rightGroupRef.current) {
          setRightPadding(
            rightGroupRef.current.offsetWidth + InputTextRightPaddingPx
          );
        }
      });

      observer.observe(rightGroupRef.current);

      return () => observer.disconnect();
    }
  }, []);

  return (
    <form.AppForm>
      <form.FormSubmit className="relative">
        <form.AppField
          name="title"
          validators={inputValidations("title")}
          children={(field) => (
            <field.Input
              aria-invalid={!form.state.isFieldsValid}
              disabled={form.state.isSubmitting}
              style={{ paddingRight: `${rightPadding}px` }}
              type="textarea"
              placeholder="Add new todo"
              autoFocus
              autoComplete="off"
              className="relative h-11 pl-9"
            />
          )}
        />

        <div className="absolute inset-y-0 left-2 flex items-center">
          <TodoCheckerInput done={false} className="hover:cursor-default" />
        </div>

        <div
          className="absolute top-0 right-2 bottom-0 flex flex-row items-center gap-2"
          ref={rightGroupRef}>
          <form.AppField
            name="dueDate"
            validators={inputValidations("dueDate")}
            children={(field) => (
              <DueDateButton initial={field.state.value as Date} />
            )}
          />

          <SelectProjectsButton />

          <form.SubmitButton
            label={<SendIcon />}
            variant="secondary"
            size="icon"
            className="rounded-full"
          />
        </div>
      </form.FormSubmit>
      <div>
        <Typography variant="p" className="text-destructive">{form.state.errors}</Typography>
      </div>
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
    <div className="flex flex-col gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-auto px-2"
            type="button">
            <CalendarIcon />
            <Typography variant="p">
              {field.state.value?.toLocaleDateString()}
            </Typography>
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <div className="mb-3 flex flex-nowrap items-center justify-between px-4 pt-3">
            <div>
              <Typography variant="h6">Due date</Typography>
              <Typography variant="muted">Task due date</Typography>
            </div>
            <Button size="sm" variant="outline" onClick={today}>
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
    </div>
  );
}

function SelectProjectsButton() {
  return (
    <Select>
      <SelectTrigger
        className="bg-secondary text-secondary-foreground hover:bg-secondary/80 h-7 border-none shadow-xs"
        size="sm">
        <FolderIcon className="text-secondary-foreground" />
        <SelectValue placeholder="Project" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Fruits</SelectLabel>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
          <SelectItem value="blueberry">Blueberry</SelectItem>
          <SelectItem value="grapes">Grapes</SelectItem>
          <SelectItem value="pineapple">Pineapple</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
