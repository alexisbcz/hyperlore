---
name: people-photos
description: Get profile photos for founders and other people in the archive (GitHub, Bluesky, X, LinkedIn), downloaded and attributed, with checks against wrong-person matches. Use after new people are added, or when a person page has no photo.
---

# People photos

Run: `uv run python people_photos.py [slug ...] [--refresh] [--sources=github,bluesky,x,linkedin,search]`.

## Source order (free and stable first)

1. **GitHub**: `https://github.com/<user>.png?size=460`. Free and stable, set by the person.
2. **Bluesky**: `getProfile` → `avatar`. Free.
3. **X**: ScrapeCreators `v1/twitter/profile` → `profile_image_url_https`. Replace `_normal` with `_400x400` (the default is 48 px).
4. **LinkedIn**: ScrapeCreators `v1/linkedin/profile url=…` → `image`.
5. **Search** (people with no known links only): Google `"<full name>" site:x.com`, then `site:linkedin.com/in`. Accepted only if the profile's display name contains every word of the person's name.

Photos are saved to `data/people/<slug>.<ext>` and recorded on the entity as `photo: {local_path, image_url, source_url, origin, fetched_at}`. `./hl export` ships them to the website.

## Verify every run visually (mandatory)

Build a labelled contact sheet and look at it:
```bash
cd data/people && magick montage * -resize 120x120^ -gravity center -extent 120x120 -geometry +4+18 -tile 8x -set label '%t' /tmp/sheet.png
```
Mistakes this caught:
- **Single-word names match strangers.** "Lewis" matched a UFC fighter's account. The script now refuses search matches for one-word names.
- **Common names match strangers.** A "Seongmin Lee" LinkedIn profile wasn't him. Never run search for someone who already has verified profile links.
- **A person's link can be their company's account.** Maciej Cegłowski's `x` link was `@Pinboard`, so his "photo" was the Pinboard logo. If an avatar is a company logo, remove the photo instead of shipping a logo as a face, and fix the entity's `links`.
- **The cursor timeout.** A long run used to crash with `CursorNotFound`. The script now loads the people list up front; keep it that way.
- **X's default grey silhouette** (`default_profile` in the URL) isn't a photo. It's rejected now.
- Logo-style avatars (patterns, initials, cartoons) are how some people present themselves. Try their other profiles for a portrait (`--sources=x,linkedin`), and keep the avatar if that's all they use.

Revert a wrong match with `--refresh --sources=<the verified source>`, or `$unset` the `photo` field and delete the file.
