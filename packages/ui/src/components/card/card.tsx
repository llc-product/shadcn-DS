// components/card.tsx — composable Card primitives.
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../../utils/cn.js";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: DivProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: DivProps) {
  return <div className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />;
}

// `asChild` renders the caller's element instead of a div, so a card title can be a real heading.
// A card is a visual container; whether its title is an h1, an h2 or nothing is a decision only
// the page can make, and getting it wrong leaves screen-reader users with no heading to navigate by.
export function CardTitle({
  className,
  asChild,
  ...props
}: DivProps & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      className={cn("font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: DivProps) {
  return <div className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: DivProps) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: DivProps) {
  return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}
