import type { NextConfig } from "next";

// A static site (deployed to Netlify): every page, feed and API response is prebuilt from the archive
// snapshot (web/data/archive.json) by `next build`, into out/. PDFs: scripts/pdfs.tsx, after the build.
// NEXT_PUBLIC_BASE_PATH serves it under a sub-path (e.g. "/hyperlore" on <user>.github.io); empty by default.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  // Cache Components turns on partial prerendering, which static export refuses. "use cache" stays on
  // (experimental.useCache): it memoises the archive-wide indexes across the ~20,000 prerendered files.
  experimental: { useCache: true },
  // No image server on a static host.
  images: { unoptimized: true },
  // The PDF editions of the largest companies take over a minute each while 13 workers share the CPU.
  staticPageGenerationTimeout: 600,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // react-pdf loads fonts and native-ish modules at build time: keep it out of the bundle.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
