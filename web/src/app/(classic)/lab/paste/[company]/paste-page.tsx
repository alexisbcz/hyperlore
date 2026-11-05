"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { CacheProvider, createCache } from "@twilio-paste/core/styling-library";
import { Theme } from "@twilio-paste/core/theme";
import { Anchor } from "@twilio-paste/core/anchor";
import { Avatar } from "@twilio-paste/core/avatar";
import { Badge } from "@twilio-paste/core/badge";
import { Blockquote, BlockquoteCitation, BlockquoteContent } from "@twilio-paste/core/blockquote";
import { Box } from "@twilio-paste/core/box";
import { Button } from "@twilio-paste/core/button";
import { Card } from "@twilio-paste/core/card";
import { DescriptionList, DescriptionListDetails, DescriptionListSet, DescriptionListTerm } from "@twilio-paste/core/description-list";
import { Heading } from "@twilio-paste/core/heading";
import { InPageNavigation, InPageNavigationItem } from "@twilio-paste/core/in-page-navigation";
import { Breadcrumb, BreadcrumbItem } from "@twilio-paste/core/breadcrumb";
import { Paragraph } from "@twilio-paste/core/paragraph";
import { Table, TBody, Td, Th, THead, Tr } from "@twilio-paste/core/table";
import { Text } from "@twilio-paste/core/text";
import { Timeline, TimelineItem } from "@twilio-paste/core/timeline";
import { formatDate, formatUsd } from "@/components/lore";
import { SOURCE_LABELS } from "@/lib/format";

import type { LabLore } from "../../data";

export type PasteLore = LabLore;

// Follow the site's theme: an explicit data-theme on <html>, else the system preference.
function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  mq.addEventListener("change", onChange);
  return () => {
    mo.disconnect();
    mq.removeEventListener("change", onChange);
  };
}
const isDark = () => {
  const t = document.documentElement.getAttribute("data-theme");
  return t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
};

/**
 * Collects the styles Emotion inserts while rendering on the server and flushes them into the
 * streamed <head>, instead of inline <style> tags that break hydration in the App Router.
 */
function EmotionRegistry({ children }: { children: ReactNode }) {
  const [{ cache, flush }] = useState(() => {
    const cache = createCache({ key: "paste" });
    cache.compat = true;
    const insert = cache.insert;
    let inserted: { name: string; global: boolean }[] = [];
    cache.insert = (...args) => {
      const [selector, serialized] = args;
      if (cache.inserted[serialized.name] === undefined) inserted.push({ name: serialized.name, global: !selector });
      return insert(...args);
    };
    const flush = () => {
      const names = inserted;
      inserted = [];
      return names;
    };
    return { cache, flush };
  });
  useServerInsertedHTML(() => {
    const names = flush();
    if (!names.length) return null;
    let styles = "";
    let attr = cache.key;
    const globals: ReactNode[] = [];
    for (const { name, global } of names) {
      const style = cache.inserted[name];
      if (typeof style !== "string") continue;
      if (global) globals.push(<style key={name} data-emotion={`${cache.key}-global ${name}`} dangerouslySetInnerHTML={{ __html: style }} />);
      else {
        styles += style;
        attr += ` ${name}`;
      }
    }
    return (
      <>
        {globals}
        {styles && <style data-emotion={attr} dangerouslySetInnerHTML={{ __html: styles }} />}
      </>
    );
  });
  return <CacheProvider value={cache}>{children}</CacheProvider>;
}

const KIND_BADGE: Record<string, "brand30" | "success" | "decorative10" | "decorative20" | "decorative30" | "decorative40" | "warning" | "error" | "neutral"> = {
  founding: "brand30",
  funding: "success",
  rename: "decorative10",
  rebrand: "decorative10",
  logo: "decorative10",
  launch: "decorative20",
  product: "decorative20",
  acquisition: "decorative30",
  acquired: "decorative30",
  pivot: "warning",
  layoff: "error",
  controversy: "error",
  milestone: "decorative40",
};

const SECTIONS = [
  ["timeline", "Timeline"],
  ["funding", "Funding"],
  ["people", "People"],
  ["quotes", "Quotes"],
  ["similar", "Similar"],
] as const;

const PREVIEW = 25;

export function PastePage({ lore }: { lore: PasteLore }) {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  return (
    <EmotionRegistry>
    <Theme.Provider theme={dark ? "dark" : "default"}>
      <Box backgroundColor="colorBackgroundBody" minHeight="100vh">
        <Box maxWidth="size120" marginX="auto" paddingX={["space50", "space90"]} paddingY="space90">
          <Header lore={lore} />
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <Box display="flex" flexDirection="column" rowGap="space130" minWidth="0">
              <TimelineSection lore={lore} />
              {lore.funding.length > 0 && <FundingSection lore={lore} />}
              {lore.people.length > 0 && <PeopleSection lore={lore} />}
              {lore.quotes.length > 0 && <QuotesSection lore={lore} />}
              {lore.similar.length > 0 && <SimilarSection lore={lore} />}
            </Box>
            <Box as="aside" aria-label="Company facts" className="xl:sticky xl:top-20 xl:self-start">
              <Facts lore={lore} />
            </Box>
          </div>
        </Box>
      </Box>
    </Theme.Provider>
    </EmotionRegistry>
  );
}

function Header({ lore }: { lore: PasteLore }) {
  return (
    <Box as="header" marginBottom="space100">
      <Breadcrumb aria-label="Breadcrumb">
        <BreadcrumbItem href="/companies">Companies</BreadcrumbItem>
        <BreadcrumbItem>{lore.name}</BreadcrumbItem>
      </Breadcrumb>
      <Box display="flex" flexWrap="wrap" alignItems="flex-end" justifyContent="space-between" columnGap="space70" rowGap="space60" marginTop="space70">
        <Box maxWidth="size80">
          <Box display="flex" alignItems="center" columnGap="space50" marginBottom="space50">
            {lore.icon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lore.icon} alt="" className="size-12 rounded-xl object-contain" />
            )}
            <Heading as="h1" variant="heading10" marginBottom="space0">
              {lore.name}
            </Heading>
          </Box>
          {lore.summary && (
            <Text as="p" fontSize="fontSize40" lineHeight="lineHeight40" color="colorTextWeak" marginBottom="space50">
              {lore.summary}
            </Text>
          )}
          <Box display="flex" flexWrap="wrap" columnGap="space30" rowGap="space30" alignItems="center">
            <Badge as="span" variant="neutral">
              {lore.status}
            </Badge>
            {lore.categories.slice(0, 4).map((c) => (
              <Badge key={c} as="span" variant="decorative20">
                {c}
              </Badge>
            ))}
            <Text as="span" color="colorTextWeak" fontSize="fontSize20">
              {lore.events.length} events · {lore.sources} sources
            </Text>
          </Box>
        </Box>
        <Box display="flex" columnGap="space30">
          {lore.website && (
            <Button as="a" href={lore.website} variant="primary" target="_blank" rel="noreferrer">
              Visit website
            </Button>
          )}
          <Button as="a" href={`/${lore.slug}`} variant="secondary">
            Current design
          </Button>
        </Box>
      </Box>
      <Box marginTop="space90">
        <InPageNavigation aria-label={`Sections of ${lore.name}`}>
          {SECTIONS.filter(([id]) => id === "timeline" || lore[id].length > 0).map(([id, label], i) => (
            <InPageNavigationItem key={id} href={`#${id}`} currentPage={i === 0}>
              {label}
            </InPageNavigationItem>
          ))}
        </InPageNavigation>
      </Box>
    </Box>
  );
}

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <DescriptionListSet>
      <DescriptionListTerm>{term}</DescriptionListTerm>
      <DescriptionListDetails>{children}</DescriptionListDetails>
    </DescriptionListSet>
  );
}

function Facts({ lore }: { lore: PasteLore }) {
  return (
    <Card padding="space70">
      <Heading as="h2" variant="heading40">
        At a glance
      </Heading>
      <DescriptionList>
        {lore.tagline && <Fact term="Tagline">“{lore.tagline}”</Fact>}
        {lore.website && (
          <Fact term="Website">
            <Anchor href={lore.website} showExternal>
              {lore.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
            </Anchor>
          </Fact>
        )}
        {lore.founded && <Fact term="Founded">{formatDate(lore.founded)}</Fact>}
        {lore.founders.length > 0 && (
          <Fact term={lore.founders.length > 1 ? "Founders" : "Founder"}>
            <Box display="flex" flexDirection="column" rowGap="space20">
              {lore.founders.map((f) => (
                <Box key={f.name} display="flex" alignItems="center" columnGap="space30">
                  <Avatar size="sizeIcon30" name={f.name} src={f.photo} />
                  {f.slug ? <Anchor href={`/people/${f.slug}`}>{f.name}</Anchor> : f.name}
                </Box>
              ))}
            </Box>
          </Fact>
        )}
        {lore.hq && <Fact term="Headquarters">{lore.hq}</Fact>}
        {lore.formerNames.length > 0 && <Fact term="Formerly">{lore.formerNames.join(", ")}</Fact>}
        {lore.employees && <Fact term="Employees">{lore.employees.toLocaleString("en")}</Fact>}
        {lore.raisedUsd > 0 && (
          <Fact term="Raised">
            <Text as="span" fontWeight="fontWeightSemibold" fontVariantNumeric="tabular-nums">
              {formatUsd(lore.raisedUsd)}
            </Text>{" "}
            across {lore.funding.length} rounds
          </Fact>
        )}
        {lore.valuation && (
          <Fact term="Valuation">
            {formatUsd(lore.valuation.usd)} · {lore.valuation.round}, {formatDate(lore.valuation.date)}
          </Fact>
        )}
        {lore.investors > 0 && <Fact term="Investors">{lore.investors}</Fact>}
      </DescriptionList>
    </Card>
  );
}

function SectionTitle({ id, title, aside }: { id: string; title: string; aside?: string }) {
  return (
    <Box display="flex" alignItems="baseline" justifyContent="space-between" columnGap="space40" marginBottom="space60">
      <Heading as="h2" variant="heading20" marginBottom="space0" id={`${id}-title`}>
        {title}
      </Heading>
      {aside && (
        <Text as="span" color="colorTextWeak" fontSize="fontSize20">
          {aside}
        </Text>
      )}
    </Box>
  );
}

function TimelineSection({ lore }: { lore: PasteLore }) {
  const [all, setAll] = useState(false);
  const events = all ? lore.events : lore.events.slice(0, PREVIEW);
  return (
    <section id="timeline" aria-labelledby="timeline-title" className="scroll-mt-20">
      <SectionTitle id="timeline" title="Timeline" aside={`${lore.events.length} sourced events`} />
      <Timeline>
        {events.map((e) => (
          <TimelineItem key={e.id} id={e.id} title={e.title} timestamp={formatDate(e.date)}>
            <Box display="flex" flexDirection="column" rowGap="space30">
              {e.summary && (
                <Paragraph marginBottom="space0">{e.summary}</Paragraph>
              )}
              <Box display="flex" flexWrap="wrap" alignItems="center" columnGap="space30" rowGap="space20">
                <Badge as="span" size="small" variant={KIND_BADGE[e.kind] ?? "neutral"}>
                  {e.kind}
                </Badge>
                {e.inferred && (
                  <Badge as="span" size="small" variant="warning">
                    inferred
                  </Badge>
                )}
                {e.sources.map((s, i) => (
                  <Text key={`${i}${s.url}`} as="span" fontSize="fontSize20">
                    <Anchor href={s.url} showExternal>
                      {SOURCE_LABELS[s.type] ?? s.host}
                    </Anchor>
                  </Text>
                ))}
              </Box>
            </Box>
          </TimelineItem>
        ))}
      </Timeline>
      {lore.events.length > PREVIEW && (
        <Box marginTop="space60">
          <Button variant="secondary" onClick={() => setAll(!all)}>
            {all ? "Show fewer" : `Show all ${lore.events.length} events`}
          </Button>
        </Box>
      )}
    </section>
  );
}

function FundingSection({ lore }: { lore: PasteLore }) {
  return (
    <section id="funding" aria-labelledby="funding-title" className="scroll-mt-20">
      <SectionTitle id="funding" title="Funding" aside={`${formatUsd(lore.raisedUsd)} raised`} />
      <Table scrollHorizontally striped>
        <THead>
          <Tr>
            <Th>Date</Th>
            <Th>Round</Th>
            <Th textAlign="right">Amount</Th>
            <Th textAlign="right">Valuation</Th>
            <Th>Led by</Th>
            <Th>Source</Th>
          </Tr>
        </THead>
        <TBody>
          {lore.funding.map((r) => (
            <Tr key={`${r.date}${r.round}`}>
              <Td>
                <Text as="span" fontFamily="fontFamilyCode" fontSize="fontSize20" whiteSpace="nowrap">
                  {formatDate(r.date)}
                </Text>
              </Td>
              <Td>{r.round}</Td>
              <Td textAlign="right">{r.amountUsd ? formatUsd(r.amountUsd) : "—"}</Td>
              <Td textAlign="right">{r.valuationUsd ? formatUsd(r.valuationUsd) : "—"}</Td>
              <Td>{r.leads.join(", ") || "—"}</Td>
              <Td>{r.source && <Anchor href={r.source} showExternal>{new URL(r.source).hostname.replace(/^www\./, "")}</Anchor>}</Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </section>
  );
}

function PeopleSection({ lore }: { lore: PasteLore }) {
  return (
    <section id="people" aria-labelledby="people-title" className="scroll-mt-20">
      <SectionTitle id="people" title="People" aside="Founders, executives and key hires" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lore.people.map((p) => (
          <Card key={p.slug ?? p.name} padding="space50">
            <Box display="flex" columnGap="space40">
              <Avatar size="sizeIcon70" name={p.name} src={p.photo} />
              <Box minWidth="0">
                <Text as="div" fontWeight="fontWeightSemibold">
                  {p.slug ? <Anchor href={`/people/${p.slug}`}>{p.name}</Anchor> : p.name}
                </Text>
                {p.role && (
                  <Text as="div" color="colorTextWeak" fontSize="fontSize20">
                    {p.role}
                  </Text>
                )}
                {p.blurb && (
                  <Text as="div" color="colorTextWeak" fontSize="fontSize20" marginTop="space20" className="line-clamp-2">
                    {p.blurb}
                  </Text>
                )}
              </Box>
            </Box>
          </Card>
        ))}
      </div>
    </section>
  );
}

function QuotesSection({ lore }: { lore: PasteLore }) {
  return (
    <section id="quotes" aria-labelledby="quotes-title" className="scroll-mt-20">
      <SectionTitle id="quotes" title="In their own words" />
      <div className="grid gap-6 lg:grid-cols-2">
        {lore.quotes.map((q) => (
          <Blockquote key={q.id} url={q.link} marginBottom="space0">
            <BlockquoteContent>{q.text}</BlockquoteContent>
            <BlockquoteCitation author={q.person} source={q.date ? formatDate(q.date) : "Source"} />
          </Blockquote>
        ))}
      </div>
    </section>
  );
}

function SimilarSection({ lore }: { lore: PasteLore }) {
  return (
    <section id="similar" aria-labelledby="similar-title" className="scroll-mt-20">
      <SectionTitle id="similar" title="Similar companies" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lore.similar.map((c) => (
          <Card key={c.slug} padding="space50">
            <Box display="flex" alignItems="center" columnGap="space30" marginBottom="space30">
              {c.icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.icon} alt="" className="size-6 rounded object-contain" />
              )}
              <Text as="span" fontWeight="fontWeightSemibold">
                <Anchor href={`/lab/paste/${c.slug}`}>{c.name}</Anchor>
              </Text>
            </Box>
            {c.summary && (
              <Text as="p" color="colorTextWeak" fontSize="fontSize20" className="line-clamp-3">
                {c.summary}
              </Text>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}
