// components/breadcrumb.tsx — trail of ancestor links ending in the current page.
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "../../utils/cn.js";

export function Breadcrumb(props: React.ComponentProps<"nav">) {
  return <nav aria-label="breadcrumb" {...props} />;
}

export function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      className={cn(
        "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li className={cn("inline-flex items-center gap-1.5", className)} {...props} />;
}

export function BreadcrumbLink({ className, ...props }: React.ComponentProps<"a">) {
  return (
    <a className={cn("transition-colors hover:text-foreground", className)} {...props} />
  );
}

export function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("font-normal text-foreground", className)}
      {...props}
    />
  );
}

export function BreadcrumbSeparator({
  className,
  children,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      role="presentation"
      aria-hidden
      className={cn("[&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  );
}

export function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      role="presentation"
      aria-hidden
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">More</span>
    </span>
  );
}
