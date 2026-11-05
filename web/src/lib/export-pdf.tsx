// The PDF edition of a company's lore, typeset with @react-pdf/renderer in the site's Paste palette.
import path from "node:path";
import { Document, Font, Link, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { LoreExport } from "./export";

const FONTS = path.join(process.cwd(), "src/assets/fonts");
let registered = false;
function registerFonts() {
  if (registered) return;
  registered = true;
  // Inter ships split by script; react-pdf picks a glyph from the first family in the list that has it.
  for (const [family, subset] of [
    ["Inter", "latin"],
    ["InterExt", "latin-ext"],
  ] as const)
    Font.register({
      family,
      fonts: [
        { src: path.join(FONTS, `inter-${subset}-400-normal.woff`), fontWeight: 400 },
        { src: path.join(FONTS, `inter-${subset}-600-normal.woff`), fontWeight: 600 },
        { src: path.join(FONTS, `inter-${subset}-700-normal.woff`), fontWeight: 700 },
        // Every family in a fallback list must resolve each style: latin-ext has no italic file, so reuse upright.
        { src: path.join(FONTS, subset === "latin" ? "inter-latin-400-italic.woff" : `inter-${subset}-400-normal.woff`), fontStyle: "italic" as const },
      ],
    });
  // Chinese (Taiwanese companies' quotes and names). One weight, registered for every style the layout uses.
  const tc = path.join(FONTS, "NotoSansTC-Regular.otf");
  Font.register({
    family: "NotoTC",
    fonts: [400, 600, 700].flatMap((fontWeight) => [
      { src: tc, fontWeight },
      { src: tc, fontWeight, fontStyle: "italic" as const },
    ]),
  });
  Font.registerHyphenationCallback((word) => [word]);
}

const C = { fg: "#121c2d", muted: "#394762", subtle: "#606b85", border: "#e1e3ea", soft: "#f4f4f6", accent: "#0263e0" };
const FAMILY = ["Inter", "InterExt", "NotoTC"];

const s = StyleSheet.create({
  // No page-wide lineHeight: combined with the fixed header/footer it overflows react-pdf's layout on long
  // documents ("unsupported number"). Line height is set per block instead.
  page: { fontFamily: FAMILY as unknown as string, fontSize: 9.5, color: C.fg, paddingTop: 56, paddingBottom: 56, paddingHorizontal: 54 },
  header: { position: "absolute", top: 24, left: 54, right: 54, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: C.subtle },
  footer: { position: "absolute", bottom: 24, left: 54, right: 54, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: C.subtle },
  kicker: { fontSize: 8, fontWeight: 600, color: C.accent, letterSpacing: 1, textTransform: "uppercase" },
  title: { fontSize: 30, fontWeight: 700, marginTop: 6, lineHeight: 1 },
  lead: { fontSize: 12, color: C.muted, marginTop: 10, lineHeight: 1.15 },
  meta: { fontSize: 8, color: C.subtle, marginTop: 14 },
  facts: { marginTop: 22, borderWidth: 1, borderColor: C.border, borderRadius: 4 },
  factRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  factKey: { width: 90, color: C.subtle, lineHeight: 1.05 },
  factVal: { flex: 1, lineHeight: 1.05 },
  h1: { fontSize: 15, fontWeight: 700, marginTop: 22, marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  h2: { fontSize: 11, fontWeight: 600, marginTop: 12, marginBottom: 4 },
  p: { marginBottom: 7, lineHeight: 1.2 },
  li: { flexDirection: "row", marginBottom: 3 },
  bullet: { width: 10, color: C.subtle },
  ref: { color: C.accent, fontSize: 7 },
  table: { borderWidth: 1, borderColor: C.border, borderRadius: 4 },
  th: { flexDirection: "row", backgroundColor: C.soft, paddingVertical: 4, paddingHorizontal: 8, fontSize: 7.5, fontWeight: 600, color: C.subtle },
  tr: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: C.border },
  event: { flexDirection: "row", marginBottom: 6 },
  date: { width: 72, color: C.subtle, fontSize: 8.5 },
  kind: { fontSize: 7, color: C.subtle, textTransform: "uppercase", letterSpacing: 0.5 },
  quote: { borderLeftWidth: 2, borderLeftColor: C.accent, paddingLeft: 10, marginBottom: 10 },
  source: { flexDirection: "row", marginBottom: 2, fontSize: 8 },
  link: { color: C.accent, textDecoration: "none" },
  // react-pdf multiplies lineHeight by the font's own line height (about 1.2em for Inter), not the font size.
  body: { lineHeight: 1.15 },
});

/** Inline markdown: **bold**, [text](url) and [n] references (small, accent, linking to the source). */
function Inline({ text, refs }: { text: string; refs: LoreExport["refs"] }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:[^)]+\)|\[\d+\])/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => {
        const cite = p.match(/^\[(\d+)\]$/);
        if (cite) {
          const r = refs[Number(cite[1]) - 1];
          return r ? (
            <Link key={i} src={r.url} style={[s.ref, s.link]}>
              {` ${cite[1]}`}
            </Link>
          ) : null;
        }
        const link = p.match(/^\[([^\]]+)\]\((https?:[^)]+)\)$/);
        if (link)
          return (
            <Link key={i} src={link[2]} style={s.link}>
              {link[1]}
            </Link>
          );
        if (p.startsWith("**")) return <Text key={i} style={{ fontWeight: 600 }}>{p.slice(2, -2)}</Text>;
        return <Text key={i}>{p}</Text>;
      })}
    </>
  );
}

const Refs = ({ ns, refs }: { ns: number[]; refs: LoreExport["refs"] }) => <Inline text={ns.map((n) => `[${n}]`).join("")} refs={refs} />;

// Flat on the page (no wrapping View): one tall View holding hundreds of rows breaks react-pdf's layout.
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <Text style={s.h1} minPresenceAhead={60}>
        {title}
      </Text>
      {children}
    </>
  );
}

function LoreDocument({ d }: { d: LoreExport }) {
  const day = d.version.slice(0, 10);
  return (
    <Document title={`The lore of ${d.name}`} author="Hyperlore" subject={d.summary} keywords={`${d.name}, history, funding, founders`} creator="Hyperlore" producer="Hyperlore">
      <Page size="A4" style={s.page} wrap>
        <View style={s.header} fixed>
          <Text>Hyperlore · The lore of {d.name}</Text>
          <Text>Version {day}</Text>
        </View>
        <Text style={s.kicker}>Hyperlore · sourced history</Text>
        <Text style={s.title}>{d.name}</Text>
        {d.summary && <Text style={s.lead}>{d.summary}</Text>}
        <Text style={s.meta}>
          {d.counts.events} events · {d.counts.sources} sources · {d.counts.quotes} quotes · archive version {day} ·{" "}
          <Link src={d.url} style={s.link}>
            {d.url.replace(/^https?:\/\//, "")}
          </Link>
        </Text>
        <View style={s.facts}>
          {d.facts.map(([k, v], i) => (
            <View key={k} style={[s.factRow, i === d.facts.length - 1 ? { borderBottomWidth: 0 } : {}]} wrap={false}>
              <Text style={s.factKey}>{k}</Text>
              <Text style={s.factVal}>{v}</Text>
            </View>
          ))}
        </View>

        {d.overview.length > 0 && (
          <Section title="Overview">
            {d.overview.map((b, i) =>
              b.kind === "h2" ? (
                <Text key={i} style={s.h2} minPresenceAhead={40}>
                  {b.text}
                </Text>
              ) : b.kind === "li" ? (
                <View key={i} style={s.li}>
                  <Text style={s.bullet}>•</Text>
                  <Text style={[s.body, { flex: 1 }]}>
                    <Inline text={b.text} refs={d.refs} />
                  </Text>
                </View>
              ) : (
                <Text key={i} style={s.p}>
                  <Inline text={b.text} refs={d.refs} />
                </Text>
              ),
            )}
          </Section>
        )}

        {d.funding.length > 0 && (
          <Section title="Funding">
            <View style={s.table}>
              <View style={s.th} fixed={false}>
                <Text style={{ width: 70 }}>Date</Text>
                <Text style={{ width: 80 }}>Round</Text>
                <Text style={{ width: 60, textAlign: "right" }}>Amount</Text>
                <Text style={{ width: 62, textAlign: "right" }}>Valuation</Text>
                <Text style={{ flex: 1, paddingLeft: 12 }}>Led by</Text>
              </View>
              {d.funding.map((r, i) => (
                <View key={i} style={s.tr} wrap={false}>
                  <Text style={{ width: 70, color: C.subtle }}>{r.date}</Text>
                  <Text style={{ width: 80, fontWeight: 600 }}>{r.round}</Text>
                  <Text style={{ width: 60, textAlign: "right" }}>{r.amount ?? "—"}</Text>
                  <Text style={{ width: 62, textAlign: "right" }}>{r.valuation ?? "—"}</Text>
                  <Text style={{ flex: 1, paddingLeft: 12 }}>
                    {r.leads || "—"}
                    <Refs ns={r.refs} refs={d.refs} />
                  </Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {d.people.length > 0 && (
          <Section title="People">
            {d.people.map((p, i) => (
              <View key={i} style={s.li} wrap={false}>
                <Text style={s.bullet}>•</Text>
                <Text style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 600 }}>{p.name}</Text>
                  {p.role ? <Text style={{ color: C.muted }}>{`, ${p.role}`}</Text> : null}
                </Text>
              </View>
            ))}
          </Section>
        )}

        <Section title="Timeline">
          {d.timeline.map((e, i) => (
            <View key={i} style={s.event} wrap={false}>
              <Text style={s.date}>{e.date}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.kind}>
                  {e.kind}
                  {e.inferred ? " · inferred" : ""}
                </Text>
                <Text style={[s.body, { fontWeight: 600 }]}>
                  {e.title}
                  <Refs ns={e.refs} refs={d.refs} />
                </Text>
                {e.summary && <Text style={[s.body, { color: C.muted }]}>{e.summary}</Text>}
              </View>
            </View>
          ))}
        </Section>

        {d.quotes.length > 0 && (
          <Section title="In their own words">
            {d.quotes.map((q, i) => (
              <View key={i} style={s.quote} wrap={false}>
                <Text style={[s.body, { fontStyle: "italic" }]}>“{q.text}”</Text>
                <Text style={{ color: C.subtle, marginTop: 2, fontSize: 8.5 }}>
                  {q.person}
                  {q.date ? `, ${q.date}` : ""}
                  <Refs ns={[q.ref]} refs={d.refs} />
                </Text>
              </View>
            ))}
          </Section>
        )}

        <Section title="Sources">
          {d.refs.map((r) => (
            <View key={r.n} style={s.source} wrap={false}>
              <Text style={{ width: 22, color: C.subtle }}>{r.n}.</Text>
              <Text style={{ flex: 1 }}>
                {r.title ? `${r.title} · ` : ""}
                <Link src={r.url} style={s.link}>
                  {r.url.length > 110 ? `${r.url.slice(0, 107)}…` : r.url}
                </Link>
              </Text>
            </View>
          ))}
        </Section>

        <View style={s.footer} fixed>
          <Text>Every claim links to its source · {d.url.replace(/^https?:\/\//, "")}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function toPdf(d: LoreExport) {
  registerFonts();
  return renderToBuffer(<LoreDocument d={d} />);
}
