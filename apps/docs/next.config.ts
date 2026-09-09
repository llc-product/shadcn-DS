import type { NextConfig } from "next";

// GitLab Pages serves a project site under /<project>/, so the build needs a base path — but a
// local `next dev` must not have one. PUBLIC_PATH is set by CI and unset everywhere else, and the
// trailing slash GitLab writes into it has to come off: Next rejects a basePath that ends in "/".
const publicPath = process.env.PUBLIC_PATH?.replace(/\/+$/, "") ?? "";

const nextConfig: NextConfig = {
  // Static export: no server anywhere in the docs site. It is also the honest test of the
  // package — anything that quietly needed a request at render time fails the build here.
  output: "export",
  // /tokens -> /tokens/index.html, so a plain file server resolves it without rewrite rules.
  trailingSlash: true,
  ...(publicPath ? { basePath: publicPath, assetPrefix: publicPath } : {}),
};

export default nextConfig;
