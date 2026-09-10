// components/collapsible.tsx — one show/hide region driven by a trigger (Radix Collapsible).
"use client";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { cn } from "../../utils/cn.js";

export const Collapsible = CollapsiblePrimitive.Root;
export const CollapsibleTrigger = CollapsiblePrimitive.Trigger;

export function CollapsibleContent({
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Content>) {
  return (
    <CollapsiblePrimitive.Content
      className={cn(
        "overflow-hidden data-[state=closed]:animate-out data-[state=open]:animate-in",
        className,
      )}
      {...props}
    />
  );
}
