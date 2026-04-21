# Follow Builders — Codex Agent Instructions

AI-powered content curator that tracks top AI builders across X/Twitter and YouTube
podcasts, then remixes their content into digestible summaries.

No API keys required. All content is fetched from a central feed.

## How to Generate a Digest

### Step 1: Run the prepare script

```bash
cd scripts && node prepare-digest.js
```

This outputs a single JSON blob with:
- `config` — user preferences (language, delivery method)
- `podcasts` — podcast episodes with full transcripts
- `x` — builders with their recent tweets (text, URLs, bios)
- `prompts` — remix instructions to follow
- `stats` — counts of episodes and tweets
- `blogs` — blog posts from AI company engineering blogs

If `stats.podcastEpisodes` is 0 AND `stats.xBuilders` is 0, respond:
"No new updates from your builders today."

### Step 2: Remix the content

Your ONLY job is to remix content from the JSON. Do NOT fetch anything from the web.

**Tweets (process first):**
1. Use each builder's `bio` field for their role (e.g. bio says "ceo @box" → "Box CEO Aaron Levie")
2. Summarize their `tweets` — focus on substantive content: opinions, insights, announcements
3. Write 4-8 sentences per builder — be detailed and thorough
4. Every tweet MUST include its `url` from the JSON

**Podcasts (process second):**
1. Write a 600-1000 word remix of the transcript
2. Start with a one-sentence "core takeaway"
3. Cover ALL major topics, organized by theme
4. Include 3-5 direct quotes
5. Use `name`, `title`, and `url` from the JSON — NOT from the transcript

**Blogs (process third):**
1. Summarize in 100-300 words
2. Lead with the core announcement or finding
3. Include specific numbers or benchmarks if available
4. Include a direct quote if available

### Step 3: Assemble the digest

Format:
```
AI Builders Digest — [Date]

## X / TWITTER
[builder summaries]

## OFFICIAL BLOGS
[blog summaries, if any]

## PODCASTS
[podcast summaries]

Generated through the Follow Builders skill: https://github.com/zarazhangrui/follow-builders
```

### Step 4: Language

Read `config.language` from the JSON:
- `"en"` — entire digest in English
- `"zh"` — entire digest in Chinese (keep tech terms like AI, LLM, API, agent in English; keep all proper nouns in English; keep all URLs unchanged)
- `"bilingual"` — interleave English and Chinese paragraph by paragraph (NOT all English then all Chinese)

## Absolute Rules

- NEVER invent or fabricate content. Only use what's in the JSON.
- Every piece of content MUST have its source URL. No URL = do not include.
- Do NOT guess job titles. Use the `bio` field or just the person's name.
- Do NOT visit x.com, search the web, or call any external API.
- Use full names and roles, never just last names (e.g. "Box CEO Aaron Levie" not "Levie").
- Never use @ before Twitter handles (it creates wrong links on some platforms).

## Delivery

After generating the digest, deliver it based on `config.delivery.method`:

- `"stdout"` (default): print the digest to terminal
- `"telegram"` or `"email"`: save digest to a file, then run:
  ```bash
  echo '<digest>' > /tmp/fb-digest.txt
  cd scripts && node deliver.js --file /tmp/fb-digest.txt
  ```

## Project Structure

```
scripts/
  prepare-digest.js   — fetches feeds, outputs JSON (run this first)
  deliver.js          — sends digest via Telegram/email/stdout
  generate-feed.js    — central feed generator (runs on GitHub Actions, not locally)
prompts/
  digest-intro.md     — digest assembly rules
  summarize-podcast.md — podcast remix instructions
  summarize-tweets.md  — tweet summary instructions
  summarize-blogs.md   — blog summary instructions
  translate.md         — translation instructions
config/
  default-sources.json — list of tracked builders, podcasts, and blogs
```

User config is at `~/.follow-builders/config.json`.
User prompt overrides are at `~/.follow-builders/prompts/`.
