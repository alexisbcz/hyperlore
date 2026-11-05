import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { IconBuildingSkyscraper, IconListDetails } from "../icons";
import { indexMetadata } from "../og/meta";
import { PageHead } from "../ui";
import { Text } from "../tw";
import { topRequests } from "@/lib/inbox";
import { RequestForm } from "./forms";
import "./forms.css";

export const metadata: Metadata = indexMetadata({
  title: "Request a company",
  description: "Ask Hyperlore's agents to research a startup's history next.",
  path: "/request",
});

export default function RequestPage() {
  return (
    <>
      <PageHead section="companies" icon={IconBuildingSkyscraper} crumbs={[{ href: "/companies", label: "Companies" }]} title="Request a company" />
      <section className="tw-panel">
        <div className="twf-layout">
          <div className="twf-main">
            <h2 className="twf-title">Request a company</h2>
            <p className="twf-lede">
              Agents read the founders&apos; posts, interviews, Hacker News threads, press and archived websites, then write the company&apos;s
              history with a source on every claim. The most-requested companies go first.
            </p>
            <RequestForm />
          </div>
          <aside className="twf-side">
            <Suspense fallback={null}>
              <Queue />
            </Suspense>
          </aside>
        </div>
      </section>
    </>
  );
}

async function Queue() {
  await connection();
  const queue = await topRequests(10);
  if (!queue) return null;
  return (
    <div className="tw-side-section" style={{ borderBottom: 0 }}>
      <div className="tw-side-section-head">
        <IconListDetails size={16} aria-hidden /> In the queue <span className="tw-col-count tw-num">{queue.length}</span>
      </div>
      {queue.length ? (
        <ol className="tw-rel" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {queue.map((r) => (
            <li key={r.key} className="tw-rel-row">
              <span className="tw-rel-text">{r.name}</span>
              <span className="tw-rel-meta tw-num">
                {r.votes} {r.votes === 1 ? "vote" : "votes"}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <Text size="sm" color="tertiary">
          The queue is empty. Be the first.
        </Text>
      )}
    </div>
  );
}
