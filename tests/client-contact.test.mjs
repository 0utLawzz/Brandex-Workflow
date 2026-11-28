import test from 'node:test';
import assert from 'node:assert/strict';
import { validateClientContact } from '../lib/client-contact.ts';
test('client contact validation preserves omitted fields and explicit clear values', () => {
  assert.deepEqual(validateClientContact({}), {});
  assert.deepEqual(validateClientContact({ phone: '', email: '' }), { phone: '', email: '' });
  assert.deepEqual(validateClientContact({ phone: ' +92 (300) 123-4567 ', email: ' Staff@example.com ' }), { phone: '+92 (300) 123-4567', email: 'Staff@example.com' });
  for (const input of [{ email: 'bad@' }, { phone: 'call me' }, { email: 'a\nb@example.com' }, { phone: 123 }]) assert.throws(() => validateClientContact(input));
});
