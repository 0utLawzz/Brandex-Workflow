import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync(new URL('../supabase/migrations/20261123130000_atomic_case_workflow.sql', import.meta.url), 'utf8');

test('workflow migration makes status, proof reference, and history atomic', () => {
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.apply_case_workflow_transition/);
  assert.match(sql, /UPDATE public\.trademark_records/);
  assert.match(sql, /INSERT INTO public\.trademark_documents/);
  assert.match(sql, /INSERT INTO public\.trademark_history/);
  assert.match(sql, /IF changed_count <> required_count THEN/);
  assert.match(sql, /REVOKE ALL ON FUNCTION/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION .* TO service_role/);
  assert.doesNotMatch(sql, /SET dispatched_image\s*=/i);
  assert.doesNotMatch(sql, /SET dispatched_doc_name\s*=/i);
  assert.doesNotMatch(sql, /SET dispatched_doc_type\s*=/i);
});
