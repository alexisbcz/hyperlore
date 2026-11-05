export type Align = "left" | "center" | "right" | undefined;
export type Table = { head: string[]; align: Align[]; rows: string[][] };
export type Segment = { kind: "text"; text: string } | { kind: "table"; table: Table };

const SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const isRow = (line: string) => line.trim().startsWith("|") || (line.includes("|") && line.trim().length > 0);

/** A row's cells; pipes inside {{cite:…}} or escaped as `\|` don't split. */
function cells(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const out: string[] = [];
  let cur = "";
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\" && s[i + 1] === "|") {
      cur += "|";
      i++;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}" && depth > 0) depth--;
    if (c === "|" && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

const alignOf = (spec: string): Align => {
  const s = spec.trim();
  if (s.startsWith(":") && s.endsWith(":")) return "center";
  if (s.endsWith(":")) return "right";
  if (s.startsWith(":")) return "left";
  return undefined;
};

/** Splits a markdown block into prose and GitHub-style tables (header row, then a |---| row). */
export function splitTables(block: string): Segment[] {
  const lines = block.split("\n");
  const out: Segment[] = [];
  let text: string[] = [];
  const flush = () => {
    if (text.join("").trim()) out.push({ kind: "text", text: text.join("\n") });
    text = [];
  };
  for (let i = 0; i < lines.length; i++) {
    if (isRow(lines[i]) && lines[i + 1] !== undefined && SEPARATOR.test(lines[i + 1]) && lines[i + 1].includes("-")) {
      const head = cells(lines[i]);
      const align = cells(lines[i + 1]).map(alignOf);
      const rows: string[][] = [];
      let j = i + 2;
      for (; j < lines.length && lines[j].includes("|") && lines[j].trim(); j++) {
        const row = cells(lines[j]);
        rows.push(head.map((_, k) => row[k] ?? ""));
      }
      flush();
      out.push({ kind: "table", table: { head, align, rows } });
      i = j - 1;
    } else text.push(lines[i]);
  }
  flush();
  return out;
}

// "$4M", "~$1.2B", "€10.5 million", "48", "12%": a cell that is just an amount (citations and bold aside).
const NUMERIC = /^[~≈]?\s*[$€£]?\s*\d[\d.,]*\s*(%|[KMB]|bn|m|million|billion)?\+?$/i;
const EMPTY = /^(—|-|–|n\/a|none|undisclosed|unknown|\?)?$/i;
/** A cell's plain text: citations and emphasis markers removed. */
export const bare = (cell: string) => cell.replace(/\{\{cite:[^}\s]+\}\}/g, "").replace(/\*+/g, "").trim();

/** Columns without an explicit alignment are right-aligned when every filled cell is an amount, so digits line up. */
export function alignments(table: Table): Align[] {
  return table.head.map((_, k) => {
    if (table.align[k]) return table.align[k];
    const filled = table.rows.map((r) => bare(r[k] ?? "")).filter((c) => !EMPTY.test(c));
    return filled.length > 0 && filled.every((c) => NUMERIC.test(c)) ? "right" : undefined;
  });
}

/** Accessible name for the table's scroll box. */
export const tableLabel = (table: Table) => `Table: ${table.head.map(bare).join(", ")}`;
