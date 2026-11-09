import { ImageResponse } from "next/og";
import { isLive } from "./store";

// One social-card design for every page type. 1200×630, dark, with an optional image
// (company icon, portrait, place photo) fetched from the site's own static files.

export const OG_SIZE = { width: 1200, height: 630 };
export const SITE_URL = process.env.SITE_URL ?? "http://localhost:3007";

/** Satori can't decode WebP, so those fall back to the monogram rather than breaking the card. */
async function inline(src?: string) {
  if (!src || /\.webp$/i.test(src)) return undefined;
  try {
    const res = await fetch(new URL(src, SITE_URL));
    if (!res.ok) return undefined;
    const type = res.headers.get("content-type") ?? "image/png";
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return undefined;
  }
}

type Card = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  stats?: (string | false | undefined)[];
  image?: string;
  imageShape?: "square" | "circle" | "wide";
};

/** The card as a PNG. Rendered eagerly: if the picture can't be parsed, the card is drawn without it
 * (cards are prerendered at build time, where one bad logo must not fail the build). */
export async function ogCard(card: Card) {
  const png = async (c: Card) => (await ogCardRaw(c)).arrayBuffer();
  let body: ArrayBuffer;
  try {
    body = await png(card);
  } catch {
    body = await png({ ...card, image: undefined });
  }
  return new Response(body, { headers: { "Content-Type": "image/png" } });
}

async function ogCardRaw({ eyebrow, title, subtitle, stats = [], image, imageShape = "square" }: Card) {
  const data = await inline(image);
  // Cut on a word boundary: "valued at $15…" reads as a wrong number.
  const text = subtitle && subtitle.length > 150 ? `${subtitle.slice(0, 148).replace(/[\s,;:–—-]+\S*$/, "")}…` : subtitle;
  const shown = stats.filter(Boolean) as string[];
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#0b0c0e", color: "#f5f5f2", padding: 72 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, color: "#b9bbc2" }}>
            <svg viewBox="0 0 32 32" width="40" height="40">
              <path fill="#ccff2a" d="M8 0H24A8 8 0 0 1 32 8V24A8 8 0 0 1 24 32H8A8 8 0 0 1 0 24V8A8 8 0 0 1 8 0Z" />
            </svg>
            Hyperlore
          </div>
          <div style={{ display: "flex", marginTop: "auto", fontSize: 30, color: "#ccff2a" }}>{eyebrow}</div>
          <div style={{ display: "flex", fontSize: title.length > 22 ? 76 : 100, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02 }}>
            {title}
          </div>
          {text && (
            <div style={{ display: "flex", marginTop: 24, fontSize: 30, color: "#b9bbc2", lineHeight: 1.35, maxWidth: data ? 760 : 1050 }}>
              {text}
            </div>
          )}
          <div style={{ display: "flex", gap: 28, marginTop: 36, fontSize: 24, color: "#8f919a" }}>
            {shown.map((s) => (
              <div key={s} style={{ display: "flex" }}>
                {s}
              </div>
            ))}
            <div style={{ display: "flex", marginLeft: "auto" }}>Every claim sourced</div>
          </div>
        </div>
        {data && (
          <div style={{ display: "flex", alignItems: "center", marginLeft: 48 }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img
              src={data}
              width={imageShape === "wide" ? 300 : 220}
              height={imageShape === "wide" ? 200 : 220}
              style={{
                objectFit: imageShape === "square" ? "contain" : "cover",
                borderRadius: imageShape === "circle" ? 110 : 28,
                background: imageShape === "square" ? "#ffffff" : "transparent",
                padding: imageShape === "square" ? 28 : 0,
              }}
            />
          </div>
        )}
      </div>
    ),
    // Cards built from the snapshot never change within a deployment: let the CDN keep them (its cache is
    // per deployment), so each one is rendered once rather than on every crawler visit. Not when the image
    // failed to load (a WebP aside): that card is retried next time.
    isLive() || (image && !data && !/\.webp$/i.test(image))
      ? OG_SIZE
      : { ...OG_SIZE, headers: { "Cache-Control": "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400" } },
  );
}
