/** The public repositories behind the site. Requests and corrections are GitHub issues on the archive. */
export const CODE_REPO = process.env.NEXT_PUBLIC_CODE_REPO ?? "alexisbcz/hyperlore";
export const ARCHIVE_REPO = process.env.NEXT_PUBLIC_ARCHIVE_REPO ?? "alexisbcz/hyperlore-archive";

export function newIssueUrl(repo: string, { title, body, labels }: { title: string; body: string; labels?: string[] }) {
  const q = new URLSearchParams({ title, body, ...(labels?.length && { labels: labels.join(",") }) });
  return `https://github.com/${repo}/issues/new?${q}`;
}

export const issuesUrl = (repo: string, label?: string) =>
  `https://github.com/${repo}/issues${label ? `?q=${encodeURIComponent(`is:issue is:open label:${label}`)}` : ""}`;
