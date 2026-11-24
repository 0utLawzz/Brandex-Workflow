import test from 'node:test';
import assert from 'node:assert/strict';
import { readWorkspacePreferences, saveWorkspacePreferences } from '../lib/workspace-preferences.ts';
test('personal sounds/notifications are opt-in and saved choices survive reload', () => {
  let stored = null;
  globalThis.window = { localStorage: { getItem: () => stored, setItem: (_key, value) => { stored = value; } } };
  const defaults = readWorkspacePreferences();
  assert.equal(defaults.pageSize, 50); assert.equal(defaults.enableSounds, false); assert.equal(defaults.enableNotifications, false);
  saveWorkspacePreferences({ ...defaults, enableSounds: true, enableNotifications: true });
  assert.equal(readWorkspacePreferences().enableSounds, true); assert.equal(readWorkspacePreferences().enableNotifications, true);
  stored = '{"pageSize":25,"showLawFirmWidget":false}';
  assert.equal(readWorkspacePreferences().pageSize, 25); assert.equal(readWorkspacePreferences().enableSounds, false);
});
