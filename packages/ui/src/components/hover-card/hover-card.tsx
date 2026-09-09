// components/hover-card.tsx — rich preview shown on hover, for sighted pointer users only (Radix HoverCard).
"use client";

import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { cn } from "../../utils/cn";

export const HoverCard = HoverCardPrimitive.Root;
export const HoverCardTrigger = HoverCardPrimitive.Trigger;

export function HoverCardContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  return (
    <HoverCardPrimitive.Content
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
        className,
      )}
      {...props}
    />
  );
}
