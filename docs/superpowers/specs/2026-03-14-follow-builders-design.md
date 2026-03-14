# Follow Builders, Not Influencers — Design Spec

## Overview

An AI-powered content aggregation and delivery skill that monitors top AI builders (entrepreneurs, PMs, researchers) across YouTube podcasts and X/Twitter, remixes their content into digestible digests, and delivers it to users through their preferred messaging channel.

**Core philosophy:** Follow people who build things and have original opinions, not influencers who regurgitate information.

**Target users:** Non-technical people using OpenClaw or Claude Code as their personal AI agent.

## Architecture

Three-layer hybrid design: mechanical fetching via scripts, intelligent remixing via the agent.

### Layer 1: Fetcher Script (`scripts/fetch-content.js`)

A Node.js script that handles all data retrieval:

- **YouTube podcasts:** Calls Supadata API (`GET /v1/youtube/transcript`) to fetch transcripts from 5 podcast channels. First retrieves recent video IDs via Supadata's channel/search endpoints, then fetches transcripts for unprocessed videos.
- **X/Twitter:** Uses Rettiwt-API in guest mode to fetch recent posts from each of the 32 builder accounts. Guest mode requires NO login and NO API key — it accesses Twitter's internal API the same way a logged-out browser does. Zero cost, zero risk of account bans. Returns structured data: tweet text, timestamp, engagement metrics, URLs, quoted tweets, and media.
- **State management:** Reads/writes `~/.follow-builders/state.json` to skip already-processed content. Uses file locking (via `proper-lockfile` or equivalent) to prevent corruption if a manual `/ai` trigger and a cron run overlap. Prunes entries older than 90 days (accommodates weekly users who may pause and resume).
- **Output:** Structured JSON to stdout containing all new content, organized by source.

### Layer 2: SKILL.md (The Brain)

The main skill file instructs the agent on three workflows:

**Onboarding (first run):**
1. Introduce the skill and what it does
2. Ask delivery frequency and time (daily/weekly, what time, timezone) — conversationally
3. Ask content language preference (English / Chinese / Bilingual)
4. Guide user through API key setup with detailed step-by-step instructions:
   - **Supadata:** for YouTube transcripts (free tier: 200 credits/month, ~200 videos)
   - X/Twitter fetching is free — no API key needed (uses Rettiwt-API in guest mode)
   - Creates `~/.follow-builders/.env` with a placeholder for the Supadata key and opens it for the user
5. Show the default source list
6. Explain that all settings can be changed anytime through conversation
7. Set up cron job automatically

**Content delivery (cron or `/ai` trigger):**
1. Read `~/.follow-builders/config.json` for user preferences
2. Run `fetch-content.js` to get raw content
3. Read prompt files fresh from `prompts/` directory
4. Remix content using the prompt instructions — the agent uses its own LLM capabilities (no external LLM key needed)
5. Apply language preference (translate if Chinese or bilingual mode)
6. Output formatted digest

**Configuration handling:**
The agent is the configuration UI. Users change settings through natural language — no file editing required:
- "Add @username to my follow list" → agent updates config.json
- "Remove Lenny's Podcast" → agent updates config.json
- "Switch to weekly digests on Monday mornings" → agent updates cron schedule
- "Change language to bilingual" → agent updates config.json
- "Show me my current settings" → agent reads and presents config
- "Show me my source list" → agent lists all sources with names and links
- "Make the summaries shorter" → agent updates the relevant prompt file
- "I want more detail on podcast summaries" → agent updates summarize-podcast.md

The SKILL.md includes explicit instructions for recognizing these configuration intents and routing them to the appropriate file updates.

### Layer 3: Config & State Files

Stored in `~/.follow-builders/` (created during onboarding):

- `config.json` — User preferences: language, timezone, delivery frequency/time, customized source list (additions and removals from defaults)
- `state.json` — Processed content tracker: video IDs and tweet IDs with timestamps. File-locked to prevent concurrent write corruption. Pruned to 90 days.
- `.env` — API key (SUPADATA_API_KEY)

## Content Sources

### YouTube Podcasts (5 channels)

| Channel | URL |
|---------|-----|
| Latent Space | https://www.youtube.com/@LatentSpacePod |
| Training Data | https://www.youtube.com/playlist?list=PLOhHNjZItNnMm5tdW61JpnyxeYH5NDDx8 |
| Lenny's Podcast | https://www.youtube.com/@LennysPodcast |
| No Priors | https://www.youtube.com/@NoPriorsPodcast |
| Unsupervised Learning | https://www.youtube.com/@RedpointAI |

### X/Twitter Accounts (32 builders)

| Name | Handle |
|------|--------|
| Andrej Karpathy | @karpathy |
| Swyx | @swyx |
| Greg Isenberg | @gregisenberg |
| Lenny Rachitsky | @lennysan |
| Josh Woodward | @joshwoodward |
| Kevin Weil | @kevinweil |
| Peter Yang | @petergyang |
| Nan Yu | @thenanyu |
| Madhu Guru | @realmadhuguru |
| Mckay Wrigley | @mckaywrigley |
| Steven Johnson | @stevenbjohnson |
| Amanda Askell | @AmandaAskell |
| Cat Wu | @_catwu |
| Thariq | @trq212 |
| Google Labs | @GoogleLabs |
| George Mack | @george__mack |
| Raiza Martin | @raizamrtn |
| Amjad Masad | @amasad |
| Guillermo Rauch | @rauchg |
| Riley Brown | @rileybrown |
| Alex Albert | @alexalbert__ |
| Hamel Husain | @HamelHusain |
| Aaron Levie | @levie |
| Ryo Lu | @ryolu_ |
| Garry Tan | @garrytan |
| Lulu Cheng Meservey | @lulumeservey |
| Justine Moore | @venturetwins |
| Matt Turck | @mattturck |
| Julie Zhuo | @joulee |
| Gabriel Peters | @GabrielPeterss4 |
| PJ Ace | @PJaccetturo |
| Zara Zhang | @zarazhangrui |

### Source Configuration

Default sources are hardcoded in `config/default-sources.json`. Users can add or remove sources through conversation with the agent, which updates their personal `config.json`. The personal config merges with defaults: user additions are appended, user removals override defaults.

## Editable Prompt System

All remix/summary prompts live as standalone markdown files in `prompts/`:

| File | Purpose |
|------|---------|
| `summarize-podcast.md` | How to summarize a podcast transcript |
| `summarize-tweets.md` | How to summarize a builder's X posts |
| `digest-intro.md` | Overall digest framing and tone |
| `translate.md` | Translation instructions for Chinese output |

**Two ways to edit prompts:**

1. **Through conversation (recommended for most users):** Users tell the agent what they want changed in plain language — "Make summaries shorter," "Focus more on actionable takeaways," "Use a more casual tone." The agent updates the prompt files accordingly.

2. **Direct file editing (for power users):** Users can open and edit the markdown files directly. They're written in plain English, not code.

The agent reads prompt files fresh on each run, so changes take effect immediately with no restart.

## Output Format

Organized by source:

```
AI Builders Digest — [Date]

PODCASTS

Latent Space — [Episode Title]
[Summary + key takeaways]
[Link to episode]

No Priors — [Episode Title]
[Summary + key takeaways]
[Link to episode]

...

X / TWITTER

Andrej Karpathy (@karpathy)
[Summary of substantive posts — skip mundane tweets, retweets, and promotional content]
[Links to individual posts]

Swyx (@swyx)
[Summary of substantive posts]
[Links to individual posts]

...
```

Only sources with new substantive content are included. If a builder hasn't posted anything new (or only posted mundane content), they're omitted from that digest.

**Content quality filtering:** The summarize-tweets prompt explicitly instructs the agent to filter for substantive content — original opinions, insights, product announcements, technical discussions. Skip noise: "great coffee today," retweets without commentary, promotional threads.

**Threads and quote tweets:** The fetcher extracts thread content as connected units (not individual tweets) and includes quote tweet context. The summarization prompt handles these as cohesive pieces.

## Language Support

Three modes, configured during onboarding or changed anytime via conversation:

- **English:** Digest remixed and delivered in English
- **Chinese:** Digest remixed in English first (for accuracy), then translated to Chinese using `prompts/translate.md`
- **Bilingual:** Both versions delivered, English first with Chinese below each section

## User Onboarding Flow

Conversational setup — the agent guides users through everything:

1. **Introduction:** Explains the skill, its philosophy (builders over influencers), and what it delivers
2. **Frequency:** "How often would you like your digest? Daily or weekly? What time works best, and what timezone are you in?"
3. **Language:** "What language do you prefer? English, Chinese, or both side by side?"
4. **API keys:** Step-by-step instructions for obtaining each key:
   - **Supadata:** Go to supadata.ai → Sign up → Dashboard → Copy API key
   - Creates `~/.follow-builders/.env` with labeled placeholder and opens it for the user
5. **Source preview:** Shows the full default list with names and links
6. **Configuration reminder:** "You can change any of these settings anytime by just telling me. Want to add a new builder? Change the language? Adjust how summaries sound? Just say it in plain language."
7. **Cron setup:** Automatically configures the scheduled job based on their chosen frequency/time

## Delivery Mechanism

**OpenClaw users:** The skill outputs the formatted digest. OpenClaw's cron system handles scheduling and channel delivery (Telegram, Discord, WhatsApp, etc.) via the `delivery` config in the cron job.

**Claude Code users:** The skill uses Claude Code's built-in cron to schedule runs. The cron job triggers the skill in an isolated session, which runs the fetcher and outputs the digest. Users can also trigger manually with `/ai`.

### Cron Job Setup Details

**OpenClaw cron configuration:**
```bash
openclaw cron add \
  --name "AI Builders Digest" \
  --cron "0 8 * * *" \
  --tz "America/Los_Angeles" \
  --session isolated \
  --message "Run the follow-builders skill: fetch new content and deliver digest" \
  --announce \
  --channel last
```

The `--channel last` delivers to whatever channel the user most recently messaged from. The agent adjusts the cron expression and timezone based on user preferences.

**Claude Code cron:**
Uses Claude Code's built-in cron tool to schedule the skill. The skill detects which platform it's running on and configures accordingly.

**Offline handling:** If the machine is asleep/off at the scheduled time, OpenClaw's cron persists jobs and runs them on next wake. For Claude Code, the cron system handles missed runs similarly.

### LLM Usage

The agent uses its own built-in LLM for all remixing and translation. No external LLM API key is needed. This means:
- OpenClaw users: remixing uses whatever model their OpenClaw instance is configured with
- Claude Code users: remixing uses Claude (the session's model)

Token usage per digest run is moderate: primarily the summarization of podcast transcripts (which can be long) and tweet batches. Bilingual mode roughly doubles the token cost due to translation.

## File Structure

```
follow-builders/
├── SKILL.md                    # Main skill instructions
├── README.md                   # User-facing documentation
├── config/
│   ├── default-sources.json    # Curated default source list
│   └── config-schema.json      # Config structure reference
├── prompts/
│   ├── summarize-podcast.md    # Podcast remix prompt
│   ├── summarize-tweets.md     # X/Twitter remix prompt
│   ├── digest-intro.md         # Digest framing and tone
│   └── translate.md            # Chinese translation instructions
├── scripts/
│   ├── fetch-content.js        # Node.js content fetcher (Supadata + Rettiwt)
│   └── package.json            # Node dependencies (dotenv, proper-lockfile)
└── examples/
    └── sample-digest.md        # Example output for reference
```

**User local files** (created during onboarding):
```
~/.follow-builders/
├── config.json                 # User preferences
├── state.json                  # Processed content tracker (file-locked)
└── .env                        # API key (SUPADATA_API_KEY)
```

## Platform Compatibility

The skill is structured to work on both platforms:

- **OpenClaw:** Install into `~/skills/follow-builders/`. Publishable to ClawhHub via `clawhub publish`. Uses OpenClaw cron for scheduling and channel adapters for delivery.
- **Claude Code:** Install into `~/.claude/skills/follow-builders/`. Uses Claude Code cron for scheduling. Output in terminal or via `/ai` invocation.
- **GitHub:** Shareable as a standalone repository.

The SKILL.md detects which platform it's running on (by checking for OpenClaw-specific environment variables or tools) and adjusts cron setup and delivery instructions accordingly.

### SKILL.md Frontmatter

```yaml
---
name: follow-builders
description: AI builders digest — monitors top AI builders on X and YouTube podcasts, remixes their content into digestible summaries. Use when the user wants AI industry insights, builder updates, or invokes /ai.
metadata:
  openclaw:
    requires:
      env:
        - SUPADATA_API_KEY
      bins:
        - node
---
```

## Dependencies

- **Node.js** (runtime for fetcher script)
- **Supadata API key** (YouTube transcripts — free tier: 200 credits/month, 1 credit per transcript)
- **Rettiwt-API** (X/Twitter data — free, no API key needed, runs in guest mode)
- No Playwright, browser installation, or paid services required

### Expected API Usage Per Cycle

- **Supadata:** ~5-10 API calls per daily run (channel video list + video metadata + transcript per new video). Well within free tier for daily use.
- **Rettiwt-API:** ~32 user detail lookups + 32 timeline fetches per daily run. Subject to Twitter's internal rate limits; 2-second delay between users keeps requests under the radar.

## Edge Cases & Error Handling

- **Rettiwt-API rate limit:** If Twitter's internal API rate-limits the guest session, the fetcher skips remaining accounts and includes whatever was successfully fetched. Note skipped handles in the digest footer.
- **Supadata rate limit:** Queue requests with small delays. If quota exhausted, include only successfully fetched transcripts and note the limitation.
- **No new content:** If no new content found across all sources, send a brief "No new updates from your builders today" message rather than silence.
- **Partial failures:** Deliver whatever was successfully fetched. Never block the entire digest because one source failed.
- **First run with no state:** Fetch the most recent content from each source (last 1-2 items per source) as a "welcome digest."
- **Concurrent runs:** File locking on state.json prevents corruption if `/ai` trigger and cron overlap.
- **Long pause and resume:** 90-day state retention prevents duplicates even if a user pauses for weeks and comes back.
- **Source count in onboarding:** Dynamic — says "X builders and Y podcasts" based on current defaults + user customizations, not hardcoded numbers.
