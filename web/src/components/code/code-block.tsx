import { cacheLife } from "next/cache";
import { preloadFile } from "@pierre/diffs/ssr";
import { CodeFile } from "./code-file";

const OPTIONS = { theme: { dark: "pierre-dark", light: "pierre-light" }, themeType: "dark", overflow: "scroll" } as const;

// Cached: the samples never change, and preloadFile reads the clock, which prerendering rejects.
async function highlight(name: string, code: string) {
  "use cache";
  cacheLife("max");
  return preloadFile({ file: { name, contents: code }, options: OPTIONS });
}

/** A highlighted code file, rendered on the server with @pierre/diffs (Shiki + Pierre's theme). */
export async function CodeBlock({ name, code, label }: { name: string; code: string; label: string }) {
  const { file, prerenderedHTML } = await highlight(name, code);
  return <CodeFile file={file} prerenderedHTML={prerenderedHTML} label={label} />;
}
