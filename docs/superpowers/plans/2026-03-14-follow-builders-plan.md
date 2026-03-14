# Follow Builders, Not Influencers — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dual-platform skill (OpenClaw + Claude Code) that monitors 32 AI builders on X and 5 YouTube podcasts, fetches new content via Rettiwt-API and Supadata APIs, and remixes it into digestible digests delivered through the user's messaging channel.

**Architecture:** Three-layer hybrid — a Node.js fetcher script handles mechanical data retrieval (Supadata for YouTube transcripts, Rettiwt-API for X/Twitter in guest mode, JSON file for state), while the SKILL.md instructs the agent to remix raw content using its own LLM capabilities. Config and prompt files are editable by users through conversation or direct file editing.

**Tech Stack:** Node.js, rettiwt-api (npm), Supadata REST API, dotenv, proper-lockfile

**Spec:** `docs/superpowers/specs/2026-03-14-follow-builders-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `SKILL.md` | Main skill instructions — onboarding, digest delivery, configuration handling |
| `README.md` | User-facing documentation — setup, features, customization guide |
| `config/default-sources.json` | Curated list of 32 X accounts + 5 YouTube channels |
| `config/config-schema.json` | Reference schema for user's config.json |
| `prompts/summarize-podcast.md` | Prompt for remixing podcast transcripts |
| `prompts/summarize-tweets.md` | Prompt for remixing X/Twitter posts |
| `prompts/digest-intro.md` | Prompt for digest framing and tone |
| `prompts/translate.md` | Prompt for English-to-Chinese translation |
| `scripts/fetch-content.js` | Node.js fetcher — Supadata + Rettiwt + state management |
| `scripts/package.json` | Node dependencies |
| `examples/sample-digest.md` | Example digest output |

---

## Chunk 0: Repository Setup

### Task 0: Initialize Git Repository

- [ ] **Step 1: Initialize git repo and create .gitignore**

```bash
cd "/Users/zara/Documents/For Claude/Follow-builders"
git init
```

- [ ] **Step 2: Create .gitignore**

```
scripts/node_modules/
.env
*.log
.DS_Store
```

- [ ] **Step 3: Initial commit**

```bash
git add .gitignore
git commit -m "chore: initialize repository with .gitignore"
```

---

## Chunk 1: Foundation — Config, Prompts, and Sample Output

### Task 1: Create default-sources.json

**Files:**
- Create: `config/default-sources.json`

- [ ] **Step 1: Create the default sources data file**

```json
{
  "podcasts": [
    {
      "name": "Latent Space",
      "type": "youtube_channel",
      "url": "https://www.youtube.com/@LatentSpacePod",
      "channelHandle": "LatentSpacePod"
    },
    {
      "name": "Training Data",
      "type": "youtube_playlist",
      "url": "https://www.youtube.com/playlist?list=PLOhHNjZItNnMm5tdW61JpnyxeYH5NDDx8",
      "playlistId": "PLOhHNjZItNnMm5tdW61JpnyxeYH5NDDx8"
    },
    {
      "name": "Lenny's Podcast",
      "type": "youtube_channel",
      "url": "https://www.youtube.com/@LennysPodcast",
      "channelHandle": "LennysPodcast"
    },
    {
      "name": "No Priors",
      "type": "youtube_channel",
      "url": "https://www.youtube.com/@NoPriorsPodcast",
      "channelHandle": "NoPriorsPodcast"
    },
    {
      "name": "Unsupervised Learning",
      "type": "youtube_channel",
      "url": "https://www.youtube.com/@RedpointAI",
      "channelHandle": "RedpointAI"
    }
  ],
  "x_accounts": [
    { "name": "Andrej Karpathy", "handle": "karpathy" },
    { "name": "Swyx", "handle": "swyx" },
    { "name": "Greg Isenberg", "handle": "gregisenberg" },
    { "name": "Lenny Rachitsky", "handle": "lennysan" },
    { "name": "Josh Woodward", "handle": "joshwoodward" },
    { "name": "Kevin Weil", "handle": "kevinweil" },
    { "name": "Peter Yang", "handle": "petergyang" },
    { "name": "Nan Yu", "handle": "thenanyu" },
    { "name": "Madhu Guru", "handle": "realmadhuguru" },
    { "name": "Mckay Wrigley", "handle": "mckaywrigley" },
    { "name": "Steven Johnson", "handle": "stevenbjohnson" },
    { "name": "Amanda Askell", "handle": "AmandaAskell" },
    { "name": "Cat Wu", "handle": "_catwu" },
    { "name": "Thariq", "handle": "trq212" },
    { "name": "Google Labs", "handle": "GoogleLabs" },
    { "name": "George Mack", "handle": "george__mack" },
    { "name": "Raiza Martin", "handle": "raizamrtn" },
    { "name": "Amjad Masad", "handle": "amasad" },
    { "name": "Guillermo Rauch", "handle": "rauchg" },
    { "name": "Riley Brown", "handle": "rileybrown" },
    { "name": "Alex Albert", "handle": "alexalbert__" },
    { "name": "Hamel Husain", "handle": "HamelHusain" },
    { "name": "Aaron Levie", "handle": "levie" },
    { "name": "Ryo Lu", "handle": "ryolu_" },
    { "name": "Garry Tan", "handle": "garrytan" },
    { "name": "Lulu Cheng Meservey", "handle": "lulumeservey" },
    { "name": "Justine Moore", "handle": "venturetwins" },
    { "name": "Matt Turck", "handle": "mattturck" },
    { "name": "Julie Zhuo", "handle": "joulee" },
    { "name": "Gabriel Peters", "handle": "GabrielPeterss4" },
    { "name": "PJ Ace", "handle": "PJaccetturo" },
    { "name": "Zara Zhang", "handle": "zarazhangrui" }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add config/default-sources.json
git commit -m "feat: add curated default sources — 32 X accounts + 5 YouTube podcasts"
```

---

### Task 2: Create config-schema.json

**Files:**
- Create: `config/config-schema.json`

- [ ] **Step 1: Create the config schema reference**

This file documents the shape of the user's `~/.follow-builders/config.json` so the agent knows how to read/write it.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "description": "User configuration for Follow Builders skill. Stored at ~/.follow-builders/config.json",
  "type": "object",
  "properties": {
    "language": {
      "type": "string",
      "enum": ["en", "zh", "bilingual"],
      "default": "en",
      "description": "Digest language: en (English), zh (Chinese), bilingual (both)"
    },
    "timezone": {
      "type": "string",
      "default": "America/Los_Angeles",
      "description": "IANA timezone string for scheduling (e.g. America/New_York, Asia/Shanghai)"
    },
    "frequency": {
      "type": "string",
      "enum": ["daily", "weekly"],
      "default": "daily",
      "description": "How often to deliver the digest"
    },
    "deliveryTime": {
      "type": "string",
      "default": "08:00",
      "description": "Time of day to deliver digest in HH:MM format (24-hour)"
    },
    "weeklyDay": {
      "type": "string",
      "enum": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      "default": "monday",
      "description": "Day of week for weekly digests (only used when frequency is weekly)"
    },
    "sources": {
      "type": "object",
      "properties": {
        "addedPodcasts": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "type": { "type": "string", "enum": ["youtube_channel", "youtube_playlist"] },
              "url": { "type": "string" },
              "channelHandle": { "type": "string" },
              "playlistId": { "type": "string" }
            }
          },
          "default": [],
          "description": "Podcasts the user has added on top of defaults"
        },
        "removedPodcasts": {
          "type": "array",
          "items": { "type": "string" },
          "default": [],
          "description": "Names of default podcasts the user has removed"
        },
        "addedXAccounts": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "handle": { "type": "string" }
            }
          },
          "default": [],
          "description": "X accounts the user has added on top of defaults"
        },
        "removedXAccounts": {
          "type": "array",
          "items": { "type": "string" },
          "default": [],
          "description": "Handles of default X accounts the user has removed"
        }
      }
    },
    "onboardingComplete": {
      "type": "boolean",
      "default": false,
      "description": "Whether the user has completed initial setup"
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add config/config-schema.json
git commit -m "feat: add config schema reference for user preferences"
```

---

### Task 3: Create prompt files

**Files:**
- Create: `prompts/summarize-podcast.md`
- Create: `prompts/summarize-tweets.md`
- Create: `prompts/digest-intro.md`
- Create: `prompts/translate.md`

- [ ] **Step 1: Create summarize-podcast.md**

```markdown
# Podcast Summary Prompt

You are summarizing a podcast episode transcript for a busy professional who wants
the key insights without watching the full episode.

## Instructions

- Write a summary of 200-400 words
- Start with a one-sentence "bottom line" — what's the single most important takeaway?
- Then list 3-5 key insights as bullet points, each 1-2 sentences
- If the guest makes a bold or contrarian claim, highlight it
- If specific tools, frameworks, or products are mentioned, name them
- Include timestamps for the most important moments (if available)
- Keep the tone sharp and conversational — like a smart friend briefing you
- Do NOT include filler like "In this episode..." or "The host and guest discussed..."
- Jump straight into the substance
```

- [ ] **Step 2: Create summarize-tweets.md**

```markdown
# X/Twitter Summary Prompt

You are summarizing recent posts from an AI builder for a busy professional who wants
to know what this person is thinking and building.

## Instructions

- Only include substantive content: original opinions, insights, product announcements,
  technical discussions, industry analysis, or lessons learned
- SKIP: mundane personal tweets, retweets without commentary, promotional content,
  "great event!" type posts, engagement bait
- For threads: summarize the full thread as one cohesive piece, not individual tweets
- For quote tweets: include the context of what they're responding to
- Write 2-4 sentences per builder summarizing their key points
- If they made a bold prediction or shared a contrarian take, lead with that
- If they shared a tool, demo, or resource, mention it by name with the link
- If there's nothing substantive to report, say "No notable posts" rather than
  padding with fluff
```

- [ ] **Step 3: Create digest-intro.md**

```markdown
# Digest Intro Prompt

You are assembling the final digest from individual source summaries.

## Format

Start with this header (replace [Date] with today's date):

AI Builders Digest — [Date]

Then organize content in this order:

1. PODCASTS section — list each podcast with new episodes
2. X / TWITTER section — list each builder with new posts

## Rules

- Only include sources that have new content
- Skip any source with nothing new
- Under each source, paste the individual summary you generated
- After each summary, include the original link(s)
- At the very end, add a line: "Reply to adjust your settings, sources, or summary style."
- Keep formatting clean and scannable — this will be read on a phone screen
```

- [ ] **Step 4: Create translate.md**

```markdown
# Translation Prompt

You are translating an AI industry digest from English to Chinese.

## Instructions

- Translate the full digest into natural, fluent Mandarin Chinese (simplified characters)
- Keep technical terms in English where Chinese professionals typically use them:
  AI, LLM, GPU, API, fine-tuning, RAG, token, prompt, agent, transformer, etc.
- Keep all proper nouns in English: names of people, companies, products, tools
- Keep all URLs unchanged
- Maintain the same structure and formatting as the English version
- The tone should be professional but conversational — 像是一位懂行的朋友在跟你聊天
- For bilingual mode: place the Chinese translation directly below each English section,
  separated by a blank line
```

- [ ] **Step 5: Commit**

```bash
git add prompts/
git commit -m "feat: add editable prompt files for podcast/tweet summarization, digest framing, and translation"
```

---

### Task 4: Create sample digest

**Files:**
- Create: `examples/sample-digest.md`

- [ ] **Step 1: Create sample-digest.md**

Write a realistic example digest showing what the output looks like, with 2 podcast entries and 3 X builder entries. Use realistic but fictional content so users understand the format.

```markdown
# Sample Digest Output

This is an example of what your AI Builders Digest looks like.

---

AI Builders Digest — March 14, 2026

PODCASTS

Latent Space — "Why Agents Keep Failing (And How to Fix Them)"
Bottom line: Most agent failures aren't intelligence failures — they're tool-use failures.
The system can reason fine, it just can't reliably call the right API at the right time.

Key insights:
- Tool selection accuracy drops from 95% to 60% when agents have more than 15 tools
  available. The fix isn't smarter models — it's better tool curation per task.
- "Eval-driven development" is replacing vibe-driven prompt iteration at serious
  AI companies. If you're not measuring, you're guessing.
- The hosts predict 2026 is the year agent frameworks consolidate from 50+ to 3-4
  winners. Their bet: OpenAI Agents SDK, Claude Code, and LangGraph.
https://youtube.com/watch?v=example123

No Priors — "Scaling Laws Are Dead, Long Live Scaling Laws" (with Ilya Sutskever)
Bottom line: Pre-training scaling laws have hit diminishing returns, but post-training
and inference-time compute scaling are just getting started.

Key insights:
- Ilya argues the next 10x improvement comes from models that can "think longer"
  at inference time, not from bigger pre-training runs.
- Synthetic data quality matters more than quantity. "One perfect textbook is worth
  a million Reddit comments."
- He's surprisingly bullish on open-source: "The gap will narrow to months, not years."
https://youtube.com/watch?v=example456


X / TWITTER

Andrej Karpathy (@karpathy)
Shared a deep thread on why he thinks "Software 3.0" (natural language programming)
will make traditional coding a niche skill within 5 years. Key argument: the compile
target is changing from machine code to LLM prompts. Sparked massive debate.
Also released a new Eureka Labs tutorial on building a code interpreter from scratch.
https://x.com/karpathy/status/example1
https://x.com/karpathy/status/example2

Guillermo Rauch (@rauchg)
Announced Vercel's new "v0 Teams" — collaborative AI prototyping where multiple
people can prompt and iterate on the same UI simultaneously. Called it "Google Docs
for vibe coding." Ships next week.
https://x.com/rauchg/status/example3

Amanda Askell (@AmandaAskell)
Published a nuanced take on AI safety benchmarks: "We're measuring what's easy to
measure, not what matters. Capability evals tell you what the model CAN do.
Alignment evals should tell you what it WILL do unprompted." Linked to a new
Anthropic research paper on behavioral evaluations.
https://x.com/AmandaAskell/status/example4

Reply to adjust your settings, sources, or summary style.
```

- [ ] **Step 2: Commit**

```bash
git add examples/sample-digest.md
git commit -m "feat: add sample digest showing expected output format"
```

---

## Chunk 2: Fetcher Script

### Task 5: Create package.json and install dependencies

**Files:**
- Create: `scripts/package.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "follow-builders-fetcher",
  "version": "1.0.0",
  "description": "Content fetcher for Follow Builders skill — Supadata + Rettiwt",
  "type": "module",
  "scripts": {
    "fetch": "node fetch-content.js",
    "test": "node --test test-fetch.js"
  },
  "dependencies": {
    "rettiwt-api": "^6.0.0",
    "dotenv": "^16.4.0",
    "proper-lockfile": "^4.1.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd scripts && npm install
```

- [ ] **Step 3: Add node_modules to .gitignore**

Create a root `.gitignore`:
```
scripts/node_modules/
.env
```

- [ ] **Step 4: Commit**

```bash
git add scripts/package.json scripts/package-lock.json .gitignore
git commit -m "feat: add fetcher script dependencies — rettiwt-api, dotenv, proper-lockfile"
```

---

### Task 6: Build fetch-content.js

**Files:**
- Create: `scripts/fetch-content.js`

This is the largest single file. It has four sections: config loading, YouTube fetching, X/Twitter fetching, and state management.

- [ ] **Step 1: Create fetch-content.js with config loading and state management**

```javascript
#!/usr/bin/env node

// ============================================================================
// Follow Builders — Content Fetcher
// ============================================================================
// This script fetches new content from YouTube podcasts (via Supadata API) and
// X/Twitter accounts (via Rettiwt-API). It tracks what's already been processed in a
// state file so you never get duplicate content in your digest.
//
// Usage: node fetch-content.js [--lookback-hours 24]
// Output: JSON to stdout with all new content, organized by source
// ============================================================================

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { config as loadEnv } from 'dotenv';
import lockfile from 'proper-lockfile';
import { Rettiwt } from 'rettiwt-api';

// -- Constants ---------------------------------------------------------------

// Where user config and state live
const USER_DIR = join(homedir(), '.follow-builders');
const CONFIG_PATH = join(USER_DIR, 'config.json');
const STATE_PATH = join(USER_DIR, 'state.json');
const ENV_PATH = join(USER_DIR, '.env');

// How far back to look for new content (overridable via --lookback-hours flag)
const DEFAULT_LOOKBACK_HOURS = 24;

// How many days of state to keep before pruning old entries
const STATE_RETENTION_DAYS = 90;

// Supadata API base URL
const SUPADATA_BASE = 'https://api.supadata.ai/v1';

// -- Config Loading ----------------------------------------------------------

// Loads the user's config.json and merges it with default sources.
// The merge logic: start with all defaults, then add user additions and
// remove user removals. This way users can customize without losing defaults.
async function loadConfig() {
  // Load the default sources that ship with the skill
  const scriptDir = new URL('.', import.meta.url).pathname;
  const defaultSourcesPath = join(scriptDir, '..', 'config', 'default-sources.json');
  const defaultSources = JSON.parse(await readFile(defaultSourcesPath, 'utf-8'));

  // Load user config (may not exist yet on first run)
  let userConfig = {};
  if (existsSync(CONFIG_PATH)) {
    userConfig = JSON.parse(await readFile(CONFIG_PATH, 'utf-8'));
  }

  // Merge sources: defaults + user additions - user removals
  const sources = userConfig.sources || {};
  const podcasts = [
    ...defaultSources.podcasts.filter(
      p => !(sources.removedPodcasts || []).includes(p.name)
    ),
    ...(sources.addedPodcasts || [])
  ];
  const xAccounts = [
    ...defaultSources.x_accounts.filter(
      a => !(sources.removedXAccounts || []).includes(a.handle)
    ),
    ...(sources.addedXAccounts || [])
  ];

  return {
    language: userConfig.language || 'en',
    timezone: userConfig.timezone || 'America/Los_Angeles',
    frequency: userConfig.frequency || 'daily',
    podcasts,
    xAccounts
  };
}

// -- State Management --------------------------------------------------------

// The state file tracks which videos and tweets we've already processed.
// It uses file locking to prevent corruption if two runs overlap
// (e.g., a manual /ai trigger while a cron job is running).

async function loadState() {
  if (!existsSync(STATE_PATH)) {
    return { processedVideos: {}, processedTweets: {}, lastUpdated: null };
  }
  return JSON.parse(await readFile(STATE_PATH, 'utf-8'));
}

async function saveState(state) {
  // Prune entries older than 90 days to prevent the file from growing forever
  const cutoff = Date.now() - (STATE_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  for (const [id, timestamp] of Object.entries(state.processedVideos)) {
    if (timestamp < cutoff) delete state.processedVideos[id];
  }
  for (const [id, timestamp] of Object.entries(state.processedTweets)) {
    if (timestamp < cutoff) delete state.processedTweets[id];
  }

  state.lastUpdated = Date.now();
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2));
}

// -- YouTube Fetching (Supadata API) -----------------------------------------

// Fetches recent videos from a YouTube channel or playlist, then grabs
// transcripts for any we haven't seen before. Supadata charges 1 credit
// per transcript, so we only fetch what's new.
//
// Supadata API endpoints:
//   GET /v1/youtube/channel/videos?id=<handle>&type=video — returns { video_ids: [] }
//   GET /v1/youtube/playlist/videos?id=<playlistId>       — returns { video_ids: [] }
//   GET /v1/youtube/transcript?url=<videoId>&text=true     — returns { content, lang, availableLangs }
//   GET /v1/youtube/video?id=<videoId>                     — returns video metadata (title, etc.)

async function fetchYouTubeContent(podcasts, state, apiKey, isFirstRun) {
  const results = [];

  for (const podcast of podcasts) {
    try {
      // Step 1: Get recent video IDs from this channel or playlist
      // The endpoint returns just an array of video ID strings, not full objects
      let videosUrl;
      if (podcast.type === 'youtube_playlist') {
        videosUrl = `${SUPADATA_BASE}/youtube/playlist/videos?id=${podcast.playlistId}`;
      } else {
        videosUrl = `${SUPADATA_BASE}/youtube/channel/videos?id=${podcast.channelHandle}&type=video`;
      }

      const videosRes = await fetch(videosUrl, {
        headers: { 'x-api-key': apiKey }
      });

      if (!videosRes.ok) {
        console.error(`[YouTube] Failed to fetch videos for ${podcast.name}: ${videosRes.status}`);
        continue;
      }

      const videosData = await videosRes.json();
      const videoIds = videosData.video_ids || [];

      // Step 2: Filter to videos we haven't processed yet
      const newVideoIds = videoIds.filter(id => !state.processedVideos[id]);

      if (newVideoIds.length === 0) continue;

      // Step 3: Limit how many we process per run
      // On first run (welcome digest), only grab the 1-2 most recent
      // On regular runs, process up to 3 new videos per channel
      const limit = isFirstRun ? 2 : 3;
      const videosToProcess = newVideoIds.slice(0, limit);

      // Step 4: For each new video, get metadata (title) and transcript
      for (const videoId of videosToProcess) {
        try {
          // Get video metadata (title, author, publish date)
          const metaRes = await fetch(
            `${SUPADATA_BASE}/youtube/video?id=${videoId}`,
            { headers: { 'x-api-key': apiKey } }
          );
          let title = 'Untitled';
          let publishedAt = null;
          if (metaRes.ok) {
            const metaData = await metaRes.json();
            title = metaData.title || 'Untitled';
            publishedAt = metaData.publishedAt || metaData.date || null;
          }

          // Get the transcript as plain text
          const transcriptRes = await fetch(
            `${SUPADATA_BASE}/youtube/transcript?url=${videoId}&text=true`,
            { headers: { 'x-api-key': apiKey } }
          );

          if (!transcriptRes.ok) {
            console.error(`[YouTube] Failed to fetch transcript for ${videoId}: ${transcriptRes.status}`);
            continue;
          }

          const transcriptData = await transcriptRes.json();

          results.push({
            source: 'podcast',
            name: podcast.name,
            title,
            videoId,
            url: `https://youtube.com/watch?v=${videoId}`,
            publishedAt,
            transcript: transcriptData.content || '',
            language: transcriptData.lang || 'en'
          });

          // Mark as processed
          state.processedVideos[videoId] = Date.now();

          // Small delay between API calls to be respectful
          await new Promise(r => setTimeout(r, 500));
        } catch (err) {
          console.error(`[YouTube] Error fetching transcript for ${videoId}:`, err.message);
        }
      }
    } catch (err) {
      console.error(`[YouTube] Error processing ${podcast.name}:`, err.message);
    }
  }

  return results;
}

// -- X/Twitter Fetching (Rettiwt-API) ----------------------------------------

// Uses Rettiwt-API in guest mode to fetch recent tweets from each builder.
// Guest mode means NO login required and NO risk of account bans.
// It accesses Twitter's internal API the same way a logged-out browser does.
//
// How it works:
//   1. Get user's numeric ID via rettiwt.user.details(handle)
//   2. Fetch their timeline via rettiwt.user.timeline(userId, count)
//   3. Filter to tweets within our lookback window
//
// Rate limiting: Twitter's internal API has dynamic rate limits.
// We add delays between requests to stay under the radar.

async function fetchXContent(xAccounts, state, lookbackHours, isFirstRun) {
  const results = [];
  const cutoffDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

  // Create a Rettiwt instance in guest mode — no API key, no login
  const rettiwt = new Rettiwt();

  for (const account of xAccounts) {
    try {
      // Step 1: Get the user's numeric ID (required for timeline fetch)
      const userDetails = await rettiwt.user.details(account.handle);
      if (!userDetails || !userDetails.id) {
        console.error(`[X] Could not find user @${account.handle}`);
        continue;
      }

      // Step 2: Fetch their recent tweets (20 max per request)
      // On first run, only grab 5 tweets per user for the welcome digest
      const count = isFirstRun ? 5 : 20;
      const timeline = await rettiwt.user.timeline(userDetails.id, count);

      if (!timeline || !timeline.list || timeline.list.length === 0) {
        continue;
      }

      // Step 3: Filter tweets — only new ones within our lookback window
      const newTweets = [];
      for (const tweet of timeline.list) {
        const tweetId = tweet.id;
        if (!tweetId) continue;

        // Skip already-processed tweets
        if (state.processedTweets[tweetId]) continue;

        // Skip tweets older than our lookback window
        const tweetDate = new Date(tweet.createdAt);
        if (tweetDate < cutoffDate) continue;

        newTweets.push({
          id: tweetId,
          text: tweet.fullText || '',
          createdAt: tweet.createdAt,
          url: `https://x.com/${account.handle}/status/${tweetId}`,
          likes: tweet.likeCount || 0,
          retweets: tweet.retweetCount || 0,
          replies: tweet.replyCount || 0,
          // Include quoted tweet text if this is a quote tweet
          quotedTweet: tweet.quoted ? {
            text: tweet.quoted.fullText || '',
            author: tweet.quoted.tweetBy?.userName || ''
          } : null,
          // Include media URLs if present
          media: tweet.media ? tweet.media.map(m => m.url) : []
        });

        // Mark as processed
        state.processedTweets[tweetId] = Date.now();
      }

      if (newTweets.length === 0) continue;

      results.push({
        source: 'x',
        name: account.name,
        handle: account.handle,
        tweets: newTweets.sort((a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
        )
      });

      // Small delay between users to respect rate limits
      // Twitter's internal API has dynamic limits, so we're cautious
      await new Promise(r => setTimeout(r, 2000));

    } catch (err) {
      console.error(`[X] Error fetching @${account.handle}:`, err.message);
      // Continue to next account — partial results are better than none
    }
  }

  return results;
}

// -- Main --------------------------------------------------------------------

async function main() {
  // Parse command-line args
  const args = process.argv.slice(2);
  const lookbackIdx = args.indexOf('--lookback-hours');
  const lookbackHours = lookbackIdx !== -1
    ? parseInt(args[lookbackIdx + 1], 10)
    : DEFAULT_LOOKBACK_HOURS;

  // Ensure user directory exists
  if (!existsSync(USER_DIR)) {
    await mkdir(USER_DIR, { recursive: true });
  }

  // Load environment variables from user's .env file
  loadEnv({ path: ENV_PATH });

  const supadataKey = process.env.SUPADATA_API_KEY;

  if (!supadataKey) {
    console.error(JSON.stringify({
      error: 'SUPADATA_API_KEY not found',
      message: 'Please add your Supadata API key to ~/.follow-builders/.env'
    }));
    process.exit(1);
  }

  // Load config and state
  const config = await loadConfig();

  // Acquire lock on state file to prevent concurrent corruption
  let releaseLock;
  try {
    // Create state file if it doesn't exist (lockfile needs the file to exist)
    if (!existsSync(STATE_PATH)) {
      await writeFile(STATE_PATH, JSON.stringify({
        processedVideos: {},
        processedTweets: {},
        lastUpdated: null
      }, null, 2));
    }
    releaseLock = await lockfile.lock(STATE_PATH, { retries: 3 });
  } catch (err) {
    console.error(JSON.stringify({
      error: 'STATE_LOCKED',
      message: 'Another fetch is already running. Try again in a few minutes.'
    }));
    process.exit(1);
  }

  try {
    const state = await loadState();

    // Detect first run (welcome digest) — if we've never processed anything
    const isFirstRun = !state.lastUpdated;

    // Fetch content from both sources
    // Note: we run these sequentially rather than in parallel to avoid
    // state mutation issues — both functions write to the same state object
    const podcastContent = await fetchYouTubeContent(
      config.podcasts, state, supadataKey, isFirstRun
    );
    const xContent = await fetchXContent(
      config.xAccounts, state, lookbackHours, isFirstRun
    );

    // Save updated state (with new processed IDs)
    await saveState(state);

    // Output the combined results as JSON to stdout
    // The agent will read this and remix it into a digest
    const output = {
      fetchedAt: new Date().toISOString(),
      lookbackHours,
      podcasts: podcastContent,
      x: xContent,
      stats: {
        newPodcastEpisodes: podcastContent.length,
        newXBuilders: xContent.length,
        totalNewTweets: xContent.reduce((sum, a) => sum + a.tweets.length, 0)
      }
    };

    console.log(JSON.stringify(output, null, 2));
  } finally {
    // Always release the lock, even if something went wrong
    if (releaseLock) await releaseLock();
  }
}

main().catch(err => {
  console.error(JSON.stringify({
    error: 'FETCH_FAILED',
    message: err.message
  }));
  process.exit(1);
});
```

- [ ] **Step 2: Make the script executable**

```bash
chmod +x scripts/fetch-content.js
```

- [ ] **Step 3: Test the script locally**

Create a test `.env` file (you'll need a real API key for a full test):
```bash
mkdir -p ~/.follow-builders
cat > ~/.follow-builders/.env << 'EOF'
# Get your Supadata API key at https://supadata.ai (sign up -> dashboard -> API key)
SUPADATA_API_KEY=your_supadata_key_here
EOF
```

Run a dry test (will fail with placeholder key, but verifies the script loads correctly):
```bash
cd scripts && node fetch-content.js 2>&1 || true
```

Expected: Error about invalid API key (not a crash or syntax error). X/Twitter fetching should work without any keys.

- [ ] **Step 4: Commit**

```bash
git add scripts/fetch-content.js
git commit -m "feat: add content fetcher script — Supadata for YouTube, Rettiwt for X/Twitter"
```

---

## Chunk 3: SKILL.md — The Brain

### Task 7: Create SKILL.md

**Files:**
- Create: `SKILL.md`

This is the main skill file that the agent reads. It's long because it covers three workflows (onboarding, digest delivery, configuration) and needs to be explicit enough for the agent to follow without human guidance.

- [ ] **Step 1: Create SKILL.md**

```markdown
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

# Follow Builders, Not Influencers

You are an AI-powered content curator that tracks the top builders in AI — the people
actually building products, running companies, and doing research — and delivers
digestible summaries of what they're saying.

Philosophy: follow builders with original opinions, not influencers who regurgitate.

## Detecting Platform

Before doing anything, figure out which platform you're running on:
- **OpenClaw:** Check if `openclaw` CLI is available or if OpenClaw environment variables exist
- **Claude Code:** You're running in Claude Code if you have access to Claude Code tools

This affects how you set up cron jobs and deliver content.

## First Run — Onboarding

Check if `~/.follow-builders/config.json` exists and has `onboardingComplete: true`.
If NOT, run the onboarding flow:

### Step 1: Introduction

Tell the user:

"I'm your AI Builders Digest. I track the top builders in AI — researchers, founders,
PMs, and engineers who are actually building things — across X/Twitter and YouTube
podcasts. Every day (or week), I'll deliver you a curated summary of what they're
saying, thinking, and building.

I currently track [N] builders on X and [M] podcasts. You can customize the list
anytime by just telling me."

(Replace [N] and [M] with actual counts from default-sources.json)

### Step 2: Delivery Preferences

Ask: "How often would you like your digest?"
- Daily (recommended)
- Weekly

Then ask: "What time works best? And what timezone are you in?"
(Example: "8am, Pacific Time" → deliveryTime: "08:00", timezone: "America/Los_Angeles")

For weekly, also ask which day.

### Step 3: Language

Ask: "What language do you prefer for your digest?"
- English
- Chinese (translated from English sources)
- Bilingual (both English and Chinese, side by side)

### Step 4: API Keys

Tell the user you need one free API key, then guide them step by step:

"I need one API key to fetch YouTube podcast transcripts. X/Twitter posts are
fetched for free with no API key needed.

**Supadata (for YouTube podcast transcripts)**
- Go to https://supadata.ai
- Click 'Get Started' or 'Sign Up'
- Create an account (you can use Google sign-in)
- Once logged in, go to your Dashboard
- You'll see your API key on the main page — copy it

The free tier gives you 200 credits per month — more than enough for daily digests."

Then create the .env file with placeholders:

```bash
mkdir -p ~/.follow-builders
cat > ~/.follow-builders/.env << 'ENVEOF'
# Supadata API key (for YouTube transcripts)
# Get yours at: https://supadata.ai
SUPADATA_API_KEY=paste_your_key_here
ENVEOF
```

Open the file for the user to paste their keys. Wait for them to confirm they've added the keys.

### Step 5: Show Sources

Show the full list of default builders and podcasts being tracked.
Read from `config/default-sources.json` and display as a clean list.

Tell the user: "You can add or remove sources anytime — just tell me in plain
language. For example: 'Add @username to my list' or 'Remove Lenny's Podcast'."

### Step 6: Configuration Reminder

"All your settings can be changed anytime through conversation:
- 'Switch to weekly digests'
- 'Change my timezone to Eastern'
- 'Add @someone to my follow list'
- 'Make the summaries shorter'
- 'Show me my current settings'

No need to edit any files — just tell me what you want."

### Step 7: Set Up Cron

Save the config:
```bash
cat > ~/.follow-builders/config.json << 'CFGEOF'
{
  "language": "<chosen language>",
  "timezone": "<chosen timezone>",
  "frequency": "<daily or weekly>",
  "deliveryTime": "<chosen time>",
  "weeklyDay": "<if weekly, chosen day>",
  "sources": {
    "addedPodcasts": [],
    "removedPodcasts": [],
    "addedXAccounts": [],
    "removedXAccounts": []
  },
  "onboardingComplete": true
}
CFGEOF
```

Then set up the cron job:

**For OpenClaw:**
```bash
openclaw cron add \
  --name "AI Builders Digest" \
  --cron "<cron expression based on frequency/time>" \
  --tz "<user timezone>" \
  --session isolated \
  --message "Run the follow-builders skill to fetch and deliver today's AI builders digest" \
  --announce \
  --channel last
```

**For Claude Code:**
Use the CronCreate tool to schedule the digest at the user's preferred time.

### Step 8: Welcome Digest

After setup, run an immediate fetch to deliver a "welcome digest" with the most
recent content. This lets the user see what the digest looks like right away.

---

## Content Delivery — Digest Run

This workflow runs on cron schedule or when the user invokes `/ai`.

### Step 1: Load Config

Read `~/.follow-builders/config.json` for user preferences.

### Step 2: Fetch Content

Run the fetcher script:
```bash
cd ${CLAUDE_SKILL_DIR}/scripts && node fetch-content.js
```

For weekly mode, use a longer lookback:
```bash
cd ${CLAUDE_SKILL_DIR}/scripts && node fetch-content.js --lookback-hours 168
```

Parse the JSON output. If the output contains an error, report it to the user
and suggest checking their API keys.

### Step 3: Check for Content

Look at the `stats` field in the fetcher output:
- If `newPodcastEpisodes` is 0 AND `newXBuilders` is 0, tell the user:
  "No new updates from your builders today. Check back tomorrow!"
  Then stop.
- Otherwise, proceed to remix.

### Step 4: Remix Content

Read the prompt files fresh from `${CLAUDE_SKILL_DIR}/prompts/`:
- `digest-intro.md` for overall framing
- `summarize-podcast.md` for each podcast episode
- `summarize-tweets.md` for each builder's tweets

For each podcast episode in the fetcher output:
1. Take the transcript text
2. Apply the summarize-podcast prompt
3. Generate a summary

For each X builder in the fetcher output:
1. Take their tweets array
2. Apply the summarize-tweets prompt
3. Generate a summary (or "No notable posts" if nothing substantive)

Then assemble the full digest using the digest-intro prompt.

### Step 5: Apply Language

Read `config.json` for the language preference:
- **en:** Output the English digest as-is
- **zh:** Read `${CLAUDE_SKILL_DIR}/prompts/translate.md`, then translate the
  full digest to Chinese
- **bilingual:** Output each section in English, followed immediately by
  the Chinese translation of that section

### Step 6: Deliver

Output the formatted digest. The platform handles delivery:
- OpenClaw routes it to the user's messaging channel
- Claude Code displays it in the terminal

---

## Configuration Handling

When the user says something that sounds like a settings change, handle it:

### Source Changes
- "Add @handle" or "Follow @handle" → Add to `sources.addedXAccounts` in config.json
- "Remove @handle" or "Unfollow @handle" → Add handle to `sources.removedXAccounts`
- "Add [podcast name/URL]" → Add to `sources.addedPodcasts` (ask for YouTube URL if not provided)
- "Remove [podcast name]" → Add name to `sources.removedPodcasts`

### Schedule Changes
- "Switch to weekly/daily" → Update `frequency` in config.json
- "Change time to X" → Update `deliveryTime` in config.json
- "Change timezone to X" → Update `timezone` in config.json, also update the cron job

### Language Changes
- "Switch to Chinese/English/bilingual" → Update `language` in config.json

### Prompt Changes
- "Make summaries shorter/longer" → Edit the relevant prompt file
- "Focus more on [X]" → Edit the relevant prompt file
- "Change the tone to [X]" → Edit the relevant prompt file

### Info Requests
- "Show my settings" → Read and display config.json in a friendly format
- "Show my sources" / "Who am I following?" → Read config + defaults and list all active sources
- "Show my prompts" → Read and display the prompt files

After any configuration change, confirm what you changed.

---

## Manual Trigger

When the user invokes `/ai` or asks for their digest manually:
1. Skip cron check — run the digest workflow immediately
2. Use the same fetch → remix → deliver flow as the cron run
3. Tell the user you're fetching fresh content (it takes a minute or two)
```

- [ ] **Step 2: Commit**

```bash
git add SKILL.md
git commit -m "feat: add main SKILL.md — onboarding, digest delivery, and config handling"
```

---

## Chunk 4: README and Final Polish

### Task 8: Create README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README.md**

```markdown
# Follow Builders, Not Influencers

An AI-powered digest that tracks the top builders in AI — researchers, founders, PMs,
and engineers who are actually building things — and delivers curated summaries of
what they're saying.

**Philosophy:** Follow people who build products and have original opinions, not
influencers who regurgitate information.

## What You Get

A daily or weekly digest delivered to your preferred messaging app (Telegram, Discord,
WhatsApp, etc.) with:

- Summaries of new podcast episodes from top AI podcasts
- Key posts and insights from 32 curated AI builders on X/Twitter
- Links to all original content
- Available in English, Chinese, or bilingual

## Quick Start

1. Install the skill in your agent (OpenClaw or Claude Code)
2. Say "set up follow builders" or invoke `/follow-builders`
3. The agent walks you through setup conversationally — no config files to edit

The agent will ask you:
- How often you want your digest (daily or weekly) and what time
- What language you prefer
- Then guide you through getting two free API keys (takes ~2 minutes)

That's it. Your first digest arrives immediately after setup.

## Changing Settings

Everything is configurable through conversation. Just tell your agent:

- "Add @username to my follow list"
- "Remove Lenny's Podcast"
- "Switch to weekly digests on Monday mornings"
- "Change language to Chinese"
- "Make the summaries shorter"
- "Show me my current settings"

No files to edit, no commands to remember.

## Customizing the Summaries

The skill uses plain-English prompt files to control how content is summarized.
You can customize them two ways:

**Through conversation (recommended):**
Tell your agent what you want — "Make summaries more concise," "Focus on actionable
insights," "Use a more casual tone." The agent updates the prompts for you.

**Direct editing (power users):**
Edit the files in the `prompts/` folder:
- `summarize-podcast.md` — how podcast episodes are summarized
- `summarize-tweets.md` — how X/Twitter posts are summarized
- `digest-intro.md` — the overall digest format and tone
- `translate.md` — how English content is translated to Chinese

These are plain English instructions, not code. Changes take effect on the next digest.

## Default Sources

### Podcasts (5)
- Latent Space
- Training Data
- Lenny's Podcast
- No Priors
- Unsupervised Learning

### AI Builders on X (32)
Andrej Karpathy, Swyx, Greg Isenberg, Lenny Rachitsky, Josh Woodward, Kevin Weil,
Peter Yang, Nan Yu, Madhu Guru, Mckay Wrigley, Steven Johnson, Amanda Askell,
Cat Wu, Thariq, Google Labs, George Mack, Raiza Martin, Amjad Masad, Guillermo Rauch,
Riley Brown, Alex Albert, Hamel Husain, Aaron Levie, Ryo Lu, Garry Tan,
Lulu Cheng Meservey, Justine Moore, Matt Turck, Julie Zhuo, Gabriel Peters, PJ Ace,
Zara Zhang

## Installation

### OpenClaw
```bash
# From ClawhHub
clawhub install follow-builders

# Or manually
git clone https://github.com/your-username/follow-builders.git ~/skills/follow-builders
cd ~/skills/follow-builders/scripts && npm install
```

### Claude Code
```bash
git clone https://github.com/your-username/follow-builders.git ~/.claude/skills/follow-builders
cd ~/.claude/skills/follow-builders/scripts && npm install
```

## Requirements

- Node.js (v18+)
- Supadata API key (free tier — [sign up](https://supadata.ai))

That's it. X/Twitter posts are fetched for free using Rettiwt-API in guest mode —
no API key, no login, no risk to your account.

## How It Works

1. A scheduled cron job triggers the skill at your chosen time
2. A Node.js script fetches new content:
   - YouTube podcast transcripts via Supadata API
   - X/Twitter posts via Rettiwt-API (guest mode — no login needed)
3. The AI agent remixes the raw content into a digestible summary
4. The digest is delivered to your messaging app

See [examples/sample-digest.md](examples/sample-digest.md) for what the output looks like.

## Privacy

- Your API key is stored locally in `~/.follow-builders/.env` — only sent to Supadata
  for YouTube transcripts. X/Twitter data is fetched without any API key.
- The skill only reads public content (public YouTube videos, public X posts)
- Your configuration and reading history stay on your machine

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "feat: add README with setup guide, customization docs, and source list"
```

---

### Task 9: Initialize Git Repository and Final Commit

**Files:**
- All files

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/zara/Documents/For\ Claude/Follow-builders
git init
```

- [ ] **Step 2: Create .gitignore**

```
scripts/node_modules/
.env
*.log
.DS_Store
```

- [ ] **Step 3: Stage and commit everything**

```bash
git add -A
git commit -m "feat: initial release — Follow Builders, Not Influencers skill

AI-powered digest that monitors 32 AI builders on X/Twitter and 5 YouTube
podcasts, remixes their content into digestible summaries, and delivers
via OpenClaw or Claude Code.

Features:
- Conversational onboarding and configuration
- Editable prompts (via conversation or direct file editing)
- Customizable source list (add/remove builders and podcasts)
- English, Chinese, and bilingual support
- Supadata API for YouTube transcripts
- Rettiwt-API for X/Twitter (guest mode — no login, no API key, no account risk)
- State tracking to prevent duplicate content
- Daily or weekly delivery schedule"
```

- [ ] **Step 4: Verify final file structure**

```bash
find . -not -path './scripts/node_modules/*' -not -path './.git/*' -not -name '.DS_Store' | sort
```

Expected output:
```
.
./.gitignore
./SKILL.md
./README.md
./config
./config/config-schema.json
./config/default-sources.json
./examples
./examples/sample-digest.md
./prompts
./prompts/digest-intro.md
./prompts/summarize-podcast.md
./prompts/summarize-tweets.md
./prompts/translate.md
./scripts
./scripts/fetch-content.js
./scripts/package.json
./docs
./docs/superpowers
./docs/superpowers/specs
./docs/superpowers/specs/2026-03-14-follow-builders-design.md
./docs/superpowers/plans
./docs/superpowers/plans/2026-03-14-follow-builders-plan.md
```

---

## Post-Implementation

### Task 10: End-to-End Test

- [ ] **Step 1: Get Supadata API key**

Ask the user to obtain and paste their Supadata API key into `~/.follow-builders/.env`.

- [ ] **Step 2: Run fetcher with real keys**

```bash
cd scripts && node fetch-content.js --lookback-hours 48
```

Verify: JSON output with podcast and/or X content. No crashes.

- [ ] **Step 3: Test the skill end-to-end**

Invoke `/follow-builders` (or `/ai`) and verify:
1. If first run: onboarding flow triggers correctly
2. If already set up: fetches content and delivers a formatted digest
3. Test a config change: "Add @sama to my follow list" → verify config.json updated

- [ ] **Step 4: Write FORZARA.md**

Create the project explainer per Zara's CLAUDE.md requirements.
