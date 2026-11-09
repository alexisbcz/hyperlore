"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { IconArrowRight } from "../icons";
import { LightButton } from "../tw";
import { CorrectionForm } from "../request/forms";

export function Correct() {
  const params = useSearchParams();
  const event = params.get("event");
  if (!event) {
    return (
      <>
        <p className="twf-lede">Open this page from the “Suggest a correction” link next to a fact.</p>
        <LightButton variant="outline" endIcon={<IconArrowRight />} render={<Link href="/companies" />} nativeButton={false}>
          Browse companies
        </LightButton>
      </>
    );
  }
  const about = params.get("about") ?? "";
  const page = params.get("page") ?? "";
  return (
    <>
      {about && (
        <p className="twf-event">
          <strong>{about}</strong>
          {page && (
            <>
              {" · "}
              <Link href={page} className="tw-link">
                {page}
              </Link>
            </>
          )}
        </p>
      )}
      <CorrectionForm eventId={event} about={about} page={page} />
    </>
  );
}
