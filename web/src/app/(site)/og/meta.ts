import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

/** The classic index pages' metadata, minus the image they name: each Twenty page has its own
 *  opengraph-image.tsx, and an explicit image would override it. */
export function indexMetadata(page: { title: string; description: string; path: string }): Metadata {
  const m = pageMetadata(page);
  const { images: _og, ...openGraph } = (m.openGraph ?? {}) as Record<string, unknown>;
  const { images: _tw, ...twitter } = (m.twitter ?? {}) as Record<string, unknown>;
  return { ...m, openGraph, twitter } as Metadata;
}
