// components/item.tsx — list-item primitive for menus, settings rows and row-style cards.
import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "../../utils/cn";

export const itemVariants = cva(
  "group/item flex items-center rounded-md border border-transparent text-sm transition-colors",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border-border",
        muted: "bg-muted",
      },
      size: {
        default: "gap-4 p-4",
        sm: "gap-3 p-3",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type ItemProps = React.ComponentProps<"div"> & VariantProps<typeof itemVariants>;

export function Item({ className, variant, size, ...props }: ItemProps) {
  return <div className={cn(itemVariants({ variant, size }), className)} {...props} />;
}

export function ItemGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div role="list" className={cn("flex flex-col", className)} {...props} />;
}

export function ItemSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div role="separator" className={cn("h-px w-full bg-border", className)} {...props} />
  );
}

export const itemMediaVariants = cva("flex shrink-0 items-center justify-center", {
  variants: {
    variant: {
      default: "",
      icon: "size-8 rounded-md bg-muted text-muted-foreground [&_svg]:size-4",
      image: "size-10 overflow-hidden rounded-md [&_img]:size-full [&_img]:object-cover",
    },
  },
  defaultVariants: { variant: "default" },
});

export type ItemMediaProps = React.ComponentProps<"div"> &
  VariantProps<typeof itemMediaVariants>;

export function ItemMedia({ className, variant, ...props }: ItemMediaProps) {
  return <div className={cn(itemMediaVariants({ variant }), className)} {...props} />;
}

export function ItemContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-1 flex-col gap-1", className)} {...props} />;
}

export function ItemTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("text-sm font-medium leading-none", className)} {...props} />;
}

export function ItemDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function ItemActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-2", className)} {...props} />;
}

export function ItemHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center justify-between gap-2", className)}
      {...props}
    />
  );
}

export function ItemFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center justify-between gap-2", className)}
      {...props}
    />
  );
}
