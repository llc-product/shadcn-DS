// components/toggle.tsx — two-state pressable button (Radix Toggle).
"use client";

import * as TogglePrimitive from "@radix-ui/react-toggle";
import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "../../utils/cn";

export const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
      },
      size: { sm: "h-8 px-2", default: "h-9 px-3", lg: "h-10 px-3" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      className={cn(toggleVariants({ variant, size }), className)}
      {...props}
    />
  );
}
