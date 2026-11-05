---
name: hacker-news
description: Mine Hacker News for a company's launches, funding threads, community reactions and, above all, founders' own comments with backstory and numbers. Free and citable. Use for any tech company.
---

# Hacker News via the Algolia API (free, no key)

- Stories about a company: `https://hn.algolia.com/api/v1/search?query=<name>&tags=story&hitsPerPage=50`
  - Launches: `tags=show_hn` or `tags=launch_hn`; big moments only: `&numericFilters=points>50`
  - Chronological: `search_by_date` instead of `search`
- **A founder's comments (the gold):** `https://hn.algolia.com/api/v1/search?tags=comment,author_<hn_username>&query=<topic>&hitsPerPage=100`
  - Find usernames from the founder's HN profile links, their own posts, or the launch thread's author (`author` field).
  - Founders explain origins, names, pivots, revenue and why they raised in comments. Examples: Supabase's name came from a "Super Bass" joke (kiwicopple), and Tangled's founders explained why they raised VC instead of grants.
- One full thread: `https://hn.algolia.com/api/v1/items/<id>` (nested comments).
- Cite as `https://news.ycombinator.com/item?id=<id>`, source type `hn`. Put points and comment count in `details` when they matter ("reached 1,120 points").

## Reading the signal

- The top comments on a launch or rename capture the reaction ("sounds like a company selling expensive handbags"). Quote them as reactions, attributed to the commenter, not as facts.
- An item's `created_at` gives the exact launch date.
- A founder's own comment is a primary source for their own story. It's still a claim for numbers.
