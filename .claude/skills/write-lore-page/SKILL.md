---
name: write-lore-page
description: Write a company overview or a cross-company story page for Hyperlore from the archive only, with a citation on every factual sentence. Use after collecting a company, or for sagas spanning companies (e.g. the sandbox wars).
---

# Writing a lore page

Pages are written **from the archive only**. Read `./hl list events <slug>`, `./hl list quotes <slug>`, `./hl list entities`, `./hl list assets <slug>`, `./hl list sources`. No facts from memory and no new research while writing: if something is missing, collect it first or leave it out.

## Saving

```bash
python3 - <<'EOF' | ./hl page
import json
print(json.dumps({"company": "vercel", "slug": "overview", "title": "Vercel",
                  "summary": "One plain sentence, ≤ 30 words, no citations.",
                  "markdown": open("/tmp/vercel.md").read()}))
EOF
```
- Company overview: `company = <slug>`, `slug = "overview"`.
- Cross-company story: `company = "story"`, `slug = <story-slug>`, plus `"companies": [...]`.
- `./hl page` rejects pages without citations and citations of unknown sources.

## Format

- Citations: `{{cite:<exact source url>}}` right **after** the sentence's period: `ZEIT launched now on 6 April 2016.{{cite:https://x.com/vercel/status/717764348706316288}}`. One or more per factual sentence. Prefer first-hand sources.
- Sections (`## `), adapted to the company: `## Origins`, `## Name and identity`, `## Funding` (prose; the site renders the table), `## Product`, `## Notable moments`, optional `## In their own words` (2–3 short verbatim `> ` quotes, each cited; foreign-language quotes keep the original with an English gloss in brackets).
- 400–900 words for companies, 700–1200 for stories.

## Voice

Encyclopedic, neutral and precise, but with the texture that makes lore worth reading: names, numbers, the telling detail ("a $10 payment link", "a penthouse in Orchard shared by seven founders").
- No hype adjectives, no "In conclusion", no rhetorical questions, no em-dash flourishes.
- Dates match the record's precision: "6 April 2016", "April 2020", "2015". Money: "$21 million", "€105 million".
- Conflicts: "Sources differ: …". Inferred facts are flagged. Founders' numbers are attributed.
- Controversies: allegations attributed, responses included.
