import type { Metadata } from "next";
import "twenty-ui/style.css";
import "twenty-ui/theme-light.css";
import "twenty-ui/theme-dark.css";
import "./twenty.css";
import { navCounts } from "./data";
import { TwentyShell } from "./shell";

// The default design, drawn with Twenty's UI library (twenty-ui): a full-viewport app shell with its
// own navigation, search and theme.

export const metadata: Metadata = {
  title: { default: "Hyperlore: the sourced history of startups", template: "%s · Hyperlore" },
};

export default function TwentyLayout({ children }: LayoutProps<"/">) {
  return (
    <TwentyShell counts={navCounts()}>{children}</TwentyShell>
  );
}
