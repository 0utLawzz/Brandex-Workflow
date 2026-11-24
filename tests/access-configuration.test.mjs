import test from 'node:test';
import assert from 'node:assert/strict';
import { allowUnauthenticatedLocalDemo } from '../lib/access-configuration.ts';

test('only entirely unconfigured local development permits anonymous demo access', () => {
  assert.equal(allowUnauthenticatedLocalDemo({ NODE_ENV: 'development' }), true);
  for (const key of ['APP_ACCESS_USER', 'APP_ACCESS_PASSWORD', 'SUPABASE_SERVICE_ROLE_KEY', 'APPS_SCRIPT_RECORDS_TOKEN']) {
    assert.equal(allowUnauthenticatedLocalDemo({ NODE_ENV: 'development', [key]: 'configured' }), false, key);
  }
  assert.equal(allowUnauthenticatedLocalDemo({ NODE_ENV: 'production' }), false);
  assert.equal(allowUnauthenticatedLocalDemo({ NODE_ENV: 'development', VERCEL_ENV: 'preview' }), false);
});
