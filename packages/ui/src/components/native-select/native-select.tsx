// components/native-select.tsx — styled native <select>, matching SelectTrigger's token styling.
import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";

export function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative flex w-full items-center">
      <select
        className={cn(
          "flex h-9 w-full appearance-none items-center rounded-md border bg-background px-3 py-2 pr-8 text-sm shadow-sm transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 size-4 opacity-50" />
    </div>
  );
}
