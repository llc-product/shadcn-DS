// components/label.tsx — form label bound to a control (Radix Label).
"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "../../utils/cn.js";

export function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
}
