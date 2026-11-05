import type { Metadata } from "next";
import { IconBuildingSkyscraper, IconCircleCheck, IconGauge } from "../icons";
import { indexMetadata } from "../og/meta";
import { Gloss, PageHead, Panel } from "../ui";
import type { Benchmark } from "@/components/benchmark-explorer";
import data from "@/app/(classic)/benchmarks/benchmarks.json";
import { BenchmarksView } from "./view";
import "./benchmarks.css";

const benchmarks = data as Benchmark[];

export const metadata: Metadata = indexMetadata({
  title: "AI benchmarks",
  description: "Every major AI benchmark and leaderboard, who produces it, what it measures, how it works, and where it falls short.",
  path: "/benchmarks",
});

export default function BenchmarksPage() {
  const producers = new Set(benchmarks.map((b) => b.producer)).size;
  const active = benchmarks.filter((b) => b.status === "Active").length;
  const kpis = [
    { label: "Benchmarks", value: benchmarks.length, icon: IconGauge, hue: 20, sat: 85 },
    { label: "Producers", value: producers, icon: IconBuildingSkyscraper, hue: 215, sat: 90 },
    { label: "Still active", value: active, icon: IconCircleCheck, hue: 145, sat: 90 },
  ];
  return (
    <>
      <PageHead section="benchmarks" icon={IconGauge} title="AI benchmarks" />
      <Panel>
        <div className="tw-bench-kpis">
          {kpis.map((k) => (
            <div key={k.label} className="tw-bench-kpi">
              <Gloss icon={k.icon} hue={k.hue} sat={k.sat} size="md" />
              <span className="tw-bench-kpi-label">{k.label}</span>
              <span className="tw-bench-kpi-value">{k.value}</span>
            </div>
          ))}
          <p className="tw-bench-intro">The tests the AI industry grades itself on: who runs them, what they really measure and where they break down. Each links to its official page and sources.</p>
        </div>
        <BenchmarksView benchmarks={benchmarks} />
      </Panel>
    </>
  );
}
