// components — every primitive, re-exported one folder at a time.
//
// One line per folder, never per file: a folder owns which of its symbols are public (its own
// index.ts), and this file owns only which folders exist. That is what keeps adding a component
// a one-line change here instead of a merge conflict.

// Primitives
export * from "./button";
export * from "./input";
export * from "./textarea";
export * from "./label";
export * from "./badge";
export * from "./skeleton";
export * from "./spinner";
export * from "./toggle";
export * from "./toggle-group";

// Containers / layout
export * from "./card";
export * from "./separator";
export * from "./scroll-area";
export * from "./tabs";
export * from "./accordion";
export * from "./table";
export * from "./breadcrumb";
export * from "./pagination";

// Forms
export * from "./checkbox";
export * from "./radio-group";
export * from "./switch";
export * from "./slider";
export * from "./select";

// Feedback
export * from "./alert";
export * from "./progress";
export * from "./avatar";
export * from "./sonner";

// Overlays
export * from "./dialog";
export * from "./sheet";
export * from "./alert-dialog";
export * from "./popover";
export * from "./hover-card";
export * from "./tooltip";
export * from "./dropdown-menu";

// Theme
export * from "./theme-provider";
export * from "./theme-toggle";
