import type { CreateTodoEntity } from "@/backend/todo-service";
import { useAppForm } from "@/components/app-form/app-form";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTodoCreate } from "@/pages/inbox/use-todo-create";

export function CreateTodoForm() {
  const form = useAppForm({
    defaultValues: {
      title: "",
      done: false,
      description: "",
    },
    onSubmit: (v) => {
      console.log(v.value);
    },
  });

  const hooks = useTodoCreate();

  const validateField = (fieldName: keyof CreateTodoEntity) =>
    hooks.validateField(form.state.values, fieldName);

  const validateOnBlur = (fieldName: keyof CreateTodoEntity) => {
    return { onBlur: () => validateField(fieldName) };
  };

  return (
    <DialogContent className="lg:min-w-7/12">
      <DialogHeader>
        <DialogTitle className="mb-4">Let's do something new</DialogTitle>
      </DialogHeader>
      <form.AppForm>
        <form.AppField
          name="title"
          validators={validateOnBlur("title")}
          children={(field) => <field.InputWithError label="Name" />}
        />

        <form.AppField
          name="description"
          validators={validateOnBlur("description")}
          children={(field) => <field.InputWithError label="Description" />}
        />
        <form.SubmitButton label="Create" />
      </form.AppForm>
    </DialogContent>
  );
}
