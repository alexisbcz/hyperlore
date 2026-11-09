---
name: youtube-transcripts
description: Get timestamped transcripts of YouTube interviews, talks and podcasts (any language) to extract verbatim, time-linked quotes. Use when a founder tells the story on video or a podcast.
---

# Transcripts with timestamps

## Finding the interviews

Search by each founder's name (and handles, and earlier companies), not only the company name: on YouTube (`yt-dlp --flat-playlist --print "%(id)s | %(duration_string)s | %(channel)s | %(title)s" "ytsearch10:<name>"`) and on podcasts (`https://itunes.apple.com/search?media=podcast&entity=podcastEpisode&country=<cc>&term=<name>`, which returns `episodeUrl`, a direct audio link for whisper). Non-US founders often speak on local-language shows; use the home country's `cc`. Keep a hit only if its title or notes tie it to the company or a co-founder; namesakes are common (see `research-company`, "Search by the people").

Order of attempts, cheapest first:

1. **yt-dlp captions (free).**
   ```bash
   yt-dlp --skip-download --write-subs --write-auto-subs --sub-langs en --sub-format vtt \
     -o 'data/transcripts/%(id)s' "https://www.youtube.com/watch?v=<id>"
   ```
   French or other languages: `--sub-langs fr,en`. Add `--write-info-json` for the upload date (`upload_date`).
   - **"Sign in to confirm you're not a bot"**: caused by a VPN or datacenter IP. Turn the VPN off. If it persists, export browser cookies to `data/cookies.txt` (gitignored) and add `--cookies data/cookies.txt`. Reading Chromium's cookies directly (`--cookies-from-browser`) fails on this machine because the keyring decryption key isn't reachable.
   - **HTTP 429**: YouTube rate-limits captions when several agents hit it. Wait, and run one at a time.
2. **Context.dev `web/scrape`** on the video URL: returns metadata plus the transcript as Markdown. Use it when yt-dlp gets 429.
3. **ScrapeCreators `v1/youtube/video/transcript url=…`** (1 credit) as the last API option.
4. **Whisper** for audio-only podcasts (no captions anywhere). CPU-only here, so it's slow; one job at a time machine-wide:
   ```bash
   yt-dlp -x --audio-format wav -o 'data/media/%(id)s.%(ext)s' URL
   ffmpeg -i in.wav -ar 16000 -ac 1 -c:a pcm_s16le in16.wav
   flock data/.whisper.lock whisper-cli -m ~/.cache/whisper/ggml-large-v3-turbo.bin -l en -t 12 -osrt -f in16.wav
   ```
   For French, `ggml-large-v3` is noticeably better than turbo.

## Using transcripts

- Quote verbatim. Fix only obvious mis-transcriptions (names), never rephrase.
- Each quote: `timestamp_s` (seconds) and `deep_link` = `https://www.youtube.com/watch?v=<id>&t=<s>s`; `url` = the plain video URL registered as the source.
- Register the video as a `youtube` (or `podcast`) source with `published_at` = upload date, and say what was recorded when if it differs.
- Auto-captions garble names ("Versel", "Next JS"): check against other sources before quoting.
