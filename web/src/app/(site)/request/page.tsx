import type { Metadata } from "next";
import { IconBuildingSkyscraper, IconListDetails } from "../icons";
import { indexMetadata } from "../og/meta";
import { PageHead } from "../ui";
import { Text } from "../tw";
import { ARCHIVE_REPO, issuesUrl } from "@/lib/github";
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
            <Queue />
          </aside>
        </div>
      </section>
    </>
  );
}

function Queue() {
  return (
    <div className="tw-side-section" style={{ borderBottom: 0 }}>
      <div className="tw-side-section-head">
        <IconListDetails size={16} aria-hidden /> In the queue
      </div>
      <Text size="sm" color="tertiary">
        Requests are GitHub issues: <a className="tw-link" href={issuesUrl(ARCHIVE_REPO, "request")} target="_blank" rel="noreferrer">see the open requests</a> and
        give a 👍 to the ones you want first.
      </Text>
    </div>
  );
}
