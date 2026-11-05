# Evidence for the README figures

Four concept drawings made with the [teardown](https://github.com/jakubkrehel/skills/tree/main/skills/teardown) skill by Jakub Krehel. None of them depicts a physical object: each idea in Hyperlore's agent system is one part built from thin plates, exploded along one axis. Sizes are invented; only the order of the layers and what each one is called carry meaning.

Intended use: README illustrations on GitHub, about 900 px wide, light background. Output: SVG (editable source) and 2× PNG (what the README embeds, so fonts render the same everywhere).

| Feature group | Evidence | Source in the repo |
| --- | --- | --- |
| Agent = model + brief + skills + tools (`agent`) | Concept, labeled as such | `AGENTS.md` (the brief), `.claude/skills/*/SKILL.md` (10 skills; 4 drawn), `hl.py` |
| Tool layer: `./hl`, ScrapeCreators (paid), Context.dev (metered), free APIs | Concept | `AGENTS.md` § "Sources and how to get them" |
| Pipeline order: web → raw cache → gate → archive → snapshot → site (`pipeline`) | Concept | `hl.py` (`cmd_sc`/`cmd_ctx` cache to `data/raw/`, `check_sources`, `cmd_export` → `web/data/archive.json`), `web/src/lib/store.ts` |
| Six archive collections | Concept; names are the real collection names | `hl.py` (`sources`, `events`, `quotes`, `entities`, `assets`, `pages`) |
| A fact's chain: event → quote → source → raw capture → original (`fact`) | Concept | `hl.py` `cmd_event` (sources `[{url, quote}]`), `cmd_source` (`raw_path`) |
| Second source merging on re-add | Concept | `hl.py` `cmd_event`: same company + kind + date + title merges sources |
| Many agents through one gate; spend ledger and deletions (`swarm`) | Concept | `hl.py` `db.api_calls.insert_one` (with `HL_AGENT`), `cmd_delete` → `deletions` |

The three agents in `swarm` and the four skill cards in `agent` are examples picked from the real skill list, not a fixed roster.

## Rebuild and proof

```sh
# from the repo root
node tools/teardown/scripts/proof.cjs docs/figures/drawing.json /tmp/proof/ --quick   # assembled + exploded sheets
node docs/figures/render.cjs              # the README's SVG + PNG, inked and tinted like the teardown viewer
node docs/figures/render.cjs --assembled  # also the assembled views
```

`tools/teardown/` is a copy of the skill's `assets/` and `scripts/` (tests left out), as the skill prescribes. The interactive viewer (`build-viewer.cjs`) was not built: it needs `jspdf`, `svg2pdf.js` and `@fontsource-variable/inter`, and the README only needs static images.
