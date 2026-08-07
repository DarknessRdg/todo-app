import { cn } from "@/lib/utils";
import { testProp, type TestIdProps } from "@/lib/test-id";

function Skeleton({
  className,
  testId,
  ...props
}: React.ComponentProps<"div"> & TestIdProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
      {...testProp(testId)}
    />
  );
}

export { Skeleton };
