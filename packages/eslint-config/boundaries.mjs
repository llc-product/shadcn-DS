// @digitaltwin/eslint-config/boundaries — the layering an app describes in prose, mechanised.
//
// Prose does not survive thirty features and several teams; a failing lint run does. Built on the
// stock `no-restricted-imports`, so there is no extra plugin to install or to keep in step with
// ESLint majors.
//
// The layers, top to bottom, and the one rule between them:
//
//   composition (app/, store/, providers/)  →  feature (features/<domain>/)  →  infra (libs/, …)
//
// A layer may import downward and never upward. Two exceptions are deliberate and both are
// composition doing its job: `store/` must reference every feature's slice because Redux has one
// global store, and `providers/` wires features into the tree. Both are still barred from `app/`.
//
// Nothing here is specific to one repository except the `src` prefix, which is why it is an
// argument. Everything else — the layer names, the direction of the arrow — is the architecture.

/**
 * next-intl needs the locale prefix preserved, so app and feature code must use the locale-aware
 * helpers rather than Next's own. `notFound` is fine: it takes no href.
 */
export const localeAwareNavigation = (alias = "@/i18n/navigation") => [
  {
    name: "next/link",
    message: `Use \`Link\` from '${alias}' so the locale prefix is kept (/vi, /es…).`,
  },
  {
    name: "next/navigation",
    importNames: ["redirect", "permanentRedirect", "useRouter", "usePathname"],
    message: `Use the locale-aware helpers from '${alias}'. \`notFound\` may still come from next/navigation.`,
  },
];

/**
 * @param {object} [options]
 * @param {string} [options.src] source root, as it appears in a `files` glob.
 * @param {boolean} [options.localeAware] enforce locale-aware navigation (next-intl apps).
 * @param {string} [options.navigationAlias] where the locale-aware helpers live.
 * @param {string[]} [options.edgeFiles] files bundled separately from the app (Next 16: proxy.ts).
 * @param {string[]} [options.edgeAllowed] modules those files MAY still import.
 */
export const boundaries = ({
  src = "src",
  localeAware = true,
  navigationAlias = "@/i18n/navigation",
  edgeFiles = [`${src}/proxy.ts`],
  edgeAllowed = ["@/libs/auth/jwt", "@/libs/auth/create-jwt"],
} = {}) => {
  const navigation = localeAware ? localeAwareNavigation(navigationAlias) : [];

  // `patterns` supports importNames, so the feature-layer rule can restrict the same exports the
  // path-based rule does. Mapping to a bare group would ban the whole module, including
  // `notFound`, and contradict the message telling you notFound is fine.
  const navigationPatterns = navigation.map(({ name, importNames, message }) => ({
    group: [name],
    ...(importNames ? { importNames } : {}),
    message,
  }));

  // `no-restricted-imports` matches the specifier TEXT, not the resolved path, which is why the
  // relative rule below has to be scoped by file depth: what "../../" means depends on where the
  // importing file sits.
  const featurePatterns = [
    {
      group: ["@/app", "@/app/**"],
      message:
        "features/ must not import from app/. Routing depends on features, never the reverse.",
    },
    {
      group: ["@/features/*/*", "@/features/*/**"],
      message:
        "Do not reach into another feature's internals. Import its barrel ('@/features/<domain>'), or move the shared code to libs/ or types/.",
    },
    ...navigationPatterns,
  ];

  return [
    // A feature is a leaf. It may use libs/, shared components and shared types, but it must never
    // reach up into routing, nor sideways into another feature's internals.
    {
      files: [`${src}/features/**`],
      rules: { "no-restricted-imports": ["error", { patterns: featurePatterns }] },
    },

    // Files nested at least two levels inside a feature (api/, components/, store/, hooks/…).
    // For THEM, and only them, "../../" always lands outside the feature, so it is the same
    // violation as the alias rule above wearing a different specifier. A file at the feature ROOT
    // is excluded on purpose: there "../../types" is the legitimate shared-types folder.
    {
      files: [`${src}/features/*/*/**`],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              ...featurePatterns,
              {
                group: ["../../*", "../../**"],
                message:
                  "Relative import escaping this feature. Use a single-level relative path inside the feature, or the '@/' alias so the boundary rules apply.",
              },
            ],
          },
        ],
      },
    },

    // Infrastructure and the design system sit BELOW features: they must not depend upward.
    // src/store/ is deliberately NOT in this list — it is the composition root, so wiring feature
    // slices together is its whole job. It still must not reach into routing.
    {
      files: [
        `${src}/libs/**`,
        `${src}/components/**`,
        `${src}/types/**`,
        `${src}/hooks/**`,
        `${src}/config/**`,
      ],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: [
                  "@/features",
                  "@/features/**",
                  "@/app",
                  "@/app/**",
                  // Same rule for relative specifiers, which the alias patterns never see.
                  "../features/**",
                  "../app/**",
                  "../../features/**",
                  "../../app/**",
                ],
                message:
                  "libs/, components/, types/, hooks/ and config/ are lower layers. They must not depend on features/ or app/.",
              },
            ],
          },
        ],
      },
    },

    // The Redux composition root may import feature slices, but never routing.
    {
      files: [`${src}/store/**`],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["@/app", "@/app/**"],
                message:
                  "The store is the composition root for features, not for routes.",
              },
            ],
          },
        ],
      },
    },

    // providers/ is the app-wide client provider boundary. It sits in the COMPOSITION layer
    // alongside app/ and store/, so wiring features together is legitimate — but like the store,
    // it must not reach into routing.
    {
      files: [`${src}/providers/**`],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["@/app", "@/app/**"],
                message: "providers/ composes features and infra, not routes.",
              },
            ],
          },
        ],
      },
    },

    // Routing composes features; it just has to keep navigation locale-aware.
    ...(navigation.length
      ? [
          {
            files: [`${src}/app/**`],
            rules: { "no-restricted-imports": ["error", { paths: navigation }] },
          },
        ]
      : []),

    // The edge file is bundled separately from the app, so a module that pulls next/headers or
    // server-only into it breaks the bundle rather than a test.
    //
    // DEFAULT-DENY with named exceptions, not a list of the modules that exist today. A literal
    // list claimed to cover "any module added later" and did not — two server-only modules were
    // added to the folder and neither was blocked. Denying the folder and naming what is safe
    // makes the next addition safe by default.
    ...(edgeFiles.length
      ? [
          {
            files: edgeFiles,
            rules: {
              "no-restricted-imports": [
                "error",
                {
                  patterns: [
                    {
                      group: [
                        "@/libs/auth/*",
                        ...edgeAllowed.map((allowed) => `!${allowed}`),
                      ],
                      message:
                        "This file is bundled separately and must not pull next/headers or server-only. Import the runtime-agnostic module instead.",
                    },
                  ],
                },
              ],
            },
          },
        ]
      : []),

    // Tests reach wherever they must in order to test.
    {
      files: ["**/*.test.ts", "**/*.test.tsx", "e2e/**"],
      rules: { "no-restricted-imports": "off" },
    },
  ];
};

export default boundaries;
