import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Inter_Tight } from "next/font/google";
import { THEME_SCRIPT } from "@/components/theme-toggle";
import { SIDEBAR_SCRIPT } from "@/lib/sidebar";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const interTight = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin"], weight: ["700", "800"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3007"),
  title: { default: "Hyperlore: the sourced history of startups", template: "%s · Hyperlore" },
  description:
    "DeepWiki for startups. Renames, logos, funding rounds, launches and quotes, rebuilt by agents from primary sources. Every claim links to where it was said.",
  // No canonical or og:url here: children inherit them, and every page would claim to be the home page.
  openGraph: { siteName: "Hyperlore", type: "website", locale: "en_US" },
  twitter: { card: "summary_large_image" },
  applicationName: "Hyperlore",
  category: "reference",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  // Search consoles: set the tokens in Vercel's environment to verify ownership (Google, Bing, which also
  // feeds DuckDuckGo and Qwant, and Yandex).
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION && { google: process.env.GOOGLE_SITE_VERIFICATION }),
    ...(process.env.YANDEX_VERIFICATION && { yandex: process.env.YANDEX_VERIFICATION }),
    ...(process.env.BING_SITE_VERIFICATION && { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } }),
  },
};

// Dark by default; ThemeToggle repins this when the visitor picks light.
export const viewport: Viewport = { themeColor: "#0b0c0e" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SIDEBAR_SCRIPT }} />
      </head>
      {/* The design's chrome lives in each design's layout: (site)/layout.tsx. */}
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
