import test from 'node:test';
import assert from 'node:assert/strict';

const { describeAppsScriptFailure } = await import('../lib/apps-script-response.ts');

test('reports an Apps Script token rejection without exposing the token', () => {
  assert.deepEqual(describeAppsScriptFailure('Authentication required'), {
    code: 'APPS_SCRIPT_AUTHENTICATION_FAILED',
    error: 'Apps Script rejected the backend token. Make APPS_SCRIPT_RECORDS_TOKEN and the Apps Script RECORDS_ACCESS_TOKEN property identical.',
  });
});

test('keeps the Google Docs permission remediation separate from token errors', () => {
  assert.deepEqual(describeAppsScriptFailure('Exception: permissions are not sufficient to call DocumentApp.openById'), {
    code: 'GOOGLE_DOCS_PERMISSION_REQUIRED',
    error: 'Google Docs authorization is required. Follow the permission setup instructions.',
  });
});
