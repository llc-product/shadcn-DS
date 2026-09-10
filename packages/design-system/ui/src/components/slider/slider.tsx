// components/slider.tsx — numeric range input, single or multi-thumb (Radix Slider).
"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "../../utils/cn.js";

export function Slider({
  className,
  value,
  defaultValue,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  // One thumb PER VALUE. This used to render exactly one, hardcoded, which meant a range
  // slider — `defaultValue={[20, 80]}` — came out with a single handle and no error: the
  // component looked fine and the upper bound was simply unreachable.
  const thumbs = value ?? defaultValue ?? [0];

  return (
    <SliderPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {thumbs.map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          className="block size-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  );
}
