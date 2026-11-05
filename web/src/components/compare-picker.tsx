"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Plus, X } from "lucide-react";
import { MAX_COMPARE } from "@/lib/directory";
import { BUTTON, INPUT } from "./filters";

// Not exported from here: a constant from a "use client" module reaches server components as a client
// reference, not a number.

/** Selected companies as removable chips, plus a type-to-find field to add one (up to four). */
export function ComparePicker({ selected, options }: { selected: { slug: string; name: string }[]; options: { slug: string; name: string }[] }) {
  const router = useRouter();
  const listId = useId();
  const [text, setText] = useState("");
  const go = (slugs: string[]) => router.push(slugs.length ? `/compare?c=${slugs.join(",")}` : "/compare", { scroll: false });
  const chosen = selected.map((s) => s.slug);
  const available = options.filter((o) => !chosen.includes(o.slug));
  const add = (value: string) => {
    const v = value.trim().toLowerCase();
    const hit = available.find((o) => o.name.toLowerCase() === v || o.slug === v);
    if (!hit) return false;
    setText("");
    go([...chosen, hit.slug]);
    return true;
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {selected.map((s) => (
        <button
          key={s.slug}
          type="button"
          onClick={() => go(chosen.filter((x) => x !== s.slug))}
          aria-label={`Remove ${s.name} from the comparison`}
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-bg-subtle pl-3 pr-2 text-sm text-fg transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-accent sm:h-8"
        >
          {s.name}
          <X aria-hidden="true" className="size-3.5 text-fg-subtle" />
        </button>
      ))}
      {chosen.length < MAX_COMPARE && (
        <form
          className="flex min-w-0 items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add(text);
          }}
        >
          <label htmlFor={`${listId}-input`} className="sr-only">
            Add a company to compare
          </label>
          <input
            id={`${listId}-input`}
            list={listId}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              // Picking a suggestion from the list fills the exact name: add it right away.
              if (available.some((o) => o.name === e.target.value)) add(e.target.value);
            }}
            placeholder={chosen.length ? "Add a company…" : "Pick a company…"}
            autoComplete="off"
            className={`${INPUT} h-10 w-52 sm:h-8`}
          />
          <datalist id={listId}>
            {available.map((o) => (
              <option key={o.slug} value={o.name} />
            ))}
          </datalist>
          <button type="submit" className={BUTTON}>
            <Plus aria-hidden="true" className="size-4" />
            Add
          </button>
        </form>
      )}
    </div>
  );
}
