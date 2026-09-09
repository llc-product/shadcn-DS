// components/empty.tsx — empty-state placeholder primitives.
import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "../../utils/cn";

export function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center",
        className,
      )}
      {...props}
    />
  );
}

export function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col items-center gap-2 text-center", className)}
      {...props}
    />
  );
}

export const emptyMediaVariants = cva("flex items-center justify-center", {
  variants: {
    variant: {
      default: "",
      icon: "size-10 rounded-lg bg-muted text-muted-foreground [&_svg]:size-5",
    },
  },
  defaultVariants: { variant: "default" },
});

export type EmptyMediaProps = React.ComponentProps<"div"> &
  VariantProps<typeof emptyMediaVariants>;

export function EmptyMedia({ className, variant, ...props }: EmptyMediaProps) {
  return <div className={cn(emptyMediaVariants({ variant }), className)} {...props} />;
}

export function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("text-sm font-medium", className)} {...props} />;
}

export function EmptyDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col items-center gap-4", className)} {...props} />;
}
