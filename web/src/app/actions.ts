import { z } from "zod";
import { ARCHIVE_REPO, newIssueUrl } from "@/lib/github";

// The site is static (no server): a request or correction is validated here, in the browser, and
// opens a pre-filled issue on the public archive repository, where agents pick it up.

export type FormState = { ok: boolean; message: string } | null;

const RequestSchema = z.object({
  name: z.string().trim().min(2, "Give the company's name.").max(120),
  domain: z
    .string()
    .trim()
    .max(200)
    .transform((d) => d.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase())
    .refine((d) => d === "" || /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d), "That doesn't look like a domain."),
  note: z.string().trim().max(1000),
});

function open(url: string): FormState {
  const w = window.open(url, "_blank", "noopener");
  if (!w) window.location.href = url;
  return { ok: true, message: "GitHub opened in a new tab: submit the issue there to send it." };
}

export async function requestCompany(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = RequestSchema.safeParse({
    name: form.get("name") ?? "",
    domain: form.get("domain") ?? "",
    note: form.get("note") ?? "",
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { name, domain, note } = parsed.data;
  return open(
    newIssueUrl(ARCHIVE_REPO, {
      title: `Request: ${name}${domain ? ` (${domain})` : ""}`,
      body: [`**Company:** ${name}`, domain && `**Website:** ${domain}`, note && `**Where to look:**\n${note}`, "", "👍 this issue to vote for it."]
        .filter((l) => l !== "")
        .join("\n\n"),
      labels: ["request"],
    }),
  );
}

const CorrectionSchema = z.object({
  event: z.string().trim().min(1).max(64),
  about: z.string().trim().max(300),
  page: z.string().trim().max(500),
  claim: z.string().trim().min(10, "Say what is wrong, in a sentence or two.").max(2000),
  source: z.union([z.literal(""), z.url("The source must be a link.")]),
  contact: z.string().trim().max(200),
});

export async function suggestCorrection(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = CorrectionSchema.safeParse({
    event: form.get("event") ?? "",
    about: form.get("about") ?? "",
    page: form.get("page") ?? "",
    claim: form.get("claim") ?? "",
    source: String(form.get("source") ?? "").trim(),
    contact: form.get("contact") ?? "",
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { event, about, page, claim, source, contact } = parsed.data;
  return open(
    newIssueUrl(ARCHIVE_REPO, {
      title: `Correction: ${about || event}`.slice(0, 200),
      body: [
        `**Event:** ${about || "(unnamed)"} · id \`${event}\``,
        page && `**Page:** ${page}`,
        `**What's wrong:**\n${claim}`,
        source && `**Source:** ${source}`,
        contact && `**From:** ${contact}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      labels: ["correction"],
    }),
  );
}
