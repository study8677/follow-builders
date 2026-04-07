import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { requestJsonWithRetry } from './lib/http-client.js';

function listen(server) {
  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address()));
    server.on('error', reject);
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close(error => (error ? reject(error) : resolve()));
  });
}

test('requestJsonWithRetry retries transient socket failures and eventually succeeds', async () => {
  let requestCount = 0;

  const server = http.createServer((req, res) => {
    requestCount += 1;

    if (requestCount < 3) {
      req.socket.destroy(new Error('socket hang up'));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, attempt: requestCount }));
  });

  const address = await listen(server);

  try {
    const data = await requestJsonWithRetry(`http://${address.address}:${address.port}/digest`, {
      method: 'POST',
      body: JSON.stringify({ prompt: 'test' }),
      headers: { 'Content-Type': 'application/json' },
      timeoutMs: 200,
      maxAttempts: 3,
      backoffMs: 5,
      label: 'test request',
    });

    assert.deepEqual(data, { ok: true, attempt: 3 });
    assert.equal(requestCount, 3);
  } finally {
    await close(server);
  }
});

test('requestJsonWithRetry retries timed out requests and eventually succeeds', async () => {
  let requestCount = 0;

  const server = http.createServer((req, res) => {
    requestCount += 1;

    if (requestCount === 1) {
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ late: true }));
      }, 100);
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, attempt: requestCount }));
  });

  const address = await listen(server);

  try {
    const data = await requestJsonWithRetry(`http://${address.address}:${address.port}/digest`, {
      timeoutMs: 20,
      maxAttempts: 2,
      backoffMs: 5,
      label: 'slow request',
    });

    assert.deepEqual(data, { ok: true, attempt: 2 });
    assert.equal(requestCount, 2);
  } finally {
    await close(server);
  }
});
