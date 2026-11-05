#!/usr/bin/env bun
/**
 * Hyperlore research agent: a standalone program, no Claude Code needed.
 *
 * Built on Vercel's AI SDK (`ai` + `@ai-sdk/anthropic`): a ToolLoopAgent runs the same method a
 * Claude Code agent follows (AGENTS.md plus the skills in .claude/skills/) with a fixed set of tools:
 *
 *   hl                  the ./hl CLI, the only way to read and write the archive
 *   http_get            free JSON APIs and pages (HN, Bluesky, Wayback, GitHub, YouTube…)
 *   youtube_transcript  timestamped captions via yt-dlp
 *   run_pipeline        logos.py and people_photos.py
 *   web_search/fetch    Anthropic's server-side web tools
 *
 * Every run is budgeted (dollars, steps, paid API calls), logged to data/runs/, and ends with a
 * report of what it added to the archive.
 *
 *   ./research vercel                          research one company
 *   ./research vercel --focus "early tweets"   deepen one angle
 *   ./research linear resend --parallel 2      several companies at once
 *   ./research vercel --dry-run                print the prompt and tools, call nothing
 */

import { anthropic, type AnthropicLanguageModelOptions } from "@ai-sdk/anthropic";
import { ToolLoopAgent, tool, type ModelMessage, type StopCondition, type ToolSet } from "ai";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";

const ROOT = path.resolve(import.meta.dir, "..");
const MODEL = "claude-opus-5-5";
// $ per million tokens for MODEL: uncached input, output, cache write (5 min), cache read.
const PRICE = { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 };
const SEARCH_PRICE = 10 / 1000; // $ per web search
const TOOL_OUTPUT_LIMIT = 40_000; // characters per tool result

const SKILLS = ["research-company", "hacker-news", "x-history", "youtube-transcripts", "bluesky-history",
  "wayback-history", "logo-history", "people-photos", "write-lore-page"];
const HL_COMMANDS = new Set(["list", "stats", "source", "event", "quote", "asset", "entity", "page", "sc", "ctx", "delete"]);
// http_get reaches free sources only: paid APIs go through ./hl (cached, logged), other pages through web_fetch.
const FREE_HOSTS = ["hn.algolia.com", "news.ycombinator.com", "public.api.bsky.app", "bsky.app", "web.archive.org", "archive.org",
  "api.github.com", "github.com", "raw.githubusercontent.com", "www.youtube.com", "youtube.com", "wikipedia.org",
  "commons.wikimedia.org", "crt.sh"];

const clip = (s: string, n = TOOL_OUTPUT_LIMIT) =>
  s.length <= n ? s : `${s.slice(0, n)}\n… [truncated: ${(s.length - n).toLocaleString("en")} more characters. Narrow the query to see the rest.]`;

// --- The prompt: the brief and the skills, frozen so the cache holds across every step and run. ---

function instructions() {
  const brief = readFileSync(path.join(ROOT, "AGENTS.md"), "utf8");
  const skills = SKILLS.map((s) => `<skill name="${s}">\n${readFileSync(path.join(ROOT, ".claude/skills", s, "SKILL.md"), "utf8")}\n</skill>`).join("\n\n");
  return `You are a Hyperlore research agent running as a standalone program, not inside Claude Code. There
is no shell. Where the brief and skills below say to run a command, use the matching tool:

- \`./hl <command> …\` → the \`hl\` tool: \`args\` is the argument list after \`./hl\`, and \`stdin\` is the JSON a
  write command reads. Example: {"args": ["sc", "v1/twitter/tweet", "url=https://x.com/…"], "stdin": null}.
- curl/WebFetch on free APIs (Hacker News Algolia, Bluesky AppView, Wayback CDX and snapshots, GitHub API,
  Wikipedia) → \`http_get\`. Pass \`save_as\` for anything you will cite, and use the returned path as the
  source's \`raw_path\`.
- \`yt-dlp … --write-subs\` → \`youtube_transcript\`.
- \`uv run python logos.py …\` / \`people_photos.py …\` → \`run_pipeline\`.
- Web search and reading arbitrary pages (press, blogs) → \`web_search\` and \`web_fetch\`.

Paid tools (\`hl sc\`, \`hl ctx\`) count against this run's budget, which the program enforces; a cached call
costs nothing. Free sources first, always.

When the work is done, or the budget runs out, stop calling tools and write a short report: what you
added (events, quotes, sources, entities, pages, assets), the story in two or three sentences, conflicts
between sources and how you recorded them, and what is still missing.

<brief>
${brief}
</brief>

${skills}`;
}

// --- Budget: the program, not the model, decides when to stop. ---

class Budget {
  usd = 0;
  steps = 0;
  paidCalls = 0;
  searches = 0;
  constructor(readonly maxUsd: number, readonly maxSteps: number, readonly maxPaidCalls: number) {}
  chargePaidCall() {
    if (this.paidCalls >= this.maxPaidCalls) throw new Error(`Refused: the paid API budget is spent (${this.maxPaidCalls} calls). Finish with what you have and write the report.`);
    this.paidCalls++;
  }
  exhausted() {
    if (this.usd >= this.maxUsd) return `$${this.usd.toFixed(2)} of $${this.maxUsd.toFixed(2)} spent`;
    if (this.steps >= this.maxSteps) return `${this.steps} steps used`;
    return null;
  }
  line() {
    return `$${this.usd.toFixed(2)}/${this.maxUsd.toFixed(2)} · step ${this.steps}/${this.maxSteps} · paid calls ${this.paidCalls}/${this.maxPaidCalls} · searches ${this.searches}`;
  }
}

// --- Tools ---

/** Mirrors hl.py's cache keys: a cached ScrapeCreators or Context.dev call costs nothing. */
function scCached(endpoint: string, params: Record<string, string>) {
  const e = endpoint.replace(/^\/+|\/+$/g, "");
  const sorted = Object.entries(params).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const key = createHash("sha1").update(pyJson([e, sorted])).digest("hex").slice(0, 20);
  return existsSync(path.join(ROOT, "data/raw/scrapecreators", e.replaceAll("/", "_"), `${key}.json`));
}
function ctxCached(method: string, p: string, body: unknown) {
  const e = p.replace(/^\/+|\/+$/g, "");
  const key = createHash("sha1").update(pyJson([method, e, body], true)).digest("hex").slice(0, 20);
  return existsSync(path.join(ROOT, "data/raw/contextdev-api", e.replaceAll("/", "_"), `${key}.json`));
}
/** Python's json.dumps output (", " and ": " separators, ASCII escapes), so cache keys match hl.py's. */
function pyJson(value: unknown, sortKeys = false): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map((v) => pyJson(v, sortKeys)).join(", ")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (sortKeys) entries.sort(([a], [b]) => (a < b ? -1 : 1));
    return `{${entries.map(([k, v]) => `${pyJson(k)}: ${pyJson(v, sortKeys)}`).join(", ")}}`;
  }
  if (typeof value === "string") return JSON.stringify(value).replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
  return JSON.stringify(value);
}

/** Large `hl list events|quotes` output as one short row per record: enough to avoid duplicates. */
function compactList(collection: string, out: string) {
  const rows: string[] = [];
  for (const line of out.split("\n")) {
    try {
      const d = JSON.parse(line);
      rows.push(collection === "events"
        ? `${d.date} | ${d.kind} | ${d.title} | ${(d.sources ?? []).length} sources | ${d._id}`
        : `${d.date ?? ""} | ${d.person} | ${String(d.text ?? "").slice(0, 90)} | ${d._id}`);
    } catch {}
  }
  const head = collection === "events" ? "date | kind | title | sources | _id" : "date | person | text | _id";
  return `${rows.length} ${collection} (compact view; exact titles shown, reuse them to corroborate):\n${head}\n${rows.join("\n")}`;
}

async function run(cmd: string[], opts: { stdin?: string; env?: Record<string, string>; timeoutMs?: number } = {}) {
  const proc = Bun.spawn(cmd, { cwd: ROOT, env: { ...process.env, ...opts.env }, stdin: opts.stdin ? new Blob([opts.stdin]) : "ignore", stdout: "pipe", stderr: "pipe" });
  const timer = setTimeout(() => proc.kill(), opts.timeoutMs ?? 300_000);
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  clearTimeout(timer);
  return { stdout, stderr, code };
}

// The Wayback Machine refuses bursts: one request at a time across every agent in this process.
let wayback: Promise<unknown> = Promise.resolve();
const serialize = <T,>(fn: () => Promise<T>): Promise<T> => {
  const next = wayback.then(fn, fn);
  wayback = next.catch(() => {});
  return next;
};

async function getWithBackoff(url: string) {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "hyperlore-research/1.0" }, signal: AbortSignal.timeout(60_000) });
      if ((r.status === 429 || r.status === 503) && attempt < 4) throw new Error(`HTTP ${r.status}`);
      const body = await r.text();
      return r.ok ? body : `HTTP ${r.status}\n${body.slice(0, 2000)}`;
    } catch (e) {
      if (attempt >= 4) throw e;
      await Bun.sleep(2 ** attempt * 3000);
    }
  }
}

function vttToLines(vtt: string) {
  const lines: string[] = [];
  let stamp: string | undefined, last = "";
  for (const raw of vtt.split("\n")) {
    const t = raw.match(/^(\d+):(\d\d):(\d\d)\.\d+ -->/);
    if (t) {
      stamp = `${+t[1]}:${t[2]}:${t[3]}`;
      continue;
    }
    const text = raw.replace(/<[^>]+>/g, "").trim();
    if (!text || !stamp || text === last || /^(WEBVTT|Kind:|Language:)/.test(raw)) continue;
    lines.push(`[${stamp}] ${text}`);
    last = text;
  }
  return lines.join("\n");
}

function tools(company: string, agentName: string, budget: Budget) {
  const env = { HL_AGENT: agentName };
  const rawDir = path.join(ROOT, "data/raw", company);
  return {
    hl: tool({
      description: "Run the Hyperlore CLI (./hl) to read or write the archive. Writes refuse facts whose sources are not registered first. Returns the command's JSON output.",
      inputSchema: z.object({
        args: z.array(z.string()).describe('Arguments after ./hl, e.g. ["list", "events", "vercel"].'),
        stdin: z.string().nullable().describe("JSON for write commands (source, event, quote, asset, entity, page): one object or an array. Null otherwise."),
      }),
      execute: async ({ args, stdin }) => {
        if (!args.length || !HL_COMMANDS.has(args[0])) throw new Error(`hl command must be one of ${[...HL_COMMANDS].join(", ")} (export is the publisher's job)`);
        if (args[0] === "sc" && !scCached(args[1], Object.fromEntries(args.slice(2).map((a) => a.split(/=(.*)/s).slice(0, 2))))) budget.chargePaidCall();
        if (args[0] === "ctx") {
          const rest = args.slice(1);
          const method = rest[0] === "GET" || rest[0] === "POST" ? rest.shift()! : "POST";
          const body = rest[1] ? JSON.parse(rest[1]) : {};
          if (rest[0]?.startsWith("web/scrape") && JSON.stringify(body).includes("linkedin.com"))
            throw new Error("Never web/scrape LinkedIn through Context.dev (one call cost ~170 credits); use hl sc v1/linkedin/company or v1/linkedin/profile.");
          if (!ctxCached(method, rest[0], body)) budget.chargePaidCall();
        }
        const r = await run([path.join(ROOT, "hl"), ...args], { stdin: stdin ?? undefined, env });
        let out = (r.stdout + (r.code && r.stderr ? `\n${r.stderr}` : "")).trim();
        if (r.code) throw new Error(out || `hl exited ${r.code}`);
        if (args[0] === "list" && (args[1] === "events" || args[1] === "quotes") && out.length > TOOL_OUTPUT_LIMIT / 2) out = compactList(args[1], out);
        return clip(out || "(no output)");
      },
    }),
    http_get: tool({
      description: "GET a URL on a free source (Hacker News Algolia, Bluesky AppView, Wayback CDX and snapshots, GitHub API and raw files, Wikipedia, YouTube pages). Returns the body as text. Wayback requests are serialized and retried when the archive refuses.",
      inputSchema: z.object({
        url: z.string(),
        save_as: z.string().nullable().describe("File name to keep the response under data/raw/<company>/ so a source can cite it as raw_path. Null to not save."),
      }),
      execute: async ({ url, save_as }) => {
        const host = new URL(url).hostname;
        if (!FREE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) throw new Error(`${host} is not a free source here; use web_fetch for arbitrary pages`);
        const body = host.endsWith("archive.org") ? await serialize(async () => (await getWithBackoff(url)).toString()) : await getWithBackoff(url);
        if (!save_as) return clip(body);
        mkdirSync(rawDir, { recursive: true });
        const file = path.join(rawDir, save_as.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "response.txt");
        writeFileSync(file, body);
        return clip(`[saved as raw_path: ${path.relative(ROOT, file)}]\n${body}`);
      },
    }),
    youtube_transcript: tool({
      description: "Download a YouTube video's captions (manual or automatic) with yt-dlp into data/transcripts/ and return them as [h:mm:ss] lines, so quotes can link with &t=<seconds>s.",
      inputSchema: z.object({ url: z.string(), lang: z.string().describe("Caption language, e.g. en, fr.") }),
      execute: async ({ url, lang }) => {
        const id = url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/)?.[1];
        if (!id) throw new Error("not a YouTube video URL");
        const dir = path.join(ROOT, "data/transcripts");
        mkdirSync(dir, { recursive: true });
        const base = ["--skip-download", "--write-subs", "--write-auto-subs", "--sub-langs", lang, "--sub-format", "vtt", "-o", path.join(dir, "%(id)s"), `https://www.youtube.com/watch?v=${id}`];
        let r = await run(["yt-dlp", ...base]);
        const cookies = path.join(ROOT, "data/cookies.txt");
        if (r.code && existsSync(cookies)) r = await run(["yt-dlp", "--cookies", cookies, ...base]);
        const file = readdirSync(dir).filter((f) => f.startsWith(id) && f.endsWith(".vtt")).sort()[0];
        if (!file) throw new Error(`no captions (${r.stderr.trim().slice(-400)}). Try another lang, or the ScrapeCreators transcript endpoint via hl sc v1/youtube/video/transcript.`);
        return clip(`[transcript file: data/transcripts/${file}]\n${vttToLines(readFileSync(path.join(dir, file), "utf8"))}`);
      },
    }),
    run_pipeline: tool({
      description: 'Run one of the repo\'s pipelines: `logos` (logo history for a company: args ["<company>", "--domain", "<domain>"]) or `people_photos` (args: person slugs).',
      inputSchema: z.object({ name: z.enum(["logos", "people_photos"]), args: z.array(z.string()) }),
      execute: async ({ name, args }) => {
        const r = await run(["uv", "run", "python", name === "logos" ? "logos.py" : "people_photos.py", ...args], { env, timeoutMs: 900_000 });
        return clip((r.stdout + (r.code ? `\n${r.stderr}` : "")).trim() || "(no output)");
      },
    }),
    web_search: anthropic.tools.webSearch_20260318({ maxUses: 5, responseInclusion: "excluded" }),
    web_fetch: anthropic.tools.webFetch_20260318({ maxUses: 8 }),
  } satisfies ToolSet;
}

// --- One company ---

async function archiveCounts(company: string) {
  const counts: Record<string, number> = {};
  for (const c of ["events", "quotes", "assets"]) {
    const r = await run([path.join(ROOT, "hl"), "list", c, company], { timeoutMs: 120_000 });
    counts[c] = r.stdout.split("\n").filter((l) => l.trim().startsWith("{")).length;
  }
  return counts;
}

/** One cache breakpoint on the newest message: each step then re-reads the transcript from cache. */
function withCacheBreakpoint(messages: ModelMessage[]): ModelMessage[] {
  return messages.map((m, i) => {
    const { anthropic: _drop, ...others } = (m.providerOptions ?? {}) as Record<string, unknown>;
    const providerOptions = i === messages.length - 1 ? { ...others, anthropic: { cacheControl: { type: "ephemeral" } } } : others;
    return { ...m, providerOptions } as ModelMessage;
  });
}

async function research(company: string, opts: { focus?: string; budget: Budget; logDir: string }) {
  const { budget } = opts;
  const agentName = `research-${company}`;
  const started = new Date();
  const logFile = path.join(opts.logDir, `${started.toISOString().replace(/[-:]/g, "").slice(0, 15)}-${company}.jsonl`);
  const log = (kind: string, data: object) => appendFileSync(logFile, JSON.stringify({ at: new Date().toISOString(), kind, ...data }) + "\n");
  const say = (msg: string) => console.log(`[${agentName}] ${msg}`);

  const before = await archiveCounts(company);
  let task = `Research the company \`${company}\` into the Hyperlore archive, following the research-company skill.`;
  if (opts.focus) task += ` Focus on: ${opts.focus}. Check what the archive already has first and add only what's new.`;
  task += `\n\nBudget for this run: about $${budget.maxUsd} of model time, ${budget.maxSteps} steps and ${budget.maxPaidCalls} paid API calls (cached calls are free). Your agent name is \`${agentName}\`.`;
  log("start", { company, focus: opts.focus, model: MODEL, task });

  let wrapUpSent = false;
  // A hard stop a few steps past the budget, in case the model keeps calling tools after the wrap-up.
  const hardStop: StopCondition<ToolSet> = () => budget.steps >= budget.maxSteps + 4;

  const agent = new ToolLoopAgent({
    model: anthropic(MODEL),
    instructions: { role: "system", content: instructions(), providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } } },
    tools: tools(company, agentName, budget),
    stopWhen: hardStop,
    maxOutputTokens: 32_000,
    providerOptions: {
      anthropic: {
        thinking: { type: "adaptive" },
        effort: "high",
        // If a safety classifier declines a turn, the API re-runs it on Anthropic's recommended fallback.
        fallbacks: "default",
      } satisfies AnthropicLanguageModelOptions,
    },
    prepareStep: ({ messages }) => {
      const reason = budget.exhausted();
      if (reason && !wrapUpSent) {
        wrapUpSent = true;
        say(`budget reached (${reason}); asking for the report`);
        const wrapped = [...messages, { role: "user", content: `The run's budget is reached (${reason}). Stop calling tools and write the final report now.` } as ModelMessage];
        return { messages: withCacheBreakpoint(wrapped), activeTools: [] };
      }
      return { messages: withCacheBreakpoint(messages), ...(reason && { activeTools: [] }) };
    },
    onStepFinish: (step) => {
      const u = step.usage;
      const d = u.inputTokenDetails ?? {};
      const searches = step.toolCalls.filter((c) => c.toolName === "web_search").length;
      budget.usd += ((d.noCacheTokens ?? 0) * PRICE.input + (u.outputTokens ?? 0) * PRICE.output + (d.cacheWriteTokens ?? 0) * PRICE.cacheWrite + (d.cacheReadTokens ?? 0) * PRICE.cacheRead) / 1e6 + searches * SEARCH_PRICE;
      budget.searches += searches;
      budget.steps++;
      log("step", {
        finishReason: step.finishReason,
        usage: u,
        text: step.text,
        toolCalls: step.toolCalls.map((c) => ({ name: c.toolName, input: c.input })),
        toolErrors: step.content.filter((p) => p.type === "tool-error").map((p) => String((p as { error: unknown }).error).slice(0, 500)),
      });
      const first = step.text.trim().split("\n")[0];
      say(budget.line() + (first ? ` · ${first.slice(0, 100)}` : step.toolCalls.length ? ` · ${step.toolCalls.map((c) => c.toolName).join(", ")}` : ""));
    },
  });

  const result = await agent.generate({ prompt: task });
  const report = result.finishReason === "content-filter" ? "Stopped: the model declined to continue (safety classifier)." : result.text;
  const after = await archiveCounts(company);
  const added = Object.fromEntries(Object.entries(after).map(([k, v]) => [k, v - (before[k] ?? 0)]));
  const summary = {
    company, agent: agentName, usd: +budget.usd.toFixed(2), steps: budget.steps, paidCalls: budget.paidCalls, searches: budget.searches, added,
    minutes: +((Date.now() - started.getTime()) / 60_000).toFixed(1), log: path.relative(ROOT, logFile),
  };
  log("end", { ...summary, report });
  writeFileSync(logFile.replace(/\.jsonl$/, ".md"), `# ${company}\n\n${JSON.stringify(summary, null, 2)}\n\n${report}\n`);
  say(`done · added ${JSON.stringify(added)} · ${budget.line()}`);
  return summary;
}

// --- CLI ---

export { Budget, tools, vttToLines };

if (import.meta.main) {

  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      focus: { type: "string" },
      "max-usd": { type: "string", default: "15" },
      "max-steps": { type: "string", default: "120" },
      "max-paid-calls": { type: "string", default: "40" },
      parallel: { type: "string", default: "1" },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  const companies = positionals.map((c) => c.toLowerCase().trim()).filter(Boolean);
  if (values.help || !companies.length) {
    console.log(`usage: ./research <company…> [--focus "…"] [--max-usd 15] [--max-steps 120] [--max-paid-calls 40] [--parallel 1] [--dry-run]`);
    process.exit(companies.length || values.help ? 0 : 1);
  }
  const limits = { usd: Number(values["max-usd"]), steps: Number(values["max-steps"]), paid: Number(values["max-paid-calls"]) };

  if (values["dry-run"]) {
    console.log(`model: ${MODEL} (Vercel AI SDK, @ai-sdk/anthropic)`);
    console.log(`instructions: ${instructions().length.toLocaleString("en")} characters from AGENTS.md + ${SKILLS.length} skills`);
    console.log(`tools: ${Object.keys(tools("x", "x", new Budget(1, 1, 1))).join(", ")}`);
    for (const c of companies) console.log(`would research ${c} as research-${c} with $${limits.usd} / ${limits.steps} steps / ${limits.paid} paid calls`);
    process.exit(0);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set (add it to .env at the repo root).");
    process.exit(1);
  }

  const logDir = path.join(ROOT, "data/runs");
  mkdirSync(logDir, { recursive: true });
  const queue = [...companies];
  const results: Awaited<ReturnType<typeof research>>[] = [];
  await Promise.all(
    Array.from({ length: Math.max(1, Number(values.parallel)) }, async () => {
      for (let c = queue.shift(); c; c = queue.shift()) {
        const budget = new Budget(limits.usd, limits.steps, limits.paid);
        try {
          results.push(await research(c, { focus: values.focus, budget, logDir }));
        } catch (e) {
          console.error(`[research-${c}] failed: ${e instanceof Error ? e.message : e}`);
        }
      }
    }),
  );
  console.log(`\n${results.map((r) => `${r.company}: +${r.added.events} events, +${r.added.quotes} quotes, +${r.added.assets} assets · $${r.usd} · ${r.steps} steps · ${r.minutes} min · ${r.log}`).join("\n")}`);
  console.log("\nPublish when ready: ./hl export, then commit and push (see the publish-hyperlore skill).");
}
