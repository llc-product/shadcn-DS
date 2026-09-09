// components/skeleton.tsx — pulsing placeholder for content that has not arrived yet.
import { cn } from "../../utils/cn";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />
  );
}
