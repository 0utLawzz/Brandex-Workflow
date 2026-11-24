import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

let db;
before(async () => {
  db = new PGlite();
  await db.waitReady;
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
  await db.exec(await readFile(new URL('../supabase_schema.sql', import.meta.url), 'utf8'));
  const directory = new URL('../supabase/migrations/', import.meta.url);
  for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(name, directory), 'utf8'));
  await db.exec('GRANT ALL ON public.clients,public.trademark_records,public.trademark_history,public.trademark_documents TO service_role; GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;');
}, { timeout: 30000 });
after(async () => { await db?.close(); }, { timeout: 10000 });

test('clean schema and every migration execute in disposable Postgres', async () => {
  const result = await db.query("SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema='public'");
  assert.ok(result.rows[0].count >= 7);
});
test('CSV import is atomic and relates cases, proof documents and history', async () => {
  await db.exec('BEGIN');
  try { await db.exec(await readFile(new URL('./sql/case-csv-import.sql', import.meta.url), 'utf8')); }
  finally { await db.exec('ROLLBACK'); }
});
test('recovery remaps parents and children, detects retry and rolls back late failures', async () => {
  await db.exec('BEGIN');
  try { await db.exec(await readFile(new URL('./sql/recovery-restore.sql', import.meta.url), 'utf8')); }
  finally { await db.exec('ROLLBACK'); }
});
test('shared settings reject stale revisions and privileged functions deny anonymous calls', async () => {
  await db.exec('BEGIN');
  try {
    const first = await db.query("UPDATE public.workspace_settings SET display_name='TEST',revision=revision+1 WHERE id=true AND revision=1 RETURNING revision");
    const stale = await db.query("UPDATE public.workspace_settings SET display_name='STALE' WHERE id=true AND revision=1 RETURNING revision");
    assert.equal(first.rows.length, 1); assert.equal(stale.rows.length, 0);
    const permissions = await db.query("SELECT has_function_privilege('anon','public.restore_recovery_snapshot(jsonb)','EXECUTE') AS anon_restore, has_function_privilege('service_role','public.restore_recovery_snapshot(jsonb)','EXECUTE') AS service_restore, has_table_privilege('anon','public.workspace_settings','SELECT') AS anon_brand");
    assert.deepEqual(permissions.rows[0], { anon_restore: false, service_restore: true, anon_brand: false });
  } finally { await db.exec('ROLLBACK'); }
});

test('service role can execute snapshot and transactional restore without owner privileges', async () => {
  await db.exec('BEGIN; SET LOCAL ROLE service_role');
  try {
    const snapshot = await db.query('SELECT public.get_recovery_snapshot() AS snapshot');
    assert.ok(Array.isArray(snapshot.rows[0].snapshot.records));
    const report = await db.query("SELECT public.restore_recovery_snapshot('{\"clients\":[],\"records\":[],\"history\":[],\"documents\":[]}'::jsonb) AS report");
    assert.equal(report.rows[0].report.records, 0);
  } finally { await db.exec('ROLLBACK'); }
});

test('metadata RPC persists category, serial and client relationship with audit history', async () => {
  await db.exec('BEGIN');
  try {
    const client = (await db.query("INSERT INTO public.clients(client_code,name) VALUES('993','METADATA') RETURNING id")).rows[0].id;
    const id = (await db.query("INSERT INTO public.trademark_records(mark_name,selection_menu,client_code,case_no) VALUES('BEFORE','META','993','001') RETURNING id")).rows[0].id;
    await db.query('SELECT public.apply_case_metadata_update($1,$2::jsonb,$3)', [id, JSON.stringify({ client_id: client, category: 'RENEWAL', serial_no: 'SERIAL-TEST', expiry_date: '2030-01-01', applicant_name: 'AFTER' }), 'Metadata test']);
    const row = (await db.query('SELECT client_id,category,serial_no,expiry_date,applicant_name FROM public.trademark_records WHERE id=$1',[id])).rows[0];
    assert.equal(String(row.client_id),String(client)); assert.equal(row.category,'RENEWAL'); assert.equal(row.serial_no,'SERIAL-TEST'); assert.equal(row.expiry_date,'2030-01-01'); assert.equal(row.applicant_name,'AFTER');
    assert.equal((await db.query('SELECT count(*)::int AS n FROM public.trademark_history WHERE record_id=$1',[id])).rows[0].n,1);
  } finally { await db.exec('ROLLBACK'); }
});
