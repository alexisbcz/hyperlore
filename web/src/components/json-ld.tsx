/** One structured-data block per page, describing only what the page renders. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // Escape "<" so archive text can never close the script tag.
  const json = JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
