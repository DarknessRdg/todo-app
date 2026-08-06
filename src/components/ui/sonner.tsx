import { Toaster as Sonner, type ToasterProps, toast } from "sonner";
import { useTheme } from "@/hooks/use-theme";

const Toaster = ({ ...props }: ToasterProps) => {
  const { isDark } = useTheme();

  return (
    <Sonner
      theme={isDark ? "dark" : "light"}
      richColors
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          // Faint blue edge ties default/loading toasts to the primary.
          "--normal-border":
            "color-mix(in oklab, var(--primary) 30%, var(--border))",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster, toast };
