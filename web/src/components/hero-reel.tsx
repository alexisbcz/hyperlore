"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ComponentProps, type CSSProperties } from "react";
import { CompanyMark } from "./lore";

type Mark = ComponentProps<typeof CompanyMark>["logo"];

export type ReelItem = {
  href: string;
  eyebrow: string;
  title: string;
  image?: string;
  marks: { name: string; logo?: Mark; dark?: Mark }[];
};

const INTERVAL = 4500;
const SPREAD = 46; // How far each step moves a card, as a % of the reel's half-width.

/** The shortest signed distance from the centre card, so cards wrap around the ring. */
const offsetOf = (i: number, at: number, n: number) => {
  const d = (i - at + n) % n;
  return d > n / 2 ? d - n : d;
};

/** A fan of cards that turns on its own, and stops while the pointer or keyboard focus is on it. */
export function HeroReel({ items }: { items: ReelItem[] }) {
  const [at, setAt] = useState(0);
  const [paused, setPaused] = useState(false);
  // Off-screen or in a background tab, a turning reel is motion nobody sees: stop it.
  const [visible, setVisible] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const touchX = useRef(0);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let inView = true;
    const sync = () => setVisible(inView && document.visibilityState === "visible");
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      sync();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  useEffect(() => {
    if (paused || !visible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setAt((a) => (a + 1) % items.length), INTERVAL);
    return () => clearInterval(id);
  }, [paused, visible, items.length]);

  return (
    <div
      ref={root}
      className="reel"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) setAt((a) => (a + (dx < 0 ? 1 : -1) + items.length) % items.length);
      }}
    >
      {/* The centre card lights the page behind the fan. */}
      {items.map((item, i) =>
        item.image ? (
          <Image
            key={`glow-${item.href}`}
            src={item.image}
            alt=""
            aria-hidden="true"
            width={96}
            height={54}
            className={`pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[72%] -translate-x-1/2 -translate-y-1/2 object-cover blur-3xl saturate-150 transition-opacity duration-500 ${i === at ? "opacity-40" : "opacity-0"}`}
          />
        ) : null,
      )}
      {items.map((item, i) => {
        const d = offsetOf(i, at, items.length);
        const far = Math.abs(d) > 2;
        const style = {
          "--x": `calc(${d} * ${SPREAD}cqw / 2)`,
          "--s": 1 - Math.abs(d) * 0.16,
          "--o": far ? 0 : 1,
          "--dim": 1 - Math.abs(d) * 0.3,
          zIndex: 10 - Math.abs(d),
        } as CSSProperties;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={style}
            aria-hidden={far || undefined}
            tabIndex={far ? -1 : undefined}
            onClick={(e) => {
              // A side card comes to the centre first; only the centre card opens.
              if (d !== 0) {
                e.preventDefault();
                setAt(i);
              }
            }}
            className={`reel-card ${far ? "pointer-events-none" : ""}`}
          >
            {item.image ? (
              <Image src={item.image} alt="" fill sizes="(max-width: 640px) 76vw, 480px" priority={i === 0} className="object-cover" />
            ) : (
              <span aria-hidden="true" className="absolute -inset-4 grid rotate-[-8deg] grid-cols-4 place-items-center gap-3 opacity-60">
                {item.marks.slice(0, 12).map((m) => (
                  <CompanyMark key={m.name} logo={m.logo} dark={m.dark} name={m.name} size="lg" />
                ))}
              </span>
            )}
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
            <span className={`absolute inset-x-0 bottom-0 p-4 text-left text-white transition-opacity duration-300 ${d === 0 ? "" : "opacity-0"}`}>
              <span className="block font-mono text-[11px] uppercase tracking-wide text-[#ccff2a]">{item.eyebrow}</span>
              <span className="mt-1 block text-balance font-[family-name:var(--font-display)] text-xl font-bold leading-tight tracking-tight sm:text-2xl">{item.title}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
