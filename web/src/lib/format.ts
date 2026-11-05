// Formatting shared by server pages and client components.

export const SOURCE_LABELS: Record<string, string> = {
  tweet: "X",
  youtube: "Video",
  podcast: "Podcast",
  hn: "Hacker News",
  bluesky: "Bluesky",
  blog: "Blog",
  press: "Press",
  article: "Article",
  wayback: "Archive",
  github: "GitHub",
  wikipedia: "Wikipedia",
  linkedin: "LinkedIn",
  reddit: "Reddit",
  website: "Website",
  filing: "Filing",
  yc: "Y Combinator",
};

/** Y Combinator's own site (company pages, blog, Startup School), not Hacker News on news.ycombinator.com. */
export function isYC(url: string) {
  try {
    const host = new URL(url).hostname;
    return host === "ycombinator.com" || (host.endsWith(".ycombinator.com") && host !== "news.ycombinator.com");
  } catch {
    return false;
  }
}

export function formatDate(date?: string) {
  if (!date) return "";
  const [y, m, d] = date.split("-");
  if (!m) return y;
  const month = new Date(Date.UTC(+y, +m - 1, 1)).toLocaleString("en", { month: "short", timeZone: "UTC" });
  return d ? `${+d} ${month} ${y}` : `${month} ${y}`;
}
