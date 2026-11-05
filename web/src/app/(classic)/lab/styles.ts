// The design experiments under /lab, in the order the switcher shows them.

export type LabStyle = { id: string; name: string; blurb: string; href: (slug: string) => string };

export const LAB_STYLES: LabStyle[] = [
  {
    id: "current",
    name: "Twenty (default)",
    blurb: "The live design: the whole site drawn with Twenty's UI library (twenty-ui), with dense record tables, kanban views, record pages and ⌘K search.",
    href: (slug) => `/${slug}`,
  },
  {
    id: "classic",
    name: "Classic",
    blurb: "The previous design: Paste's tokens on the site's own components. Opening it switches your visits to the classic design; its footer switches back.",
    href: (slug) => `/${slug}?style=classic`,
  },
  {
    id: "google",
    name: "Google",
    blurb: "Material 3 in the spirit of Google's knowledge panels: Google Sans, tonal surfaces, pill chips, big rounded cards.",
    href: (slug) => `/lab/google/${slug}`,
  },
  {
    id: "paste",
    name: "Paste",
    blurb: "Built with Twilio's Paste design system components (Emotion-based, client-rendered).",
    href: (slug) => `/lab/paste/${slug}`,
  },
];

export const DEFAULT_LAB_COMPANY = "vercel";
