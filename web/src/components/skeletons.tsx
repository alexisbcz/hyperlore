// Loading placeholders that sit exactly where the content will land: same containers, same grid
// columns, same heights for headers and rows, so nothing jumps when the page streams in.
import type { ReactNode } from "react";

/** One grey shape. Sizes come from the caller so each skeleton mirrors its page. */
export function Bone({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`block rounded bg-bg-hover ${className}`} />;
}

function Busy({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div aria-busy="true" className={`motion-safe:animate-pulse ${className}`}>
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** A text line of a given width; `h` matches the line height of the text it stands for. */
const Line = ({ w, h = "h-4" }: { w: string; h?: string }) => <Bone className={`${h} ${w}`} />;

/** The company page: contents rail, header, facts panel and the funding table, on the page's own grid. */
export function CompanySkeleton() {
  return (
    <Busy
      label="Loading company"
      className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[12rem_minmax(0,1fr)] xl:grid-cols-[12rem_minmax(0,1fr)_17rem]"
    >
      <div className="hidden space-y-3 lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:block xl:row-span-2">
        <Line w="w-20" h="h-3" />
        <div className="space-y-3.5 pt-2">
          {["w-24", "w-20", "w-16", "w-28", "w-20", "w-24", "w-32", "w-28", "w-12"].map((w, i) => (
            <Line key={i} w={w} h="h-3.5" />
          ))}
        </div>
      </div>
      <div className="min-w-0 lg:col-start-2 lg:row-start-1">
        <Bone className="size-14 rounded-xl" />
        <Bone className="mt-4 h-10 w-64 sm:h-12" />
        <div className="mt-4 max-w-2xl space-y-3">
          <Line w="w-full" h="h-5" />
          <Line w="w-full" h="h-5" />
          <Line w="w-2/5" h="h-5" />
        </div>
        <div className="mt-5 flex gap-2">
          {["w-28", "w-16", "w-24", "w-20", "w-20"].map((w, i) => (
            <Bone key={i} className={`h-8 ${w}`} />
          ))}
        </div>
        <Line w="mt-4 w-72" h="h-3" />
      </div>
      <div className="min-w-0 lg:col-start-2 lg:row-start-2 xl:col-start-3 xl:row-span-2 xl:row-start-1">
        <div className="rounded-lg border border-border">
          <div className="flex h-28 items-center justify-center border-b border-border">
            <Bone className="h-10 w-32" />
          </div>
          <div className="divide-y divide-border px-4">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 py-2.5">
                <Line w="w-16" h="h-3.5" />
                <Line w={i % 2 ? "w-3/4" : "w-1/2"} h="h-3.5" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="min-w-0 space-y-4 lg:col-start-2 lg:row-start-3 xl:row-start-2">
        <div className="flex items-baseline justify-between">
          <Bone className="h-6 w-24" />
          <Line w="w-16" h="h-3" />
        </div>
        <TableRows rows={5} header />
      </div>
    </Busy>
  );
}

/** Rows of a bordered table or list: a mark, a title line and a second line. */
function TableRows({ rows, mark = false, header = false }: { rows: number; mark?: boolean; header?: boolean }) {
  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {header && (
        <div className="flex gap-8 bg-bg-subtle px-4 py-3">
          {["w-10", "w-12", "ml-auto w-14", "w-14", "w-16"].map((w, i) => (
            <Line key={i} w={w} h="h-3" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          {mark && <Bone className="size-7 shrink-0 rounded-md" />}
          <div className="min-w-0 flex-1 space-y-2">
            <Line w={["w-1/3", "w-1/4", "w-2/5", "w-1/3", "w-1/5"][i % 5]} h="h-3.5" />
            <Line w={["w-2/3", "w-1/2", "w-3/5", "w-3/4", "w-1/2"][i % 5]} h="h-3" />
          </div>
          <Line w="hidden w-20 sm:block" h="h-3.5" />
        </div>
      ))}
    </div>
  );
}

/** Filter sidebar + toolbar + rows: companies, investors, people and rounds share this layout. */
export function DirectorySkeleton({ label, groups = 4, rows = 10 }: { label: string; groups?: number; rows?: number }) {
  return (
    <Busy label={label} className="mt-8 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
      <div className="hidden space-y-6 lg:block">
        {Array.from({ length: groups }, (_, g) => (
          <div key={g} className="space-y-3 border-b border-border pb-5">
            <Line w="w-16" h="h-3.5" />
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Bone className="size-3.5 shrink-0" />
                <Line w={["w-20", "w-24", "w-16", "w-28", "w-20"][i]} h="h-3.5" />
                <Line w="ml-auto w-5" h="h-3" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="min-w-0">
        <div className="flex gap-2">
          <Bone className="h-9 flex-1" />
          <Bone className="hidden h-9 w-32 sm:block" />
        </div>
        <Line w="mt-4 w-28" h="h-3.5" />
        <div className="mt-3">
          <TableRows rows={rows} mark />
        </div>
      </div>
    </Busy>
  );
}

/** Text-width entity pages (people, investors, places, stories): back link, header, then a list. */
export function EntitySkeleton({ label, avatar = false, title = "h-9 w-64" }: { label: string; avatar?: boolean; title?: string }) {
  return (
    <Busy label={label} className="space-y-10">
      <div>
        <Line w="w-20" h="h-3.5" />
        <div className="mt-4 flex items-center gap-5">
          {avatar && <Bone className="size-20 shrink-0 rounded-full" />}
          <div className="min-w-0 flex-1 space-y-3">
            <Bone className={title} />
            <Line w="w-24" h="h-3" />
          </div>
        </div>
        <div className="mt-7 space-y-3">
          <Line w="w-full" h="h-4" />
          <Line w="w-full" h="h-4" />
          <Line w="w-3/5" h="h-4" />
        </div>
        <div className="mt-5 flex gap-2">
          {["w-20", "w-28", "w-12", "w-24"].map((w, i) => (
            <Bone key={i} className={`h-8 ${w}`} />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <Bone className="h-5 w-32" />
        <TableRows rows={5} />
      </div>
    </Busy>
  );
}

/** A grid of bordered cards, like the home page's companies and the places and stories lists. */
export function CardGridSkeleton({
  label,
  cards = 6,
  media = false,
  className = "mt-8",
}: {
  label: string;
  cards?: number;
  /** A 16:9 photo on top, like the places list. */
  media?: boolean;
  className?: string;
}) {
  return (
    <Busy label={label} className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {Array.from({ length: cards }, (_, i) =>
        media ? (
          <div key={i} className="overflow-hidden rounded-xl border border-border">
            <Bone className="aspect-[16/9] w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Line w={["w-32", "w-24", "w-40"][i % 3]} h="h-4" />
              <Line w="w-20" h="h-3" />
              <Line w="mt-3 w-full" h="h-3.5" />
              <Line w="w-3/4" h="h-3.5" />
            </div>
          </div>
        ) : (
        <div key={i} className="space-y-3 rounded-lg border border-border p-5">
          <div className="flex items-center gap-3">
            <Bone className="size-10 shrink-0 rounded-lg" />
            <Line w={["w-24", "w-20", "w-28"][i % 3]} h="h-4" />
          </div>
          <Line w="w-full" h="h-3.5" />
          <Line w="w-4/5" h="h-3.5" />
          <Line w="w-1/2" h="h-3" />
        </div>
        ),
      )}
    </Busy>
  );
}

/** A single list column (stories). */
export function ListSkeleton({ label, rows = 6 }: { label: string; rows?: number }) {
  return (
    <Busy label={label} className="mt-8">
      <TableRows rows={rows} />
    </Busy>
  );
}

/** A tall block for charts and comparisons, with the header line above it. */
export function PanelSkeleton({ label, height = "h-96" }: { label: string; height?: string }) {
  return (
    <Busy label={label} className="mt-8 space-y-4">
      <div className="flex gap-2">
        {["w-32", "w-28", "w-24"].map((w, i) => (
          <Bone key={i} className={`h-9 ${w}`} />
        ))}
      </div>
      <Bone className={`${height} w-full rounded-lg`} />
    </Busy>
  );
}
