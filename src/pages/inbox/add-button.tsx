import type { CreateTodoEntity } from "@/backend/todo-service";
import { useAppForm } from "@/components/app-form/app-form";
import { Button } from "@/components/ui/button";
import {
  DialogHeader,
  DialogTitle,
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTodoCreate } from "@/pages/inbox/use-todo-create";
import { PlusCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const createFromDefaultValues: CreateTodoEntity = {
  title: "",
};

export function AddButton() {
  const [open, setOpenDialog] = useState(false);
  const hooks = useTodoCreate();

  const form = useAppForm({
    defaultValues: createFromDefaultValues,
    onSubmit: ({ value }) => {
      hooks.create.mutate(value);

      toast.success("Todo created !");
      setOpenDialog(false);
    },
  });

  useEffect(() => form.reset(), [open]);

  const validateField = (fieldName: keyof CreateTodoEntity) =>
    hooks.validateField(form.state.values, fieldName);

  const validateOnBlur = (fieldName: keyof CreateTodoEntity) => {
    return {
      onBlur: () => validateField(fieldName),
      onChange: () => validateField(fieldName),
    };
  };

  return (
    <Dialog open={open} onOpenChange={setOpenDialog}>
      <form.AppForm>
        <DialogTrigger asChild>
          <Button variant="secondary">
            <PlusCircleIcon /> Add ToDo
          </Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle className="mb-4">What are doing?</DialogTitle>
          </DialogHeader>

          <form.FormSubmit className="flex flex-col gap-3">
            <form.AppField
              name="title"
              validators={validateOnBlur("title")}
              children={(field) => <field.InputWithError label="Title" />}
            />
            <DialogFooter className="mt-2 sm:justify-start">
              <form.SubmitButton label="Add" className="w-full" />
            </DialogFooter>
          </form.FormSubmit>
        </DialogContent>
      </form.AppForm>
    </Dialog>
  );
}
