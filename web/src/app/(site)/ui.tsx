import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  IconAlertTriangle,
  IconArrowMerge,
  IconArrowsSplit2,
  IconBolt,
  IconBook,
  IconBox,
  IconBrandGithub,
  IconBrandLinkedin,
  IconBrandX,
  IconBuildingSkyscraper,
  IconCalendarEvent,
  IconCoins,
  IconCurrencyDollar,
  IconFile,
  IconFileText,
  IconFlag,
  IconHeadphones,
  IconHistory,
  IconLink,
  IconLogout,
  IconMessage,
  IconPaint,
  IconPencil,
  IconPhoto,
  IconPoint,
  IconPresentation,
  IconRocket,
  IconTargetArrow,
  IconUserOff,
  IconUserPlus,
  IconVideo,
  IconWorldWww,
  IconBrandGoogle,
} from "./icons";
import { Avatar, Chip, Tag } from "./tw";
import type { Logo } from "./data";
import { stageLabel, statusLabel } from "@/lib/directory";
import { formatDate } from "@/lib/format";
import { withBase } from "@/lib/base";

export const T = "";

type TagColor = Parameters<typeof Tag>[0]["color"];
type IconComp = typeof IconPoint;

// ---------------------------------------------------------------------------------------------
// Event kinds, statuses and stages as Twenty select options: one color and icon each.

export const KINDS: Record<string, { label: string; color: Exclude<TagColor, "transparent">; icon: IconComp }> = {
  founding: { label: "Founding", color: "blue", icon: IconFlag },
  funding: { label: "Funding", color: "green", icon: IconCoins },
  rename: { label: "Rename", color: "purple", icon: IconPencil },
  logo: { label: "Logo", color: "violet", icon: IconPhoto },
  rebrand: { label: "Rebrand", color: "violet", icon: IconPaint },
  product: { label: "Product", color: "sky", icon: IconBox },
  launch: { label: "Launch", color: "orange", icon: IconRocket },
  acquisition: { label: "Acquisition", color: "red", icon: IconArrowMerge },
  acquired: { label: "Acquired", color: "red", icon: IconArrowMerge },
  hire: { label: "Hire", color: "turquoise", icon: IconUserPlus },
  departure: { label: "Departure", color: "gray", icon: IconLogout },
  event: { label: "Event", color: "amber", icon: IconCalendarEvent },
  conference: { label: "Conference", color: "amber", icon: IconPresentation },
  milestone: { label: "Milestone", color: "gold", icon: IconTargetArrow },
  pivot: { label: "Pivot", color: "pink", icon: IconArrowsSplit2 },
  domain: { label: "Domain", color: "cyan", icon: IconWorldWww },
  office: { label: "Office", color: "brown", icon: IconBuildingSkyscraper },
  controversy: { label: "Controversy", color: "tomato", icon: IconAlertTriangle },
  partnership: { label: "Partnership", color: "jade", icon: IconLink },
  "open-source": { label: "Open source", color: "grass", icon: IconBrandGithub },
  pricing: { label: "Pricing", color: "lime", icon: IconCurrencyDollar },
  outage: { label: "Outage", color: "crimson", icon: IconBolt },
  layoff: { label: "Layoff", color: "ruby", icon: IconUserOff },
  other: { label: "Other", color: "gray", icon: IconPoint },
};
export const kindOf = (k: string) => (Object.hasOwn(KINDS, k) ? KINDS[k] : KINDS.other);

export function KindTag({ kind }: { kind: string }) {
  const k = kindOf(kind);
  return (
    <Tag color={k.color} truncate={false}>
      {k.label}
    </Tag>
  );
}

const STATUS_COLOR: Record<string, Exclude<TagColor, "transparent">> = { active: "green", public: "blue", acquired: "purple", closed: "gray" };
export function StatusTag({ status }: { status: string }) {
  return (
    <Tag color={STATUS_COLOR[status] ?? "gray"} truncate={false}>
      {statusLabel(status)}
    </Tag>
  );
}

const STAGE_COLOR: Record<string, Exclude<TagColor, "transparent">> = {
  "pre-seed": "gray",
  angel: "bronze",
  seed: "sky",
  "series-a": "blue",
  "series-b": "iris",
  "series-c": "violet",
  "series-d": "purple",
  "series-e": "plum",
  growth: "plum",
  ipo: "green",
  strategic: "orange",
  crowdfunding: "amber",
  grant: "lime",
  debt: "brown",
  secondary: "gray",
  tender: "gray",
  other: "gray",
};
export const stageColor = (s?: string) => (s ? (STAGE_COLOR[s] ?? (s.startsWith("series-") ? "purple" : "gray")) : "gray");
export function StageTag({ stage }: { stage?: string }) {
  if (!stage) return null;
  return (
    <Tag color={stageColor(stage)} truncate={false}>
      {stageLabel(stage)}
    </Tag>
  );
}

// ---------------------------------------------------------------------------------------------
// Glossy icon tiles: the classic design's colored app icons, one hue per section in both designs.

export const HUES: Record<string, { hue: number; sat?: number }> = {
  home: { hue: 0, sat: 0 },
  companies: { hue: 215 },
  categories: { hue: 185 },
  rounds: { hue: 145 },
  people: { hue: 262 },
  investors: { hue: 38 },
  places: { hue: 10 },
  stories: { hue: 330 },
  portfolios: { hue: 28, sat: 95 },
  benchmarks: { hue: 20, sat: 85 },
  ideas: { hue: 74, sat: 80 },
  compare: { hue: 200, sat: 50 },
  stats: { hue: 280, sat: 50 },
  api: { hue: 0, sat: 0 },
  search: { hue: 74, sat: 80 },
  events: { hue: 230 },
  sources: { hue: 200, sat: 30 },
  quotes: { hue: 300 },
  capital: { hue: 160 },
};

/** Twenty's tag palette as hues, so a kind's tile and its tag agree. */
const TAG_HUE: Record<string, number> = {
  blue: 220, green: 145, purple: 275, violet: 255, sky: 200, orange: 28, red: 2, turquoise: 172, gray: 0, amber: 42,
  gold: 46, pink: 330, cyan: 188, brown: 25, tomato: 10, jade: 158, grass: 120, lime: 80, crimson: 345, ruby: 350,
};

export function Gloss({ icon: Icon, hue, sat = 90, size = "sm" }: { icon: IconComp; hue: number; sat?: number; size?: "sm" | "md" | "lg" }) {
  return (
    <span aria-hidden="true" className="tw-gloss" data-size={size === "sm" ? undefined : size} style={{ "--hue": hue, "--sat": sat } as CSSProperties}>
      <Icon aria-hidden />
    </span>
  );
}

export const sectionGloss = (section: keyof typeof HUES, icon: IconComp, size?: "sm" | "md" | "lg") => (
  <Gloss icon={icon} hue={HUES[section].hue} sat={HUES[section].sat} size={size} />
);

export function kindHue(kind: string) {
  const color = kindOf(kind).color;
  return { hue: TAG_HUE[color] ?? 220, sat: color === "gray" || color === "brown" ? 12 : 85 };
}

// ---------------------------------------------------------------------------------------------
// Sources

const SOURCE_ICON: Record<string, IconComp> = {
  tweet: IconBrandX,
  youtube: IconVideo,
  podcast: IconHeadphones,
  hn: IconMessage,
  bluesky: IconMessage,
  blog: IconFileText,
  press: IconFileText,
  article: IconFileText,
  wayback: IconHistory,
  github: IconBrandGithub,
  wikipedia: IconBook,
  linkedin: IconBrandLinkedin,
  website: IconWorldWww,
  filing: IconFile,
  yc: IconRocket,
  google: IconBrandGoogle,
};
export const sourceIcon = (type?: string) => SOURCE_ICON[type ?? ""] ?? IconLink;

export function SourceChip({ url, host, type, title }: { url: string; host: string; type?: string; title?: string }) {
  const Icon = sourceIcon(type);
  return (
    <Chip
      variant="outline"
      size="sm"
      maxWidth={220}
      tooltipContent={title ?? url}
      startElement={<Icon size={12} stroke={1.6} aria-hidden />}
      render={<a href={url} target="_blank" rel="noreferrer" />}
      clickable
    >
      {host.replace(/^www\./, "")}
    </Chip>
  );
}

// ---------------------------------------------------------------------------------------------
// Marks

const AVATAR_PX = { xs: 12, sm: 14, md: 16, lg: 24, xl: 32, xxl: 40 } as const;

export function CompanyLogo({ name, logo, size = "md" }: { name: string; logo?: Logo; size?: keyof typeof AVATAR_PX }) {
  return (
    <Avatar
      className="tw-logo"
      data-dark={logo?.dark || undefined}
      name={name}
      colorSeed={name}
      src={logo?.src ? withBase(logo.src) : null}
      shape={size === "xl" || size === "xxl" ? "rounded-square" : "square"}
      size={size}
    />
  );
}

export function PersonAvatar({ name, photo, size = "md" }: { name: string; photo?: string; size?: keyof typeof AVATAR_PX }) {
  return <Avatar name={name} colorSeed={name} src={photo ? withBase(photo) : null} shape="circle" size={size} />;
}

/** A company as Twenty draws a relation: logo + name in a chip, linking to its record. */
export function CompanyChip({ slug, name, logo, variant = "ghost" }: { slug: string; name: string; logo?: Logo; variant?: "ghost" | "outline" | "soft" | "plain" }) {
  return (
    <Chip variant={variant} startElement={<CompanyLogo name={name} logo={logo} size="sm" />} render={<Link href={`${T}/${slug}`} />} clickable maxWidth={200}>
      {name}
    </Chip>
  );
}

export function PersonChip({ slug, name, photo, variant = "ghost" }: { slug?: string; name: string; photo?: string; variant?: "ghost" | "outline" | "soft" | "plain" }) {
  const avatar = <PersonAvatar name={name} photo={photo} size="sm" />;
  return slug ? (
    <Chip variant={variant} shape="round" startElement={avatar} render={<Link href={`${T}/people/${slug}`} />} clickable maxWidth={200}>
      {name}
    </Chip>
  ) : (
    <Chip variant={variant} shape="round" startElement={avatar} maxWidth={200}>
      {name}
    </Chip>
  );
}

// ---------------------------------------------------------------------------------------------
// Page frame: a header on the drawer background, then the bordered white panel.

export function PageHead({ icon: Icon, section, crumbs, title, actions }: { icon: IconComp; section?: keyof typeof HUES; crumbs?: { href: string; label: string }[]; title: ReactNode; actions?: ReactNode }) {
  return (
    <header className="tw-pagehead">
      <h1 className="tw-pagehead-title">
        {section ? sectionGloss(section, Icon, "md") : <Icon size={16} aria-hidden />}
        {crumbs?.map((c) => (
          <span key={c.href} style={{ display: "contents" }}>
            <Link href={c.href} className="tw-crumb">
              {c.label}
            </Link>
            <span className="tw-pagehead-sep" aria-hidden>
              /
            </span>
          </span>
        ))}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
      </h1>
      {actions && <div className="tw-pagehead-actions">{actions}</div>}
    </header>
  );
}

export function Panel({ children }: { children: ReactNode }) {
  return <section className="tw-panel">{children}</section>;
}

// ---------------------------------------------------------------------------------------------
// Formatting

export function usd(n?: number) {
  if (!n) return "";
  if (n >= 1e12) return `$${+(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${+(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${+(n / 1e6).toFixed(1)}M`;
  return `$${Math.round(n / 1e3)}K`;
}

const SIGNS: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", JPY: "¥", INR: "₹", BRL: "R$" };
export function money(r: { amountUsd?: number; amount?: number; currency?: string }) {
  if (r.amountUsd) return usd(r.amountUsd);
  if (r.amount && r.currency) {
    const v = usd(r.amount).slice(1);
    return SIGNS[r.currency] ? `${SIGNS[r.currency]}${v}` : `${r.currency} ${v}`;
  }
  return "";
}

export { formatDate };
export const year = (d?: string) => d?.slice(0, 4) ?? "";
