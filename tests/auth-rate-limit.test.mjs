import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAuthAttemptRateLimit } from '../lib/auth-rate-limit.ts';

const request = new Request('https://brandex.example/api/auth/login', { method: 'POST' });

test('authentication rate limit is skipped outside Vercel deployments', async () => {
  let calls = 0;
  const result = await checkAuthAttemptRateLimit(request, {}, async () => { calls += 1; return { rateLimited: false }; });
  assert.deepEqual(result, { allowed: true });
  assert.equal(calls, 0);
});

test('Vercel authentication fails closed when the firewall rule is missing', async () => {
  const result = await checkAuthAttemptRateLimit(request, { VERCEL: '1' }, async () => ({ rateLimited: false }));
  assert.deepEqual(result, { allowed: false, status: 503 });
});

test('Vercel uses the configured distributed IP bucket and fails closed on errors', async () => {
  const env = { VERCEL: '1', VERCEL_AUTH_RATE_LIMIT_ID: 'brandex-auth-attempts' };
  let options;
  const allowed = await checkAuthAttemptRateLimit(request, env, async (id, received) => {
    assert.equal(id, env.VERCEL_AUTH_RATE_LIMIT_ID);
    options = received;
    return { rateLimited: false };
  });
  assert.deepEqual(allowed, { allowed: true });
  assert.equal(options.request, request);
  assert.equal(options.timeout, 1000);

  assert.deepEqual(await checkAuthAttemptRateLimit(request, env, async () => ({ rateLimited: true })), { allowed: false, status: 429 });
  assert.deepEqual(await checkAuthAttemptRateLimit(request, env, async () => ({ rateLimited: false, error: 'not-found' })), { allowed: false, status: 503 });
  assert.deepEqual(await checkAuthAttemptRateLimit(request, env, async () => { throw new Error('offline'); }), { allowed: false, status: 503 });
});
