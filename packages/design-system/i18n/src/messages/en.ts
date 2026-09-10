// The English source of truth. Every other locale is typed against this object, so adding a string
// here and forgetting it elsewhere is a compile error rather than a silent English leak.
//
// Each key names the component and the surface, not the sentence: `pagination.previousLabel` still
// makes sense after someone rewrites the wording, `pagination.previous` does not once there are
// two of them.
//
// Deliberately NOT `as const`. The type derived from this object is the CONTRACT every other
// locale is checked against, and literal types would make that contract "must equal the English
// words" — every translation then fails to compile, which is precisely backwards.
export const en = {
  pagination: {
    /** aria-label on the <nav> wrapping the pager. */
    navLabel: "pagination",
    previous: "Previous",
    next: "Next",
    previousLabel: "Go to previous page",
    nextLabel: "Go to next page",
    /** Screen-reader text for the ellipsis between page numbers. */
    morePages: "More pages",
  },
  breadcrumb: {
    navLabel: "breadcrumb",
    /** Screen-reader text for the collapsed middle of a long trail. */
    more: "More",
  },
  spinner: {
    /** Announced by role="status" so a loading state is never silent. */
    label: "Loading",
  },
  carousel: {
    /** Screen-reader text on the arrow buttons; they render an icon and no visible label. */
    previousLabel: "Previous slide",
    nextLabel: "Next slide",
  },
  combobox: {
    /** Shown on the trigger until something is chosen. */
    placeholder: "Select an option",
    searchPlaceholder: "Search…",
    /** Rendered in place of the list when the query matches nothing. */
    empty: "No results found.",
  },
  datePicker: {
    placeholder: "Pick a date",
  },
  themeToggle: {
    label: "Toggle theme",
  },
};
