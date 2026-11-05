import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Archived logos are third-party SVGs: never let one run scripts if opened directly.
  async headers() {
    return [
      {
        source: "/assets/:path*",
        headers: [{ key: "Content-Security-Policy", value: "default-src 'none'; style-src 'unsafe-inline'; img-src data:" }],
      },
    ];
  },
  // The archive snapshot is read from disk at runtime; make sure it ships with every function.
  outputFileTracingIncludes: {
    "/**": ["./data/archive.json"],
    // Fonts the PDF edition is typeset with (Inter, and Noto Sans TC for Chinese).
    "/[company]/lore.pdf": ["./src/assets/fonts/**"],
  },
  // react-pdf loads fonts and native-ish modules at runtime: keep it out of the server bundle.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
