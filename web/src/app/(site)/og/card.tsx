import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ComponentType, ReactNode } from "react";
import { ImageResponse } from "next/og";

// Social cards in the Twenty design: a record page in miniature (the drawer bar, the white panel,
// a fields column and a timeline), with the glossy section tiles. One renderer serves both the static
// card (t = 1) and the frames of the share video (t from 0 to 1), so the two always match.

export const SIZE = { width: 1200, height: 630 };
const SITE_URL = process.env.SITE_URL ?? "http://localhost:3007";

type Icon = ComponentType<{ size?: number; color?: string; stroke?: number }>;
export type Tile = { icon: Icon; hue: number; sat?: number };
export type Field = Tile & { label: string; value: string };
export type Row = Tile & { title: string; meta?: string; tag?: string };
export type CardSpec = {
  section: Tile & { label: string };
  title: string;
  subtitle?: string;
  image?: string;
  imageShape?: "square" | "circle";
  fields: Field[];
  rowsLabel: string;
  rowsCount?: string;
  rows: Row[];
  footer: string[];
};

// --- Fonts and images ------------------------------------------------------------------------

let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 600 | 700; style: "normal" }[]> | undefined;
function loadFonts() {
  fonts ??= Promise.all(
    ([400, 600, 700] as const).map(async (weight) => ({
      name: "Inter",
      data: await readFile(path.join(process.cwd(), `src/assets/fonts/inter-latin-${weight}-normal.woff`)),
      weight,
      style: "normal" as const,
    })),
  );
  return fonts;
}

/** An image from the site's public files as a data URI: from disk when present, else over HTTP. */
async function inline(src?: string): Promise<string | undefined> {
  if (!src || /\.webp$/i.test(src)) return undefined; // Satori can't decode WebP.
  const type = src.endsWith(".svg") ? "image/svg+xml" : src.endsWith(".png") ? "image/png" : src.match(/\.jpe?g$/) ? "image/jpeg" : "image/png";
  try {
    const bytes = src.startsWith("/") ? await readFile(path.join(process.cwd(), "public", src)) : undefined;
    if (bytes) {
      // Cards are prerendered at build time: an oversized or mislabelled file (a 10 MB SVG saved as .png)
      // must not fail the build. Trust the bytes, not the extension, and skip anything huge.
      if (bytes.length > 3_000_000) return undefined;
      const sniffed = bytes[0] === 0x89 && bytes[1] === 0x50 ? "image/png" : bytes[0] === 0xff && bytes[1] === 0xd8 ? "image/jpeg" : /^\s*</.test(bytes.subarray(0, 64).toString("utf8")) ? "image/svg+xml" : type;
      return `data:${sniffed};base64,${bytes.toString("base64")}`;
    }
  } catch {}
  try {
    const res = await fetch(new URL(src, SITE_URL));
    if (!res.ok) return undefined;
    return `data:${res.headers.get("content-type") ?? type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return undefined;
  }
}

// --- Motion -----------------------------------------------------------------------------------

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - (1 - x) ** 3;
/** Progress of an element that starts at `start` and takes `dur`, both as fractions of the clip. */
const at = (t: number, start: number, dur = 0.12) => easeOut(clamp((t - start) / dur));
const enter = (p: number, dy = 14) => ({ opacity: p, transform: `translateY(${(1 - p) * dy}px)` });

// --- Pieces -----------------------------------------------------------------------------------

const INK = "#333333";
const MUTED = "#999999";
const LINE = "#ebebeb";

function Gloss({ icon: I, hue, sat = 90, size }: Tile & { size: number }) {
  const c = (l: number, a = 1) => `hsla(${hue}, ${sat}%, ${l}%, ${a})`;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: size * 0.3,
        backgroundImage: `radial-gradient(circle at 30% 0%, ${c(78)} 0%, ${c(78, 0)} 62%), linear-gradient(160deg, ${c(56)}, ${c(34)})`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.55), 0 2px 6px ${c(40, 0.35)}`,
      }}
    >
      <I size={Math.round(size * 0.62)} color="#ffffff" stroke={2.2} />
    </div>
  );
}

function Mark() {
  return (
    <svg viewBox="0 0 32 32" width="26" height="26">
      <path fill="#ccff2a" d="M8 0H24A8 8 0 0 1 32 8V24A8 8 0 0 1 24 32H8A8 8 0 0 1 0 24V8A8 8 0 0 1 8 0Z" />
    </svg>
  );
}

const cut = (s: string | undefined, n: number) => (s && s.length > n ? `${s.slice(0, n - 1).replace(/[\s,;:–—-]+\S*$/, "")}…` : s);

function Card({ spec, image, t }: { spec: CardSpec; image?: string; t: number }): ReactNode {
  const head = at(t, 0, 0.16);
  const rows = spec.rows.slice(0, 6);
  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#f1f1f1", fontFamily: "Inter", color: INK, padding: "0 22px 22px" }}>
      {/* The drawer bar: workspace, breadcrumb. */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, height: 64, fontSize: 21, opacity: at(t, 0, 0.1) }}>
        <Mark />
        <div style={{ display: "flex", fontWeight: 600 }}>Hyperlore</div>
        <div style={{ display: "flex", color: "#cccccc" }}>/</div>
        <Gloss {...spec.section} size={24} />
        <div style={{ display: "flex", color: "#666666" }}>{spec.section.label}</div>
        <div style={{ display: "flex", marginLeft: "auto", color: MUTED, fontSize: 18 }}>Every fact links to where it was said</div>
      </div>
      {/* The page panel. */}
      <div style={{ display: "flex", flex: 1, background: "#ffffff", border: `1px solid ${LINE}`, borderRadius: 12, overflow: "hidden", ...enter(head, 24) }}>
        <div style={{ display: "flex", flexDirection: "column", width: 470, padding: "30px 30px 26px", borderRight: `1px solid ${LINE}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
              <img
                src={image}
                width={72}
                height={72}
                style={{ objectFit: spec.imageShape === "circle" ? "cover" : "contain", borderRadius: spec.imageShape === "circle" ? 36 : 14, background: "#fff", border: `1px solid ${LINE}`, padding: spec.imageShape === "circle" ? 0 : 8 }}
              />
            ) : (
              <Gloss {...spec.section} size={72} />
            )}
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <div style={{ display: "flex", fontSize: spec.title.length <= 10 ? 52 : spec.title.length <= 15 ? 42 : 34, fontWeight: 700, letterSpacing: -1.2, lineHeight: 1.08, maxWidth: 330 }}>{cut(spec.title, 48)}</div>
            </div>
          </div>
          {spec.subtitle && (
            <div style={{ display: "flex", marginTop: 18, fontSize: 21, lineHeight: 1.4, color: "#666666", ...enter(at(t, 0.08)) }}>{cut(spec.subtitle, 128)}</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: "auto" }}>
            {spec.fields.slice(0, 4).map((f, i) => (
              <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 21, ...enter(at(t, 0.14 + i * 0.05), 8) }}>
                <Gloss {...f} size={26} />
                <div style={{ display: "flex", width: 128, color: MUTED }}>{f.label}</div>
                <div style={{ display: "flex", fontWeight: 600 }}>{cut(f.value, 24)}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          {/* A tab strip, as on the record page. */}
          <div style={{ display: "flex", alignItems: "flex-end", height: 58, padding: "0 26px", borderBottom: `1px solid ${LINE}`, gap: 26, fontSize: 19 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 14, borderBottom: `2px solid ${INK}`, fontWeight: 600 }}>
              {spec.rowsLabel}
              {spec.rowsCount && <div style={{ display: "flex", padding: "1px 8px", borderRadius: 10, background: "#f1f1f1", color: "#666666", fontSize: 15, fontWeight: 600 }}>{spec.rowsCount}</div>}
            </div>
            <div style={{ display: "flex", paddingBottom: 16, color: MUTED }}>Sources</div>
            <div style={{ display: "flex", paddingBottom: 16, color: MUTED }}>Quotes</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", padding: "18px 26px 0", gap: 0, position: "relative" }}>
            {rows.map((r, i) => {
              const p = at(t, 0.22 + i * 0.085, 0.14);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, height: 62, ...enter(p, 18) }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 32, height: 62 }}>
                    <div style={{ display: "flex", width: 1.5, flex: 1, background: i === 0 ? "transparent" : LINE }} />
                    <Gloss {...r} size={32} />
                    <div style={{ display: "flex", width: 1.5, flex: 1, background: i === rows.length - 1 ? "transparent" : LINE }} />
                  </div>
                  <div style={{ display: "block", flex: 1, minWidth: 0, fontSize: 21, fontWeight: 600, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{r.title}</div>
                  {r.tag && <div style={{ display: "flex", padding: "2px 10px", borderRadius: 6, background: `hsla(${r.hue}, ${r.sat ?? 80}%, 50%, 0.12)`, color: `hsl(${r.hue}, ${Math.min(r.sat ?? 80, 70)}%, 36%)`, fontSize: 16 }}>{r.tag}</div>}
                  {r.meta && <div style={{ display: "flex", width: 118, justifyContent: "flex-end", color: MUTED, fontSize: 18 }}>{r.meta}</div>}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 22, marginTop: "auto", padding: "0 26px 20px", fontSize: 17, color: MUTED, opacity: at(t, 0.8, 0.15) }}>
            {spec.footer.map((f) => (
              <div key={f} style={{ display: "flex" }}>
                {f}
              </div>
            ))}
            <div style={{ display: "flex", marginLeft: "auto", fontWeight: 600, color: "#666666" }}>hyperlore</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The card as a PNG response, at time `t` of its entrance (1 = settled, the static share image). */
export async function twentyCard(spec: CardSpec, t = 1) {
  const [image, loaded] = await Promise.all([inline(spec.image), loadFonts()]);
  const render = (img?: string) =>
    new ImageResponse(<Card spec={spec} image={img} t={t} />, { ...SIZE, fonts: loaded }).arrayBuffer();
  // Cards are prerendered at build time, and one logo Satori can't parse (an SVG without a viewBox)
  // must not fail the build: render the card without its picture instead.
  let png: ArrayBuffer;
  try {
    png = await render(image);
  } catch {
    png = await render(undefined);
  }
  return new Response(png, { headers: { "Content-Type": "image/png" } });
}
