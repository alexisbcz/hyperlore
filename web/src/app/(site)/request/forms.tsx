"use client";

import { useActionState, type ReactNode } from "react";
import { Callout } from "twenty-ui/components/feedback";
import { MainButton } from "twenty-ui/components/input";
import { Field, Input, Textarea } from "twenty-ui/primitives/input";
import { IconCircleCheck, IconAlertTriangle, IconSend } from "twenty-ui/icon";
import { type FormState, requestCompany, suggestCorrection } from "@/app/actions";

// The request and correction forms in Twenty's form primitives. Submitting validates in the browser
// and opens a pre-filled GitHub issue (see src/app/actions.ts).

function Row({ name, label, hint, children, required }: { name: string; label: string; hint?: string; children: ReactNode; required?: boolean }) {
  return (
    <Field.Root name={name} className="twf-field">
      <Field.Label>
        {label}
        {!required && <span className="twf-optional"> · optional</span>}
      </Field.Label>
      {children}
      {hint && <Field.Description>{hint}</Field.Description>}
      {required && <Field.Error match="valueMissing">Fill this in.</Field.Error>}
    </Field.Root>
  );
}

function Status({ state }: { state: FormState }) {
  if (!state) return <div role="status" aria-live="polite" />;
  return (
    <div role="status" aria-live="polite">
      <Callout
        status={state.ok ? "success" : "error"}
        title={state.message}
        icon={state.ok ? <IconCircleCheck size={16} aria-hidden /> : <IconAlertTriangle size={16} aria-hidden />}
        fullWidth
      />
    </div>
  );
}

export function RequestForm() {
  const [state, action, pending] = useActionState(requestCompany, null);
  return (
    <form action={action} className="twf-form">
      <Row name="name" label="Company" required>
        <Input id="name" required autoComplete="off" placeholder="Fly.io" />
      </Row>
      <Row name="domain" label="Website" hint="Helps agents find the right company and its archived logos.">
        <Input id="domain" inputMode="url" autoComplete="off" placeholder="fly.io" />
      </Row>
      <Row name="note" label="Anything we should look at?" hint="A founder interview, a launch thread, an old name.">
        <Textarea id="note" rows={3} />
      </Row>
      <div className="twf-actions">
        <MainButton type="submit" loading={pending} startIcon={<IconSend />}>
          {pending ? "Opening GitHub…" : "Request on GitHub"}
        </MainButton>
      </div>
      <Status state={state} />
    </form>
  );
}

export function CorrectionForm({ eventId, about = "", page = "" }: { eventId: string; about?: string; page?: string }) {
  const [state, action, pending] = useActionState(suggestCorrection, null);
  if (state?.ok) return <Status state={state} />;
  return (
    <form action={action} className="twf-form">
      <input type="hidden" name="event" value={eventId} />
      <input type="hidden" name="about" value={about} />
      <input type="hidden" name="page" value={page} />
      <Row name="claim" label="What's wrong?" required>
        <Textarea id="claim" required rows={4} placeholder="The round was led by…, not…" />
      </Row>
      <Row name="source" label="Source" hint="A link that shows the correct version. Corrections without one take longer.">
        <Input id="source" type="url" inputMode="url" placeholder="https://" />
      </Row>
      <Row name="contact" label="Your name or handle" hint="Say if you're the founder or worked there.">
        <Input id="contact" />
      </Row>
      <div className="twf-actions">
        <MainButton type="submit" loading={pending} startIcon={<IconSend />}>
          {pending ? "Opening GitHub…" : "Send on GitHub"}
        </MainButton>
      </div>
      <Status state={state} />
    </form>
  );
}
