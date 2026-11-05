"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { LAB_STYLES } from "./styles";

/** Pinned to the bottom of every experiment: switch style or company without losing your place in the comparison. */
export function LabBar({ style, slug, companies }: { style: string; slug: string; companies: { slug: string; name: string }[] }) {
  const router = useRouter();
  const current = LAB_STYLES.find((s) => s.id === style) ?? LAB_STYLES[0];
  return (
    <div className="fixed inset-x-0 bottom-24 z-40 flex lg:bottom-4 justify-center px-4 pb-[env(safe-area-inset-bottom)] font-[family-name:var(--font-inter)]">
      <div
        role="region"
        aria-label="Style lab"
        className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-neutral-200 bg-white/95 p-1 text-sm text-neutral-900 shadow-lg backdrop-blur [scrollbar-width:none] dark:border-neutral-800 dark:bg-neutral-950/95 dark:text-neutral-100"
      >
        <Link
          href={`/lab?company=${slug}`}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <FlaskConical aria-hidden="true" className="size-4" />
          Lab
        </Link>
        <span aria-hidden="true" className="h-5 w-px shrink-0 bg-neutral-200 dark:bg-neutral-800" />
        {LAB_STYLES.map((s) => (
          <Link
            key={s.id}
            href={s.href(slug)}
            aria-current={s.id === current.id ? "page" : undefined}
            className="flex h-8 shrink-0 items-center rounded-full px-3 text-neutral-600 hover:bg-neutral-100 aria-[current=page]:bg-neutral-900 aria-[current=page]:text-white dark:text-neutral-400 dark:hover:bg-neutral-800 dark:aria-[current=page]:bg-white dark:aria-[current=page]:text-neutral-900"
          >
            {s.name}
          </Link>
        ))}
        <span aria-hidden="true" className="h-5 w-px shrink-0 bg-neutral-200 dark:bg-neutral-800" />
        <label className="sr-only" htmlFor="lab-company">
          Company
        </label>
        <select
          id="lab-company"
          value={slug}
          onChange={(e) => router.push(current.href(e.target.value))}
          className="h-8 shrink-0 cursor-pointer rounded-full bg-transparent px-2 font-medium outline-none hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-neutral-800"
        >
          {companies.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
