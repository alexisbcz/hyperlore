"use server";

import { z } from "zod";
import { addCorrection, addRequest, inboxOpen } from "@/lib/inbox";

export type FormState = { ok: boolean; message: string } | null;

const CLOSED: FormState = { ok: false, message: "Submissions are closed for a moment. Please try again later." };

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

export async function requestCompany(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = RequestSchema.safeParse({
    name: form.get("name") ?? "",
    domain: form.get("domain") ?? "",
    note: form.get("note") ?? "",
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  if (!inboxOpen()) return CLOSED;
  const { name, domain, note } = parsed.data;
  const isNew = await addRequest({ key: (domain || name).toLowerCase(), name, domain }, note);
  return {
    ok: true,
    message: isNew
      ? `${name} is in the queue. Thanks for the request.`
      : `${name} was already requested. Your vote moves it up the queue.`,
  };
}

const CorrectionSchema = z.object({
  event: z.string().trim().min(1).max(64),
  claim: z.string().trim().min(10, "Say what is wrong, in a sentence or two.").max(2000),
  source: z.union([z.literal(""), z.url("The source must be a link.")]),
  contact: z.string().trim().max(200),
});

export async function suggestCorrection(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = CorrectionSchema.safeParse({
    event: form.get("event") ?? "",
    claim: form.get("claim") ?? "",
    source: String(form.get("source") ?? "").trim(),
    contact: form.get("contact") ?? "",
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  if (!inboxOpen()) return CLOSED;
  await addCorrection(parsed.data);
  return { ok: true, message: "Thanks. An agent will check it against your source and update the record." };
}
