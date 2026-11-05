import { Skeleton } from "./tw";

/** Shown while a page's records stream in: the page frame with skeleton rows, like Twenty's table loader. */
export default function Loading() {
  return (
    <>
      <div className="tw-pagehead">
        <Skeleton width={160} height={16} />
      </div>
      <section className="tw-panel" aria-busy="true" aria-label="Loading">
        <div className="tw-viewbar">
          <Skeleton width={140} height={14} />
        </div>
        <div style={{ padding: 8, display: "grid", gap: 10 }}>
          {Array.from({ length: 14 }, (_, i) => (
            <Skeleton key={i} height={14} width={`${92 - (i % 4) * 9}%`} />
          ))}
        </div>
      </section>
    </>
  );
}
