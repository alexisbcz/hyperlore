"use client";

import { Cpu, MessageCircleQuestion, Search, Sparkles } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import type { AskNote, AskResult } from "@/lib/ask";
import { pickModel, type ChatMessage, type WorkerOut } from "./ask-model";
import { EventList, FundingTable, QuoteGrid } from "./lore";
import { Gloss } from "./gloss";

// Questions are answered by retrieval on the server (free) and, if the visitor opts in, summarised by a
// small model running on their own device: the site never pays for a model call.

type Turn = { id: number; q: string; result?: AskResult; error?: string; answer: string; writing: boolean };
type Model = { state: "off" | "loading" | "ready"; loaded: number; total: number; label?: string; error?: string };

const OPT_IN = "hyperlore:local-ai";

const readOptIn = () => {
  try {
    return localStorage.getItem(OPT_IN) === "1";
  } catch {
    return false;
  }
};

// Small models follow short, concrete prompts best: a few dated facts, the question last, quotes left
// to the cards (they pull a 350M model off topic). `limit` is lower on CPU, where every token is slow.
function prompt(q: string, r: AskResult, limit: number): ChatMessage[] {
  const notes = r.notes.filter((n) => !n.text.includes(" said: ")).slice(0, limit);
  return [
    {
      role: "system",
      content:
        "You are a helpful historian. Answer the question by summarising the numbered facts you are given, and nothing else. " +
        "Reply in 2 or 3 plain sentences. End each sentence with the number of the fact it uses, like [2].",
    },
    {
      role: "user",
      content: `Facts${r.companyName ? ` about ${r.companyName}` : ""}:\n${notes.map((n) => `[${n.n}] ${n.text}`).join("\n")}\n\nUsing these facts, answer: ${q}`,
    },
  ];
}

/** The model's text with [n] turned into links to the note's source. Unknown numbers are dropped. */
function Cited({ text, notes }: { text: string; notes: AskNote[] }) {
  return (
    <p className="text-pretty text-[15px] leading-relaxed text-fg">
      {text.split(/(\[\d+(?:\s*,\s*\d+)*\])/g).map((chunk, i) => {
        const m = chunk.match(/^\[([\d,\s]+)\]$/);
        if (!m) return <Fragment key={i}>{chunk}</Fragment>;
        return m[1]
          .split(",")
          .map((s) => notes.find((n) => n.n === Number(s.trim())))
          .filter((n): n is AskNote => !!n)
          .map((n) => (
            <a
              key={`${i}-${n.n}`}
              href={n.url}
              target="_blank"
              rel="noreferrer"
              title={n.host}
              className="ml-0.5 align-super font-mono text-[11px] text-accent hover:underline"
            >
              [{n.n}]
            </a>
          ));
      })}
    </p>
  );
}

const mb = (bytes: number) => `${Math.round(bytes / 1e6)} MB`;

/** `hero` puts the composer first with answers under it, and adds the Ask / Search rail. */
export function AskLore({ company, suggestions, hero }: { company?: string; suggestions: string[]; hero?: boolean }) {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [model, setModel] = useState<Model>({ state: "off", loaded: 0, total: 0 });
  const [webgpu, setWebgpu] = useState(false);
  const worker = useRef<Worker | null>(null);
  const pending = useRef<{ id: number; q: string; result: AskResult } | null>(null);
  const nextId = useRef(1);
  const busy = turns.some((t) => !t.result && !t.error) || turns.some((t) => t.writing);

  const update = (id: number, patch: Partial<Turn> | ((t: Turn) => Partial<Turn>)) =>
    setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, ...(typeof patch === "function" ? patch(t) : patch) } : t)));

  const write = (id: number, q: string, result: AskResult) => {
    if (!result.notes.length || !worker.current) return;
    update(id, { writing: true, answer: "" });
    worker.current.postMessage({ type: "generate", id, messages: prompt(q, result, webgpu ? 10 : 6) });
  };

  const start = () => {
    if (worker.current) return;
    const w = new Worker(new URL("./ask-worker.ts", import.meta.url), { type: "module" });
    worker.current = w;
    setModel((m) => ({ ...m, state: "loading", error: undefined }));
    w.onmessage = (e: MessageEvent<WorkerOut>) => {
      const msg = e.data;
      if (msg.type === "progress") setModel((m) => ({ ...m, loaded: msg.loaded, total: msg.total }));
      else if (msg.type === "ready") {
        setModel((m) => ({ ...m, state: "ready", label: msg.model }));
        const p = pending.current;
        pending.current = null;
        if (p) write(p.id, p.q, p.result);
      } else if (msg.type === "token") update(msg.id, (t) => ({ answer: t.answer + msg.text }));
      else if (msg.type === "done") update(msg.id, { writing: false });
      else if (msg.type === "error") {
        if (msg.id) update(msg.id, { writing: false });
        setModel((m) => ({ ...m, state: "off", error: msg.message }));
        worker.current?.terminate();
        worker.current = null;
      }
    };
    w.postMessage({ type: "load" });
  };

  const enable = () => {
    try {
      localStorage.setItem(OPT_IN, "1");
    } catch {}
    const last = turns.at(-1);
    if (last?.result) pending.current = { id: last.id, q: last.q, result: last.result };
    start();
  };

  useEffect(() => {
    // Size the download for the model this device will actually get (see ask-worker.ts).
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    gpu
      ?.requestAdapter()
      .then((a) => setWebgpu(!!a))
      .catch(() => {});
    if (readOptIn()) start();
    return () => worker.current?.terminate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const id = nextId.current++;
    setTurns((ts) => [...ts, { id, q, answer: "", writing: false }]);
    setInput("");
    try {
      const res = await fetch(`/api/ask?${new URLSearchParams({ q, ...(company && { company }) })}`);
      if (!res.ok) throw new Error(`The archive search failed (${res.status}).`);
      const result: AskResult = await res.json();
      update(id, { result });
      if (model.state === "ready") write(id, q, result);
      else if (model.state === "loading") pending.current = { id, q, result };
    } catch (err) {
      update(id, { error: err instanceof Error ? err.message : String(err) });
    }
  };

  const spec = pickModel(webgpu);
  const empty = (r: AskResult) => !r.events.length && !r.rounds.length && !r.quotes.length;

  const composer = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ask(input);
      }}
      className="flex gap-2"
    >
      {hero && (
        <div className="pad hidden w-20 shrink-0 flex-col gap-1 rounded-2xl p-1.5 text-xs font-medium sm:flex">
          <span className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl bg-bg-hover text-fg">
            <Gloss item={{ icon: MessageCircleQuestion, hue: 74, sat: 80 }} />
            Ask
          </span>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("hyperlore:search"))}
            className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl text-fg-subtle transition-colors hover:bg-bg-hover hover:text-fg"
          >
            <Gloss item={{ icon: Search, hue: 0, sat: 0 }} />
            Search
          </button>
        </div>
      )}
      <div className="pad flex min-w-0 flex-1 flex-col gap-3 rounded-2xl p-3 sm:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <textarea
            value={input}
            rows={2}
            onChange={(e) => setInput(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            aria-label="Ask the archive a question"
            placeholder="Ask about renames, rounds, launches, who said what…"
            className="w-full resize-none bg-transparent px-1 text-[16px] leading-snug text-fg outline-none placeholder:text-fg-subtle"
          />
          {turns.length === 0 && (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => ask(s)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-bg-hover px-2.5 py-1.5 text-left text-[13px] text-fg-muted transition-colors hover:text-fg"
                >
                  <Sparkles aria-hidden="true" className="size-3.5 shrink-0 text-accent" />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          disabled={busy || !input.trim()}
          className="btn-lime flex h-12 shrink-0 flex-col items-center justify-center rounded-xl pb-1 font-[family-name:var(--font-display)] text-sm font-extrabold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-80 sm:h-auto sm:w-32"
        >
          {busy ? "…" : "Ask"}
          <span className="font-sans text-[11px] font-medium normal-case tracking-normal opacity-70">Sourced answers</span>
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {hero && composer}
      {turns.map((t) => (
        <div key={t.id} className="space-y-4">
          <p className="text-balance text-xl font-semibold leading-snug text-fg">{t.q}</p>
          {t.error && <p className="text-sm text-fg-subtle">{t.error}</p>}
          {!t.result && !t.error && (
            <p role="status" className="font-mono text-xs text-fg-subtle motion-safe:animate-pulse">
              Searching the archive…
            </p>
          )}
          {t.result && (
            <>
              {(t.answer || t.writing) && (
                <div data-answer className="rounded-lg border border-border bg-bg-subtle p-4">
                  {t.answer ? (
                    <Cited text={t.answer} notes={t.result.notes} />
                  ) : (
                    <p role="status" className="font-mono text-xs text-fg-subtle motion-safe:animate-pulse">
                      Writing on your device…
                    </p>
                  )}
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-fg-subtle">
                    <Cpu aria-hidden="true" className="size-3.5" />
                    Written on this device by {model.label ?? "a small model"} from the sources below. Check the links.
                  </p>
                </div>
              )}
              {empty(t.result) ? (
                <p className="text-sm text-fg-subtle">Nothing in the archive matches that. Try a name, a year or a word like “raised” or “renamed”.</p>
              ) : (
                <>
                  {t.result.rounds.length > 0 && <FundingTable rounds={t.result.rounds} />}
                  {t.result.events.length > 0 && <EventList events={t.result.events} />}
                  {t.result.quotes.length > 0 && <QuoteGrid quotes={t.result.quotes} />}
                </>
              )}
            </>
          )}
        </div>
      ))}

      {model.state === "off" && (!hero || turns.length > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
          <span className="flex min-w-0 items-start gap-2 text-fg-muted">
            <Cpu aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
            <span>
              Answers show the matching sources. For a written summary too, run a small AI model on this device: free, private, one{" "}
              {mb(spec.bytes)} download.
              {model.error && <span className="block text-xs text-red-600 dark:text-red-400">It didn't start: {model.error}</span>}
            </span>
          </span>
          <button
            type="button"
            onClick={enable}
            className="shrink-0 rounded-md border border-border px-3 py-1.5 font-medium text-fg transition-colors hover:border-border-strong hover:bg-bg-hover"
          >
            {model.error ? "Try again" : "Turn on summaries"}
          </button>
        </div>
      )}
      {model.state === "loading" && (
        <div role="status" className="space-y-1.5 rounded-lg border border-border p-3 text-sm text-fg-muted">
          <span className="flex justify-between gap-3">
            <span>Downloading the on-device model (once)…</span>
            <span className="tabular-nums text-fg-subtle">
              {mb(model.loaded)} / {mb(model.total || spec.bytes)}
            </span>
          </span>
          <span className="block h-1 overflow-hidden rounded-full bg-bg-hover">
            <span
              className="block h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${Math.min(100, (model.loaded / (model.total || spec.bytes)) * 100)}%` }}
            />
          </span>
        </div>
      )}

      {!hero && composer}
    </div>
  );
}
