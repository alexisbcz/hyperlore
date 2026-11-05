import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Building2, Gauge } from "lucide-react";
import { BenchmarkExplorer, type Benchmark } from "@/components/benchmark-explorer";
import { Gloss } from "@/components/gloss";
import { pageMetadata } from "@/lib/seo";
import data from "./benchmarks.json";

const benchmarks = data as Benchmark[];

export const metadata: Metadata = pageMetadata({
  title: "AI benchmarks",
  description: "Every major AI benchmark and leaderboard, who produces it, what it measures, how it works, and where it falls short.",
  path: "/benchmarks",
});

export default function BenchmarksPage() {
  const producers = new Map<string, Benchmark[]>();
  for (const b of benchmarks) producers.set(b.producer, [...(producers.get(b.producer) ?? []), b]);
  const ranked = [...producers].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const active = benchmarks.filter((b) => b.status === "Active").length;
  const tiles = [
    { label: "Benchmarks", value: benchmarks.length, item: { icon: Gauge, hue: 74, sat: 80 } },
    { label: "Producers", value: producers.size, item: { icon: Building2, hue: 215 } },
    { label: "Still active", value: active, item: { icon: Activity, hue: 145 } },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="display text-4xl uppercase leading-[1.02] sm:text-5xl">AI benchmarks</h1>
      <p className="mt-3 max-w-3xl text-pretty leading-relaxed text-fg-muted">
        The tests the AI industry grades itself on, who runs them, what they really measure and where they break down. Each one links to its official page and sources.
      </p>
      <ul className="mt-6 grid gap-2 sm:grid-cols-3">
        {tiles.map((t) => (
          <li key={t.label} className="pad flex items-center gap-3 rounded-xl p-2.5">
            <Gloss item={t.item} large />
            <span>
              <span className="block font-mono text-[11px] text-fg-subtle">{t.label}</span>
              <span className="block text-sm font-semibold tabular-nums text-fg">{t.value}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <BenchmarkExplorer benchmarks={benchmarks} />
      </div>

      <section aria-labelledby="producers-title" className="mt-14">
        <h2 id="producers-title" className="text-xl font-semibold text-fg">
          Who makes them
        </h2>
        <p className="mb-4 mt-1 text-sm text-fg-subtle">Companies, labs, universities and communities, by number of benchmarks here.</p>
        <div className="tbl">
          <div className="tbl-scroll">
            <table>
              <thead>
                <tr>
                  <th>Producer</th>
                  <th>Type</th>
                  <th>Benchmarks</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map(([name, list]) => (
                  <tr key={name}>
                    <td className="font-medium">
                      {list[0].producerSlug ? (
                        <Link href={`/${list[0].producerSlug}`} className="link-u">
                          {name}
                        </Link>
                      ) : (
                        <span className="text-fg">{name}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">{list[0].producerType}</td>
                    <td>{list.map((b) => b.name).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
