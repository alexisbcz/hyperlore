import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/og";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/correct"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

// No params: lets static export (output: "export") prerender this file.
export const generateStaticParams = () => [{}];
