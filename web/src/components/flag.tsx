import { countryName } from "@/lib/directory";

/** A country's flag, sized to the text beside it. SVGs from flag-icons (MIT), since Windows has no flag emoji. */
export function Flag({ code, className = "" }: { code?: string; className?: string }) {
  if (!code || !/^[a-z]{2}$/i.test(code)) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/flags/${code.toLowerCase()}.svg`} alt={countryName(code)} title={countryName(code)} loading="lazy" className={`flag ${className}`} />
  );
}
