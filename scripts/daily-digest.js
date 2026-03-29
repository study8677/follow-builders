#!/usr/bin/env node

// ============================================================================
// Follow Builders — Daily Digest (GitHub Actions)
// ============================================================================
// Fully automated pipeline: fetch feeds → Gemini remix → Resend email.
// Runs on GitHub Actions daily. Zero cost (free Gemini API + free Resend).
//
// Required env vars:
//   GEMINI_API_KEY  — Google AI Studio API key
//   RESEND_API_KEY  — Resend API key (free tier: 100 emails/day)
//   DIGEST_EMAIL    — Recipient email address
//
// Usage: node daily-digest.js [--language en|zh|bilingual]
// ============================================================================

import { readFile } from 'fs/promises';
import { join } from 'path';

const SCRIPT_DIR = decodeURIComponent(new URL('.', import.meta.url).pathname);
const ROOT = join(SCRIPT_DIR, '..');

// -- Feed URLs (from upstream central repo) ----------------------------------

const FEED_URLS = {
  x: 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json',
  podcasts: 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-podcasts.json',
  blogs: 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-blogs.json',
};

// -- Gemini API --------------------------------------------------------------

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
// Try models in order: primary → fallbacks (separate quotas)
const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.0-flash-lite'];

// -- Helpers -----------------------------------------------------------------

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

// -- Step 1: Fetch feeds -----------------------------------------------------

async function fetchFeeds() {
  const [feedX, feedPodcasts, feedBlogs] = await Promise.all([
    fetchJSON(FEED_URLS.x),
    fetchJSON(FEED_URLS.podcasts),
    fetchJSON(FEED_URLS.blogs),
  ]);
  return { feedX, feedPodcasts, feedBlogs };
}

// -- Step 2: Load prompts ----------------------------------------------------

async function loadPrompts() {
  const promptDir = join(ROOT, 'prompts');
  const files = [
    'digest-intro.md',
    'summarize-tweets.md',
    'summarize-podcast.md',
    'summarize-blogs.md',
    'translate.md',
  ];
  const prompts = {};
  for (const file of files) {
    const key = file.replace('.md', '').replace(/-/g, '_');
    prompts[key] = await readFile(join(promptDir, file), 'utf-8');
  }
  return prompts;
}

// -- Step 3: Call Gemini API -------------------------------------------------

async function callGemini(prompt, apiKey) {
  // Try each model until one succeeds (they have independent quotas)
  for (const model of GEMINI_MODELS) {
    const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.7,
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text) {
        console.error(`Using model: ${model}`);
        return text;
      }
    }

    if (res.status === 429) {
      console.error(`${model} rate limited, trying next model...`);
      continue;
    }

    const err = await res.text();
    throw new Error(`Gemini API error (${model}): HTTP ${res.status} — ${err}`);
  }

  throw new Error('All Gemini models rate limited. Free tier daily quota exhausted.');
}

// -- Step 4: Send email via Resend -------------------------------------------

async function sendEmail(digest, apiKey, toEmail) {
  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Shanghai',
  });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: 'AI Builders Digest <onboarding@resend.dev>',
      to: [toEmail],
      subject: `AI Builders Digest — ${today}`,
      text: digest,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Resend API error: ${err.message || res.status}`);
  }
}

// -- Main --------------------------------------------------------------------

async function main() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const digestEmail = process.env.DIGEST_EMAIL;

  if (!geminiKey) { console.error('GEMINI_API_KEY not set'); process.exit(1); }
  if (!resendKey) { console.error('RESEND_API_KEY not set'); process.exit(1); }
  if (!digestEmail) { console.error('DIGEST_EMAIL not set'); process.exit(1); }

  // Parse language from CLI args (default: zh)
  const args = process.argv.slice(2);
  const langIdx = args.indexOf('--language');
  const language = (langIdx !== -1 && args[langIdx + 1]) ? args[langIdx + 1] : 'zh';

  // 1. Fetch feeds
  console.error('Fetching feeds...');
  const { feedX, feedPodcasts, feedBlogs } = await fetchFeeds();

  const xBuilders = feedX?.x?.length || 0;
  const podcastEpisodes = feedPodcasts?.podcasts?.length || 0;
  const blogPosts = feedBlogs?.blogs?.length || 0;

  console.error(`Content: ${xBuilders} X builders, ${podcastEpisodes} podcasts, ${blogPosts} blogs`);

  if (xBuilders === 0 && podcastEpisodes === 0 && blogPosts === 0) {
    console.error('No new content today. Skipping digest.');
    return;
  }

  // 2. Load prompts
  const prompts = await loadPrompts();

  // 3. Build feed data (truncate transcripts to avoid token overflow)
  const feedData = {
    x: feedX?.x || [],
    podcasts: (feedPodcasts?.podcasts || []).map(p => ({
      ...p,
      transcript: p.transcript?.slice(0, 50000) || '',
    })),
    blogs: (feedBlogs?.blogs || []).map(b => ({
      ...b,
      content: b.content?.slice(0, 30000) || '',
    })),
  };

  // 4. Build Gemini prompt
  const languageInstructions = {
    en: 'Language: en (English). Write the entire digest in English.',
    zh: 'Language: zh (Chinese). Translate the entire digest to Chinese following the translation instructions.',
    bilingual: 'Language: bilingual. Interleave English and Chinese paragraph by paragraph following the translation instructions.',
  };

  const geminiPrompt = `You are an AI content curator. Generate a daily digest following these instructions.

## Digest Format Instructions
${prompts.digest_intro}

## Tweet Summary Instructions
${prompts.summarize_tweets}

## Podcast Summary Instructions
${prompts.summarize_podcast}

## Blog Summary Instructions
${prompts.summarize_blogs}

## Translation Instructions
${prompts.translate}

## Language Setting
${languageInstructions[language] || languageInstructions.zh}

## Today's Feed Data (JSON)
${JSON.stringify(feedData, null, 2)}

Generate the complete digest now. Rules:
- ONLY use content from the feed data above. NEVER fabricate.
- Every piece of content MUST have its original URL from the JSON.
- Section order: X/Twitter → Official Blogs → Podcasts.
- Skip sections with no content.`;

  console.error(`Prompt size: ${geminiPrompt.length} chars`);
  console.error('Calling Gemini API...');
  const digest = await callGemini(geminiPrompt, geminiKey);

  if (!digest) {
    console.error('Gemini returned empty response');
    process.exit(1);
  }

  console.error(`Digest generated: ${digest.length} chars`);

  // 5. Send email
  console.error(`Sending to ${digestEmail}...`);
  await sendEmail(digest, resendKey, digestEmail);
  console.error('Done! Digest delivered.');

  // Also print digest to stdout (visible in GitHub Actions logs)
  console.log(digest);
}

main().catch(err => {
  console.error('Daily digest failed:', err.message);
  process.exit(1);
});
