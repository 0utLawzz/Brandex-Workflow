import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PRODUCTION_PROJECT_REF, previewWriteError } from '../lib/preview-isolation.ts';

const testRef='clviaughxebohniopzyg';
const testUrl=`https://${testRef}.supabase.co`;
const production=`https://${DEFAULT_PRODUCTION_PROJECT_REF}.supabase.co`;
const script='https://script.google.com/macros/s/test-script/exec';
const env={VERCEL_ENV:'preview',PREVIEW_WRITE_PROJECT_REF:testRef,PREVIEW_APPS_SCRIPT_URL:script,PRODUCTION_APPS_SCRIPT_URL:'https://script.google.com/macros/s/production-script/exec'};
test('preview writes require the exact reviewed test project and always reject protected production refs',()=>{
  assert.equal(previewWriteError(env,testUrl),null);
  assert.match(previewWriteError({VERCEL_ENV:'preview'},testUrl),/locked/);
  assert.match(previewWriteError(env,production),/locked/);
  assert.match(previewWriteError({...env,PREVIEW_WRITE_PROJECT_REF:DEFAULT_PRODUCTION_PROJECT_REF},production),/locked/);
  assert.match(previewWriteError({...env,PRODUCTION_PROJECT_REF:testRef},testUrl),/locked/);
  assert.match(previewWriteError(env,`https://user:pass@${testRef}.supabase.co`),/locked/);
  assert.match(previewWriteError(env,`http://${testRef}.supabase.co`),/locked/);
  assert.equal(previewWriteError({VERCEL_ENV:'production'},production),null);
});
test('preview Drive requests require distinct approved execution and production script destinations',()=>{
  assert.equal(previewWriteError(env,testUrl,script),null);
  assert.match(previewWriteError(env,testUrl,env.PRODUCTION_APPS_SCRIPT_URL),/file changes are locked/);
  assert.match(previewWriteError({...env,PRODUCTION_APPS_SCRIPT_URL:script},testUrl,script),/file changes are locked/);
  assert.match(previewWriteError({...env,PRODUCTION_APPS_SCRIPT_URL:undefined},testUrl,script),/file changes are locked/);
  assert.match(previewWriteError(env,testUrl,'https://script.google.com.evil.test/macros/s/test-script/exec'),/locked/);
});
