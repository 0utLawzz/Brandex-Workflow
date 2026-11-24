import test from 'node:test';
import assert from 'node:assert/strict';
import { validProofFile, assertProofReference } from '../lib/proof-policy.ts';

test('dispatch and delivery accept only bounded raster/PDF proof', () => {
  assert.equal(validProofFile({ type: 'application/pdf', size: 100 }), true);
  assert.equal(validProofFile({ type: 'application/pdf', size: 100 }, true), false);
  assert.equal(validProofFile({ type: 'image/svg+xml', size: 100 }), false);
  assert.equal(validProofFile({ type: 'image/png', size: 8 * 1024 * 1024 + 1 }), false);
  assert.doesNotThrow(() => assertProofReference('data:application/pdf;base64,JVBERi0='));
  assert.throws(() => assertProofReference('data:application/pdf;base64,JVBERi0=', true), /not supported/);
  assert.throws(() => assertProofReference('data:image/svg+xml;base64,PHN2Zz4='), /valid secure/);
  assert.throws(() => assertProofReference('javascript:alert(1)'), /valid secure/);
});
