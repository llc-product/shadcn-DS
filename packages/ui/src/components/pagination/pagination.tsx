// components/pagination.tsx — page navigation built from Button variants, not a new control.
//
// Every user-visible string here is an English DEFAULT, not a decision: the aria-labels are
// overridable because props spread last, and the visible Previous/Next labels because they fall
// back to `children`. A localised app passes its own; the design system cannot know the language.
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "../../utils/cn.js";
import { type ButtonProps, buttonVariants } from "../button/button.js";

export function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

export function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul className={cn("flex flex-row items-center gap-1", className)} {...props} />;
}

export function PaginationItem(props: React.ComponentProps<"li">) {
  return <li {...props} />;
}

type PaginationLinkProps = { isActive?: boolean } & Pick<ButtonProps, "size"> &
  React.ComponentProps<"a">;

export function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      className={cn(
        buttonVariants({ variant: isActive ? "outline" : "ghost", size }),
        className,
      )}
      {...props}
    />
  );
}

export function PaginationPrevious({
  className,
  children,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("gap-1 pl-2.5", className)}
      {...props}
    >
      <ChevronLeft />
      {children ?? <span>Previous</span>}
    </PaginationLink>
  );
}

export function PaginationNext({
  className,
  children,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("gap-1 pr-2.5", className)}
      {...props}
    >
      {children ?? <span>Next</span>}
      <ChevronRight />
    </PaginationLink>
  );
}

export function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}
