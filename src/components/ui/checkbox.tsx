import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { testProp, type TestIdProps } from "@/lib/test-id";

export type CheckboxProps = React.ComponentProps<typeof CheckboxPrimitive.Root> &
  TestIdProps;

function Checkbox({
  className,
  testId,
  ...props
}: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        `peer border-input size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none 

        focus-visible:border-ring 
        focus-visible:ring-ring 
        focus-visible:ring-[3px]
        
        aria-invalid:ring-destructive/20 
        aria-invalid:border-destructive 
        
        data-[state=checked]:bg-primary
        data-[state=checked]:text-primary-foreground 
        data-[state=checked]:border-primary 

        hover:cursor-pointer 
        disabled:cursor-not-allowed
        disabled:opacity-50
        
        dark:bg-input/30 
        dark:data-[state=checked]:bg-primary 
        dark:aria-invalid:ring-destructive/40`,
        className
      )}
      {...props}
      {...testProp(testId)}>
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none">
        <CheckIcon className="animate-check-pop size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
