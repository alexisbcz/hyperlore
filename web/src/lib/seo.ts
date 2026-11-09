import type { Metadata } from "next";

// Shared metadata for index pages: canonical, og:url, title and description always agree, and the
// Open Graph block is complete (a page that sets none inherits the layout's, whose og:url is the home page).
export const SITE_NAME = "Hyperlore";

export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    // Setting openGraph drops the inherited file-based image, so name the site card explicitly.
    openGraph: {
      title: `${title} · ${SITE_NAME}`,
      description,
      url: path,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: { card: "summary_large_image", title: `${title} · ${SITE_NAME}`, description },
  };
}
