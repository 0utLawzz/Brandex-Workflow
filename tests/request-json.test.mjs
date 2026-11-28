import test from 'node:test';
import assert from 'node:assert/strict';
import { readBoundedJson } from '../lib/request-json.ts';
const request = (body, headers = {}) => new Request('https://example.test/api', { method: 'POST', body, headers });
test('JSON byte limit covers absent and misleading Content-Length and multibyte input', async () => {
  assert.deepEqual(await readBoundedJson(request('{"ok":true}'), 20), { ok: true });
  await assert.rejects(readBoundedJson(request('"éééé"'), 8), error => error.status === 413);
  await assert.rejects(readBoundedJson(request('123456', { 'content-length': '1' }), 4), error => error.status === 413);
  await assert.rejects(readBoundedJson(request('{}', { 'content-length': '1000' }), 4), error => error.status === 413);
});
test('streaming limit cancels oversized requests and rejects malformed JSON', async () => {
  let cancelled = false;
  const body = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(6)); }, cancel() { cancelled = true; } });
  const streamed = new Request('https://example.test', { method: 'POST', body, duplex: 'half' });
  await assert.rejects(readBoundedJson(streamed, 5), error => error.status === 413);
  assert.equal(cancelled, true);
  await assert.rejects(readBoundedJson(request('{'), 10), error => error.status === 400);
});
