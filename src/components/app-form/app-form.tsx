import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-form";
import { Label } from "@radix-ui/react-label";
import { Input, type InputProps as UiInputProps } from "@/components/ui/input";
import type { ReactNode } from "react";
import { Typography } from "@/components/ui/typography";
import { Button, type ButtonProps } from "@/components/ui/button";
import { uuidV7 } from "@/lib/uuid";

export const { fieldContext, useFieldContext, formContext, useFormContext } =
  createFormHookContexts();

type InputProps = Omit<UiInputProps, "name" | "value" | "onChange" | "onBlur">;

function InputWithError({
  label,
  ...props
}: InputProps & {
  label: ReactNode;
}) {
  const field = useFieldContext<any>();

  const error = useStore(field.store, (state) => state.meta.errors?.[0]);

  const randomSufix = uuidV7().substring(0, 7).replaceAll("-", "");
  const randomFieldName = `${field.name}.${randomSufix}`;

  return (
    <div>
      <Label htmlFor={randomFieldName}>{label}</Label>
      <Input
        id={randomFieldName}
        name={field.name}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        {...props}
      />
      <ErrorMessage error={error} />
    </div>
  );
}

function InputOnly(props: InputProps) {
  const field = useFieldContext<any>();

  return (
    <Input
      {...props}
      name={field.name}
      value={field.state.value}
      onChange={(e) => field.handleChange(e.target.value)}
      onBlur={field.handleBlur}
    />
  );
}

function ErrorMessage({ error }: { error: string | undefined }) {
  if (error === undefined) {
    return <></>;
  }

  return (
    <Typography variant="p" className="text-destructive">
      {error}
    </Typography>
  );
}

function SubmitButton({
  label,
  type = "submit",
  ...props
}: ButtonProps & {
  label: ReactNode;
}) {
  const form = useFormContext();
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button disabled={isSubmitting} {...props} type={type}  >
          {label}
        </Button>
      )}
    </form.Subscribe>
  );
}

function FormSubmit({
  ...props
}: React.PropsWithChildren & { className?: string }) {
  const form = useFormContext();

  return (
    <form
      {...props}
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    />
  );
}

export const { useAppForm, withForm } = createFormHook({
  fieldComponents: {
    InputWithError,
    Input: InputOnly,
  },
  formComponents: {
    FormSubmit,
    SubmitButton,
  },
  fieldContext,
  formContext,
});
