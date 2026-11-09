// The PDF editions (/<slug>/lore.pdf), typeset outside `next build`: they are the slowest files on the
// site (seconds to a minute each), and most don't change between builds. Each company's PDF is
// cached under a hash of its content, so a build re-typesets only the companies whose lore changed.
//
//   bun scripts/pdfs.tsx [--out out] [--cache .cache/pdf] [--jobs N]
//
// Run after `next build` (it writes into out/). Shards the companies across N processes (default:
// one per CPU core): react-pdf is single-threaded.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { availableParallelism } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildExport } from "@/lib/export";
import { toPdf } from "@/lib/export-pdf";
import { listCompanies } from "@/lib/lore";

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const OUT = path.resolve(arg("out", "out"));
const CACHE = path.resolve(arg("cache", ".cache/pdf"));
const JOBS = Number(arg("jobs", String(availableParallelism())));
const SHARD = process.argv.includes("--shard") ? arg("shard", "0/1").split("/").map(Number) : null;

async function shard(index: number, count: number) {
  const slugs = (await listCompanies()).map((c) => c.slug).sort().filter((_, i) => i % count === index);
  let made = 0;
  let reused = 0;
  for (const slug of slugs) {
    const d = await buildExport(slug);
    if (!d) continue;
    // The archive-wide version and the generation time change on every run: leave them out of the key.
    // A reused PDF keeps the version it was typeset at, which is still a date its content was current.
    const { version: _v, generatedAt: _g, ...content } = d;
    const key = createHash("sha1").update(JSON.stringify(content)).digest("hex").slice(0, 16);
    const cached = path.join(CACHE, `${slug}-${key}.pdf`);
    const dest = path.join(OUT, slug, "lore.pdf");
    await mkdir(path.dirname(dest), { recursive: true });
    try {
      await copyFile(cached, dest);
      reused++;
      continue;
    } catch {}
    const pdf = await toPdf(d);
    // Drop this company's stale editions, then keep the new one.
    for (const f of await readdir(CACHE)) if (f.startsWith(`${slug}-`) && f.length === slug.length + 21) await rm(path.join(CACHE, f));
    await writeFile(cached, pdf);
    await copyFile(cached, dest);
    made++;
  }
  return { made, reused };
}

if (SHARD) {
  const r = await shard(SHARD[0], SHARD[1]);
  console.log(JSON.stringify(r));
} else {
  await mkdir(CACHE, { recursive: true });
  const started = Date.now();
  const self = fileURLToPath(import.meta.url);
  const runs = Array.from({ length: JOBS }, (_, i) => {
    const child = spawn(process.execPath, [self, "--shard", `${i}/${JOBS}`, "--out", OUT, "--cache", CACHE], { stdio: ["ignore", "pipe", "inherit"] });
    let text = "";
    child.stdout.on("data", (b) => (text += b));
    return new Promise<{ made: number; reused: number }>((resolve, reject) =>
      child.on("close", (code) => (code === 0 ? resolve(JSON.parse(text.trim().split("\n").at(-1)!)) : reject(new Error(`a PDF shard failed:\n${text}`)))),
    );
  });
  let made = 0;
  let reused = 0;
  for (const r of await Promise.all(runs)) {
    made += r.made;
    reused += r.reused;
  }
  console.log(`PDFs: ${made} typeset, ${reused} reused from cache, ${((Date.now() - started) / 1000).toFixed(0)}s`);
}
