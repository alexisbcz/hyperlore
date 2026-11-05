"use client";

import { useActionState } from "react";
import { type FormState, requestCompany, suggestCorrection } from "@/app/actions";

const input =
  "w-full rounded-md border border-border bg-bg px-3 py-2 text-[16px] text-fg outline-none placeholder:text-fg-subtle focus-visible:border-fg-subtle focus-visible:ring-2 focus-visible:ring-accent/30 sm:text-sm";

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-fg">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-fg-subtle">
          {hint}
        </p>
      )}
    </div>
  );
}

function Status({ state }: { state: FormState }) {
  return (
    <p role="status" aria-live="polite" className={`text-sm ${state?.ok ? "text-fg" : "text-red-600 dark:text-red-400"}`}>
      {state?.message}
    </p>
  );
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      disabled={pending}
      className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-on-primary transition-opacity hover:bg-primary-hover disabled:opacity-50"
    >
      {pending ? "Sending…" : children}
    </button>
  );
}

export function RequestForm() {
  const [state, action, pending] = useActionState(requestCompany, null);
  return (
    <form action={action} className="space-y-4">
      <Field id="name" label="Company">
        <input id="name" name="name" required autoComplete="off" placeholder="Fly.io" className={input} />
      </Field>
      <Field id="domain" label="Website" hint="Helps agents find the right company and its archived logos.">
        <input id="domain" name="domain" inputMode="url" autoComplete="off" placeholder="fly.io" aria-describedby="domain-hint" className={input} />
      </Field>
      <Field id="note" label="Anything we should look at?" hint="Optional: a founder interview, a launch thread, an old name.">
        <textarea id="note" name="note" rows={3} aria-describedby="note-hint" className={input} />
      </Field>
      <div className="flex flex-wrap items-center gap-4">
        <Submit pending={pending}>Request</Submit>
        <Status state={state} />
      </div>
    </form>
  );
}

export function CorrectionForm({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(suggestCorrection, null);
  if (state?.ok) return <Status state={state} />;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="event" value={eventId} />
      <Field id="claim" label="What's wrong?">
        <textarea id="claim" name="claim" required rows={4} className={input} placeholder="The round was led by…, not…" />
      </Field>
      <Field id="source" label="Source" hint="A link that shows the correct version. Corrections without one take longer.">
        <input id="source" name="source" type="url" inputMode="url" aria-describedby="source-hint" placeholder="https://" className={input} />
      </Field>
      <Field id="contact" label="Your name or handle" hint="Optional. Say if you're the founder or worked there.">
        <input id="contact" name="contact" aria-describedby="contact-hint" className={input} />
      </Field>
      <div className="flex flex-wrap items-center gap-4">
        <Submit pending={pending}>Send correction</Submit>
        <Status state={state} />
      </div>
    </form>
  );
}
