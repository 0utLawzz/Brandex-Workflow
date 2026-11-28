import test from 'node:test';
import assert from 'node:assert/strict';

const { describeAppsScriptFailure } = await import('../lib/apps-script-response.ts');
const { proxyAppsScript } = await import('../lib/apps-script-proxy.ts');

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

test('fails closed without the server-side Apps Script token', async () => {
  const previousToken = process.env.APPS_SCRIPT_RECORDS_TOKEN;
  const previousFetch = globalThis.fetch;
  delete process.env.APPS_SCRIPT_RECORDS_TOKEN;
  globalThis.fetch = async () => {
    throw new Error('Fetch must not run without a token');
  };

  try {
    const response = await proxyAppsScript({ action: 'generateFromForm' });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      ok: false,
      error: 'Apps Script access is not configured.',
    });
  } finally {
    if (previousToken === undefined) delete process.env.APPS_SCRIPT_RECORDS_TOKEN;
    else process.env.APPS_SCRIPT_RECORDS_TOKEN = previousToken;
    globalThis.fetch = previousFetch;
  }
});

test('forwards the backend token server-side and preserves the Apps Script response', async () => {
  const previousToken = process.env.APPS_SCRIPT_RECORDS_TOKEN;
  const previousFetch = globalThis.fetch;
  const testToken = 'test-only-backend-token';
  let requestDetails;
  process.env.APPS_SCRIPT_RECORDS_TOKEN = testToken;
  globalThis.fetch = async (url, options) => {
    requestDetails = { url, options };
    return new Response(JSON.stringify({ ok: true, serialNo: 'TM/123', row: 7 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const response = await proxyAppsScript({ action: 'generateFromForm', folder: 'TEST' });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, serialNo: 'TM/123', row: 7 });
    assert.equal(requestDetails.options.method, 'POST');
    assert.equal(requestDetails.options.cache, 'no-store');
    assert.deepEqual(JSON.parse(requestDetails.options.body), {
      action: 'generateFromForm',
      folder: 'TEST',
      accessToken: testToken,
    });
    assert.equal(requestDetails.options.body.includes(testToken), true);
  } finally {
    if (previousToken === undefined) delete process.env.APPS_SCRIPT_RECORDS_TOKEN;
    else process.env.APPS_SCRIPT_RECORDS_TOKEN = previousToken;
    globalThis.fetch = previousFetch;
  }
});

test('returns an actionable error when Apps Script rejects the backend token', async () => {
  const previousToken = process.env.APPS_SCRIPT_RECORDS_TOKEN;
  const previousFetch = globalThis.fetch;
  process.env.APPS_SCRIPT_RECORDS_TOKEN = 'test-only-backend-token';
  globalThis.fetch = async () => new Response(JSON.stringify({ ok: false, error: 'Authentication required' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  try {
    const response = await proxyAppsScript({ action: 'generateFromForm' });
    const body = await response.json();
    assert.equal(response.status, 502);
    assert.equal(body.code, 'APPS_SCRIPT_AUTHENTICATION_FAILED');
    assert.equal(body.error, 'Apps Script rejected the backend token. Make APPS_SCRIPT_RECORDS_TOKEN and the Apps Script RECORDS_ACCESS_TOKEN property identical.');
    assert.equal(JSON.stringify(body).includes('test-only-backend-token'), false);
  } finally {
    if (previousToken === undefined) delete process.env.APPS_SCRIPT_RECORDS_TOKEN;
    else process.env.APPS_SCRIPT_RECORDS_TOKEN = previousToken;
    globalThis.fetch = previousFetch;
  }
});

test('server execution URL takes precedence over public legacy configuration for isolated testing', async()=>{
  const previousFetch=globalThis.fetch;
  const previousEndpoint=process.env.NEXT_APPS_SCRIPT_URL;
  const previousToken=process.env.APPS_SCRIPT_RECORDS_TOKEN;
  process.env.NEXT_APPS_SCRIPT_URL='https://script.google.com/macros/s/test-only-isolated/exec';
  process.env.APPS_SCRIPT_RECORDS_TOKEN='test-only-token';
  globalThis.fetch=async url=>{
    assert.equal(url,process.env.NEXT_APPS_SCRIPT_URL);
    return Response.json({ok:true});
  };
  try {assert.equal((await proxyAppsScript({action:'validateDriveFolder'})).status,200);}
  finally {
    globalThis.fetch=previousFetch;
    if(previousEndpoint===undefined)delete process.env.NEXT_APPS_SCRIPT_URL;else process.env.NEXT_APPS_SCRIPT_URL=previousEndpoint;
    if(previousToken===undefined)delete process.env.APPS_SCRIPT_RECORDS_TOKEN;else process.env.APPS_SCRIPT_RECORDS_TOKEN=previousToken;
  }
});
