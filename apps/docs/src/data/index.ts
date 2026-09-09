// The generated JSON, given a hand-written shape.
//
// TypeScript infers a colossal literal union from a JSON import — every component's exact
// variant keys become part of the type, so `.filter()` on the array stops type-checking. These
// declarations describe the shape gen-docs-manifest.mjs writes, and the two casts below are the
// only place the raw imports are touched.
import componentsJson from "./components.json";
import tokensJson from "./tokens.json";

export type ComponentMeta = {
  name: string;
  file: string;
  description: string;
  client: boolean;
  radixBase: string | null;
  variants: Record<string, string[]> | null;
  exports: string[];
  sidecar: { guidance?: string; example?: string; notes?: string } | null;
};

export type CatalogGroup = {
  title: string;
  names: string[];
  components: ComponentMeta[];
};

export type Tokens = {
  primitives: {
    name: string;
    value: string;
    kind: "size" | "color";
    description: string;
  }[];
  colors: { name: string; description: string; light: string; dark: string }[];
  fonts: { name: string; value: string }[];
  motion: {
    duration: { name: string; value: string }[];
    easing: { name: string; value: string }[];
  };
};

export const catalog = componentsJson as unknown as CatalogGroup[];
export const tokens = tokensJson as unknown as Tokens;

/** Flat list, in barrel order. */
export const allComponents = catalog.flatMap((g) => g.components);
