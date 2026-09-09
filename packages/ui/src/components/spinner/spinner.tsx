// components/spinner.tsx — indeterminate loading indicator, announced as a live status.
//
// It carries role="status" and an English aria-label default so it is never silent. A localised
// app should pass its own: `<Spinner aria-label={t("loading")} />` — props spread last, so the
// caller wins. The design system cannot know what language it is rendering in.
import { Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";

export function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin text-muted-foreground", className)}
      {...props}
    />
  );
}
