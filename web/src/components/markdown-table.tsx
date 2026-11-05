import type { ReactNode } from "react";
import { alignments, bare, tableLabel, type Table } from "@/lib/markdown-table";
import { TableScroll } from "./table-scroll";

/**
 * A GitHub-style markdown table (overviews, stories, chat replies) in the shared table box. Amount
 * columns are right-aligned with lined-up digits; in a narrow column a table of three or more columns
 * turns into one card per row (`.tbl-cards`), each value labelled with its column header. The roles are
 * explicit because the cards restyle the table's rows and cells, which drops their implicit roles.
 */
export function MarkdownTable({ table, inline }: { table: Table; inline: (text: string) => ReactNode }) {
  const align = alignments(table);
  const cards = table.head.length >= 3;
  const cls = (k: number) => (align[k] === "right" ? "num" : undefined);
  const style = (k: number) => (align[k] === "center" ? { textAlign: "center" as const } : undefined);
  return (
    <TableScroll label={tableLabel(table)} className={cards ? "prose-table tbl-cards" : "prose-table"}>
      <table role="table">
        <thead role="rowgroup">
          <tr role="row">
            {table.head.map((h, k) => (
              <th key={k} scope="col" role="columnheader" className={cls(k)} style={style(k)}>
                {inline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {table.rows.map((row, j) => (
            <tr key={j} role="row">
              {row.map((c, k) => (
                <td key={k} role="cell" data-label={bare(table.head[k] ?? "")} className={cls(k)} style={style(k)}>
                  <span className="tbl-v">{inline(c)}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}
