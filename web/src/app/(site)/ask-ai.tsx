"use client";

import { useState } from "react";
import { Popover } from "twenty-ui/primitives/surfaces";
import { LightButton } from "twenty-ui/components/input";
import { IconCheck, IconCopy, IconExternalLink, IconMessageCircle, IconTerminal } from "twenty-ui/icon";

/** The prompt handed to an assistant: read Hyperlore's record first, answer from its sources. */
export function askPrompt(name: string, base: string, slug: string, question: string) {
  return [
    `Read Hyperlore's sourced history of ${name} first: ${base}/${slug}/llms.txt`,
    `(the full record, with every event and quote, is at ${base}/${slug}/lore.md).`,
    `Answer from those pages, cite the original source URLs they list, and say plainly when the record doesn't cover something.`,
    "",
    `Question: ${question.trim()}`,
  ].join("\n");
}

const TARGETS = [
  { id: "chatgpt", label: "ChatGPT", url: (p: string) => `https://chatgpt.com/?q=${encodeURIComponent(p)}` },
  { id: "claude", label: "Claude", url: (p: string) => `https://claude.ai/new?q=${encodeURIComponent(p)}` },
  { id: "perplexity", label: "Perplexity", url: (p: string) => `https://www.perplexity.ai/search?q=${encodeURIComponent(p)}` },
];

// Single-quoted for POSIX shells; a ' inside becomes '\''.
const shellQuote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

/** "Ask AI" on a record page: opens ChatGPT, Claude or Perplexity with a prompt that points at the
 *  page's llms.txt, or copies it (plain, or as a `claude` command for Claude Code). */
export function AskAI({ name, slug, base }: { name: string; slug: string; base: string }) {
  const suggestions = [
    { label: "Was it making money?", q: `Was ${name} making money? What do the sources say about its revenue and profitability, and as of when?` },
    { label: "Founding story", q: `Tell me the founding story of ${name}: who, when, where and why.` },
    { label: "Who owns it?", q: `Who owns ${name} today, and how did its ownership and funding change over time?` },
  ];
  const [question, setQuestion] = useState(suggestions[0].q);
  const [copied, setCopied] = useState<string | null>(null);
  const prompt = askPrompt(name, base, slug, question || suggestions[0].q);

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  };

  return (
    <Popover.Root>
      <Popover.Trigger render={<LightButton startIcon={<IconMessageCircle />} />}>Ask AI</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={6}>
          <Popover.Popup className="tw-ask">
            <Popover.Title className="tw-ask-title">Ask an assistant about {name}</Popover.Title>
            <Popover.Description className="tw-ask-desc">
              The assistant gets this page&rsquo;s sourced record ({`/${slug}/llms.txt`}) and is asked to answer from it, with citations.
            </Popover.Description>
            <label className="tw-ask-label" htmlFor="tw-ask-q">
              Question
            </label>
            <textarea id="tw-ask-q" className="tw-ask-input" rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} />
            <div className="tw-ask-suggest">
              {suggestions.map((s) => (
                <button key={s.label} type="button" className="tw-ask-chip" data-active={s.q === question || undefined} onClick={() => setQuestion(s.q)}>
                  {s.label}
                </button>
              ))}
            </div>
            <div className="tw-ask-row">
              {TARGETS.map((t) => (
                <LightButton key={t.id} variant="outline" endIcon={<IconExternalLink />} href={t.url(prompt)} target="_blank" rel="noreferrer">
                  {t.label}
                </LightButton>
              ))}
            </div>
            <div className="tw-ask-row">
              <LightButton startIcon={copied === "cc" ? <IconCheck /> : <IconTerminal />} onClick={() => copy("cc", `claude ${shellQuote(prompt)}`)}>
                {copied === "cc" ? "Copied" : "Copy for Claude Code"}
              </LightButton>
              <LightButton startIcon={copied === "p" ? <IconCheck /> : <IconCopy />} onClick={() => copy("p", prompt)}>
                {copied === "p" ? "Copied" : "Copy prompt"}
              </LightButton>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
