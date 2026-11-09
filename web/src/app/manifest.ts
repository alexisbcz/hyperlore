import type { MetadataRoute } from "next";
import { withBase } from "@/lib/base";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hyperlore: the sourced history of startups",
    short_name: "Hyperlore",
    description: "Renames, logos, funding rounds, launches and quotes, every claim linked to its source.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0c0e",
    theme_color: "#0b0c0e",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: withBase("/icon-192.png"), type: "image/png", sizes: "192x192" },
      { src: withBase("/icon-512.png"), type: "image/png", sizes: "512x512" },
      { src: "/icon-maskable-512.png", type: "image/png", sizes: "512x512", purpose: "maskable" },
    ],
  };
}

// No params: lets static export (output: "export") prerender this file.
export const generateStaticParams = () => [{}];
