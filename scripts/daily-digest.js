#!/usr/bin/env node

// ============================================================================
// Follow Builders — Daily Digest (GitHub Actions)
// ============================================================================
// Fully automated pipeline: fetch feeds → LLM remix → Resend email.
// Runs on GitHub Actions daily.
//
// Required env vars:
//   NVIDIA_API_KEY  — NVIDIA API key (for Kimi K2.5 via NVIDIA Inference)
//   RESEND_API_KEY  — Resend API key (free tier: 100 emails/day)
//   DIGEST_EMAIL    — Recipient email address
//
// Usage: node daily-digest.js [--language en|zh|bilingual]
// ============================================================================

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

import { formatError, requestJsonWithRetry } from './lib/http-client.js';

const SCRIPT_DIR = decodeURIComponent(new URL('.', import.meta.url).pathname);
const ROOT = join(SCRIPT_DIR, '..');

// -- Feed URLs (from upstream central repo) ----------------------------------

const FEED_URLS = {
  x: 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json',
  podcasts: 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-podcasts.json',
  blogs: 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-blogs.json',
};

// -- LLM providers -----------------------------------------------------------

const LLM_PROVIDERS = [
  {
    name: 'Gemini',
    envKey: 'GEMINI_API_KEY',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-2.5-flash',
    maxAttempts: 4,
    backoffMs: 60_000,
  },
  {
    name: 'NVIDIA (Kimi K2.5)',
    envKey: 'NVIDIA_API_KEY',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'moonshotai/kimi-k2.5',
    maxAttempts: 2,
    backoffMs: 30_000,
  },
];

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

// -- Step 3: Call LLM (with provider fallback) -------------------------------

async function callLLMProvider(provider, apiKey, prompt) {
  const data = await requestJsonWithRetry(provider.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 16384,
      temperature: 0.7,
      top_p: 1.0,
      stream: false,
    }),
    timeoutMs: 10 * 60 * 1000,
    maxAttempts: provider.maxAttempts || 3,
    backoffMs: provider.backoffMs || 30_000,
    label: provider.name,
  });

  return data.choices?.[0]?.message?.content || '';
}

async function callLLM(prompt) {
  for (const provider of LLM_PROVIDERS) {
    const apiKey = process.env[provider.envKey];
    if (!apiKey) continue;

    console.error(`Trying ${provider.name} (${provider.model})...`);
    try {
      const result = await callLLMProvider(provider, apiKey, prompt);
      if (result) {
        console.error(`${provider.name} succeeded.`);
        return result;
      }
    } catch (err) {
      console.error(`${provider.name} failed: ${formatError(err)}`);
    }
  }

  throw new Error('All LLM providers failed');
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
  const resendKey = process.env.RESEND_API_KEY;
  const digestEmail = process.env.DIGEST_EMAIL;

  // Check that at least one LLM provider key is available
  const hasLLM = LLM_PROVIDERS.some(p => process.env[p.envKey]);
  if (!hasLLM) {
    console.error('No LLM API key set. Need at least one of: ' +
      LLM_PROVIDERS.map(p => p.envKey).join(', '));
    process.exit(1);
  }

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

  // 4. Build LLM prompt
  const languageInstructions = {
    en: 'Language: en (English). Write the entire digest in English.',
    zh: 'Language: zh (Chinese). Translate the entire digest to Chinese following the translation instructions.',
    bilingual: 'Language: bilingual. Interleave English and Chinese paragraph by paragraph following the translation instructions.',
  };

  const llmPrompt = `You are an AI content curator. Generate a daily digest following these instructions.

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

  console.error(`Prompt size: ${llmPrompt.length} chars`);
  const digest = await callLLM(llmPrompt);

  if (!digest) {
    console.error('LLM returned empty response');
    process.exit(1);
  }

  console.error(`Digest generated: ${digest.length} chars`);

  // 5. Save digest to file (for GitHub Actions to pick up as an Issue)
  const digestPath = join(ROOT, 'digest-output.md');
  await writeFile(digestPath, digest);
  console.error(`Saved to ${digestPath}`);

  // 6. Optionally send email via Resend (skip if keys missing)
  if (resendKey && digestEmail) {
    console.error(`Sending email to ${digestEmail}...`);
    try {
      await sendEmail(digest, resendKey, digestEmail);
      console.error('Email delivered.');
    } catch (emailErr) {
      console.error(`Email delivery failed: ${formatError(emailErr)} (continuing — digest saved to file)`);
    }
  } else {
    console.error('RESEND_API_KEY or DIGEST_EMAIL not set — skipping email');
  }

  // Also print digest to stdout
  console.log(digest);
}

main().catch(err => {
  console.error('Daily digest failed:', formatError(err));
  process.exit(1);
});
