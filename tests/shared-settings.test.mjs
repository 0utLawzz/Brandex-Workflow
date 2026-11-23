import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSharedSettings } from '../lib/shared-settings.ts';
const valid = { display_name: 'Brandex', brand_prefix: 'BX', tagline: 'Law', logo_url: 'https://example.test/logo.png', revision: 1 };
test('shared branding validates fields, revisions and safe logo schemes', () => {
  assert.deepEqual(validateSharedSettings(valid), valid);
  for (const changes of [{ revision: 0 }, { logo_url: 'javascript:alert(1)' }, { logo_url: 'https://user:password@example.test/logo' }, { display_name: '' }, { tagline: 'a'.repeat(161) }]) assert.throws(() => validateSharedSettings({ ...valid, ...changes }));
});
