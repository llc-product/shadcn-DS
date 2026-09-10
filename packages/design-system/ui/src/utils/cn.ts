// utils/cn.ts — merge Tailwind class names safely (clsx + tailwind-merge).
//
// It lives HERE rather than in a shared utils package, and that is the whole point of where it
// sits: merging Tailwind classes is a design-system concern. It exists because every component in
// this package takes `className` and has to let a caller's class win over the variant's — and
// `tailwind-merge` is a dependency nothing outside a Tailwind component library wants.
//
// It stays exported from the package's public API, because a consumer overriding a component's
// classes needs the same merge semantics the component was built with. Asking them to install a
// second package for one function would be the wrong trade.
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
