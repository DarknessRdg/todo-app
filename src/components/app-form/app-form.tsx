import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-form";
import { Label } from "@radix-ui/react-label";
import { Input, type InputProps } from "../ui/input";
import type { ReactNode } from "react";
import { Typography } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";

export const { fieldContext, useFieldContext, formContext, useFormContext } =
  createFormHookContexts();

function InputWithError({ label }: { label: ReactNode }) {
  const field = useFieldContext<any>();

  const error = useStore(field.store, (state) => state.meta.errors?.[0]);

  return (
    <div>
      <Label htmlFor={field.name}>{label}</Label>
      <Input
        name={field.name}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
      <ErrorMessage error={error} />
    </div>
  );
}

function InputOnly(
  props: Omit<InputProps, "name" | "value" | "onChange" | "onBlur">
) {
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

function SubmitButton({ label }: { label: ReactNode }) {
  const form = useFormContext();
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => <Button disabled={isSubmitting}>{label}</Button>}
    </form.Subscribe>
  );
}

export const { useAppForm, withForm } = createFormHook({
  fieldComponents: {
    InputWithError,
    Input: InputOnly,
  },
  formComponents: {
    SubmitButton,
  },
  fieldContext,
  formContext,
});
