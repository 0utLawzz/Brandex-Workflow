import test from 'node:test';
import assert from 'node:assert/strict';
import { hasSameOrigin } from '../lib/request-origin.ts';
const check = (headers, url = 'https://workspace.example/api') => hasSameOrigin(new Request(url, { headers }));
test('write origin matches protocol, host and port, including trusted proxy routing', () => {
  assert.equal(check({ origin: 'https://workspace.example' }), true);
  assert.equal(check({ origin: 'http://localhost:3000' }, 'http://localhost:3000/api'), true);
  assert.equal(check({ origin: 'https://preview.example', 'x-forwarded-host': 'preview.example', 'x-forwarded-proto': 'https' }, 'http://internal:3000/api'), true);
  assert.equal(check({ origin: 'https://preview.example', 'x-forwarded-host': 'preview.example, internal', 'x-forwarded-proto': 'https, http' }), true);
});
test('missing, opaque, malformed and cross-site origins cannot authorize writes', () => {
  for (const origin of [undefined, 'null', 'https://evil.example', 'http://workspace.example', 'https://workspace.example:8443', 'https://workspace.example/path', 'https://user@workspace.example', 'not a URL']) {
    assert.equal(check(origin === undefined ? {} : { origin }), false, String(origin));
  }
  assert.equal(check({ origin: 'https://workspace.example', 'x-forwarded-proto': 'ftp' }), false);
});
