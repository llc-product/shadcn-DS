// utils/cn.ts — merge Tailwind class names safely (clsx + tailwind-merge).
//
// Moved out of packages/ui so the consuming app stops keeping a second copy of it. The two had
// already diverged in nothing but location, which is exactly the state before they diverge in
// behaviour.
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
