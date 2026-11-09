import type { Metadata } from "next";
import { Suspense } from "react";
import { IconPencil } from "../icons";
import { PageHead } from "../ui";
import { Correct } from "./view";
import "../request/forms.css";

export const metadata: Metadata = {
  title: "Suggest a correction",
  robots: { index: false },
};

// Static page: the browser reads ?event=&about=&page= and the form opens a GitHub issue.
export default function CorrectPage() {
  return (
    <>
      <PageHead section="companies" icon={IconPencil} title="Suggest a correction" />
      <section className="tw-panel">
        <div className="twf-main">
          <h2 className="twf-title">Suggest a correction</h2>
          <p className="twf-lede">
            Founders, employees and investors know things the record doesn&apos;t. Tell us what&apos;s wrong and where the right version is
            written down. Sending opens a pre-filled issue on GitHub.
          </p>
          <Suspense fallback={null}>
            <Correct />
          </Suspense>
        </div>
      </section>
    </>
  );
}
