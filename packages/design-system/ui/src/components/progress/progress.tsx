// components/progress.tsx — determinate progress bar (Radix Progress).
"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "../../utils/cn.js";

export function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      // `value` is forwarded, not just consumed below. Radix derives aria-valuenow and
      // data-state from it; without this the bar moved correctly and announced nothing at all,
      // staying permanently "indeterminate" to a screen reader.
      value={value}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-testid="progress-indicator"
        className="size-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
