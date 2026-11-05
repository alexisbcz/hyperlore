"use client";

import { useEffect } from "react";
import { rememberCompany, type Recent } from "./nav-links";

/** Adds the company to the sidebar's Recent list. */
export function RememberCompany(entry: Recent) {
  const { slug, name, icon } = entry;
  useEffect(() => rememberCompany({ slug, name, icon }), [slug, name, icon]);
  return null;
}
