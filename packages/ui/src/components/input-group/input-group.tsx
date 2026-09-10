// components/input-group.tsx — Input wrapper that pairs it with inline leading/trailing addons.
import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "../../utils/cn.js";
import { Button } from "../button/index.js";

export function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative flex w-full items-center rounded-md border bg-background shadow-sm transition-colors",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
        "has-[[disabled]]:cursor-not-allowed has-[[disabled]]:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

// Borderless input meant to fill an `InputGroup` — the group itself carries the border, shadow
// and focus ring so the input can sit flush against its addons.
export function InputGroupInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-9 w-full flex-1 rounded-md border-0 bg-transparent px-3 py-1 text-sm shadow-none outline-none",
        "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export const inputGroupAddonVariants = cva(
  "flex items-center justify-center gap-2 text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      align: {
        "inline-start": "order-first pl-3",
        "inline-end": "order-last pr-3",
        "block-start": "order-first w-full justify-start px-3 pt-2",
        "block-end": "order-last w-full justify-start px-3 pb-2",
      },
    },
    defaultVariants: { align: "inline-start" },
  },
);

export type InputGroupAddonProps = React.ComponentProps<"div"> &
  VariantProps<typeof inputGroupAddonVariants>;

export function InputGroupAddon({ className, align, ...props }: InputGroupAddonProps) {
  return <div className={cn(inputGroupAddonVariants({ align }), className)} {...props} />;
}

export function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function InputGroupButton({
  className,
  size = "sm",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      size={size}
      className={cn("h-7 gap-1.5 rounded-sm px-2 text-xs", className)}
      {...props}
    />
  );
}
