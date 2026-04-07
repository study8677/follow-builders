import http from 'node:http';
import https from 'node:https';

const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createTimeoutError(timeoutMs) {
  const error = new Error(`Request timed out after ${timeoutMs}ms`);
  error.code = 'ETIMEDOUT';
  return error;
}

function findErrorCode(error) {
  if (!error || typeof error !== 'object') return null;
  if (typeof error.code === 'string') return error.code;
  return findErrorCode(error.cause);
}

function isRetryableError(error) {
  const code = findErrorCode(error);
  if (code && RETRYABLE_ERROR_CODES.has(code)) return true;

  return error?.name === 'AbortError' || error?.message === 'fetch failed';
}

function formatError(error) {
  const details = [];
  let current = error;

  while (current && typeof current === 'object') {
    if (current.message) details.push(current.message);
    current = current.cause;
  }

  return details.filter(Boolean).join(' <- ');
}

function requestText(urlString, {
  method = 'GET',
  headers = {},
  body,
  timeoutMs = 300_000,
} = {}) {
  const url = new URL(urlString);
  const transport = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = transport.request(url, { method, headers }, res => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', chunk => {
        text += chunk;
      });
      res.on('end', () => {
        resolve({
          ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
          status: res.statusCode || 0,
          text,
        });
      });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy(createTimeoutError(timeoutMs));
    });

    req.on('error', reject);

    if (body) req.write(body);
    req.end();
  });
}

export async function requestJsonWithRetry(url, {
  method = 'GET',
  headers = {},
  body,
  timeoutMs = 300_000,
  maxAttempts = 3,
  backoffMs = 30_000,
  label = 'request',
  retryStatusCodes = RETRYABLE_STATUS_CODES,
} = {}) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await requestText(url, {
        method,
        headers,
        body,
        timeoutMs,
      });

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status} — ${response.text}`);
        error.status = response.status;

        const shouldRetry = retryStatusCodes.has(response.status) && attempt < maxAttempts;
        if (!shouldRetry) throw error;

        const waitMs = backoffMs * attempt;
        console.error(`${label} failed with HTTP ${response.status}, retrying in ${waitMs}ms... (attempt ${attempt}/${maxAttempts})`);
        await sleep(waitMs);
        continue;
      }

      return JSON.parse(response.text);
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt === maxAttempts) {
        throw error;
      }

      const waitMs = backoffMs * attempt;
      console.error(`${label} failed (${formatError(error)}), retrying in ${waitMs}ms... (attempt ${attempt}/${maxAttempts})`);
      await sleep(waitMs);
    }
  }

  throw lastError;
}

export { formatError };
