"use client";

import { useEffect } from "react";

/** Tracks the pointer across raised panels so their surface catches the light. Mouse only. */
export function Aura() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const pad = (e.target as Element | null)?.closest?.<HTMLElement>(".pad");
        if (!pad) return;
        const r = pad.getBoundingClientRect();
        pad.style.setProperty("--mx", `${e.clientX - r.left}px`);
        pad.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
