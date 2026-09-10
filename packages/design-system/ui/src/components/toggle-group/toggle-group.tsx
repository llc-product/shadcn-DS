// components/toggle-group.tsx — a set of toggles, single- or multi-select (Radix ToggleGroup).
"use client";

import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { type VariantProps } from "class-variance-authority";
import { createContext, useContext } from "react";
import { cn } from "../../utils/cn.js";
import { toggleVariants } from "../toggle/toggle.js";

type ToggleVariants = VariantProps<typeof toggleVariants>;
const ToggleGroupContext = createContext<ToggleVariants>({
  size: "default",
  variant: "default",
});

export function ToggleGroup({
  className,
  variant,
  size,
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & ToggleVariants) {
  return (
    <ToggleGroupPrimitive.Root
      className={cn("flex items-center justify-center gap-1", className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

export function ToggleGroupItem({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & ToggleVariants) {
  const ctx = useContext(ToggleGroupContext);
  return (
    <ToggleGroupPrimitive.Item
      className={cn(
        toggleVariants({ variant: ctx.variant ?? variant, size: ctx.size ?? size }),
        className,
      )}
      {...props}
    />
  );
}
