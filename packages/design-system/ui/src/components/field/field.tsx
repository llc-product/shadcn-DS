// components/field.tsx — form-field composition primitives for Server-Action + Zod forms.
import { cn } from "../../utils/cn.js";
import { Label } from "../label/index.js";

export function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return <fieldset className={cn("flex flex-col gap-6", className)} {...props} />;
}

export function FieldLegend({ className, ...props }: React.ComponentProps<"legend">) {
  return (
    <legend
      className={cn("mb-2 text-sm font-medium leading-none", className)}
      {...props}
    />
  );
}

export function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-6", className)} {...props} />;
}

export function Field({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-2", className)} {...props} />;
}

export function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1", className)} {...props} />;
}

export function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return (
    <Label className={cn("text-sm font-medium leading-none", className)} {...props} />
  );
}

export function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

// Renders the first non-empty error, falling back to `children`, and nothing when both are empty —
// so a form can always pass `errors={fieldErrors}` without a conditional at every call site.
export function FieldError({
  className,
  errors,
  children,
  ...props
}: React.ComponentProps<"p"> & {
  errors?: Array<string | undefined | null>;
}) {
  const message = errors?.find((error) => !!error);
  const content = message ?? children;

  if (!content) return null;

  return (
    <p
      role="alert"
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {content}
    </p>
  );
}

export function FieldSeparator({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-2 text-sm text-muted-foreground",
        className,
      )}
      {...props}
    >
      <div className="h-px flex-1 bg-border" />
      {children ? <span>{children}</span> : null}
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
