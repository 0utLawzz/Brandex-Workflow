import { Client } from 'pg';
import { readFile, readdir } from 'node:fs/promises';

const connection = process.env.PG17_TEST_DATABASE_URL;
if (!connection) throw new Error('Set PG17_TEST_DATABASE_URL for a disposable local database.');
const url = new URL(connection);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.pathname !== '/brandex_disposable_test') {
  throw new Error('Native migration checks require the named disposable database on localhost.');
}
const client = new Client({ connectionString: connection, connectionTimeoutMillis: 5000 });
await client.connect();
try {
  const version = Number((await client.query('SHOW server_version_num')).rows[0].server_version_num);
  if (version < 170000 || version >= 180000) throw new Error('Native migration checks require PostgreSQL 17.');
  const baseline = await client.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'");
  if (baseline.rows[0].n !== 0) throw new Error('Disposable database is not empty. Create a fresh test database.');
  await client.query('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
  await client.query(await readFile(new URL('../supabase_schema.sql', import.meta.url), 'utf8'));
  const folder = new URL('../supabase/migrations/', import.meta.url);
  const migrations = (await readdir(folder)).filter(name => name.endsWith('.sql')).sort();
  for (const name of migrations) {
    try { await client.query(await readFile(new URL(name, folder), 'utf8')); }
    catch (error) { throw new Error(`Migration ${name}: ${error.message}`, { cause: error }); }
  }
  const fixtures = ['case-csv-import.sql', 'recovery-restore.sql', 'client-assignment.sql'];
  for (const name of fixtures) {
    await client.query('BEGIN');
    try { await client.query(await readFile(new URL(`../tests/sql/${name}`, import.meta.url), 'utf8')); }
    catch (error) { throw new Error(`Fixture ${name}: ${error.message}`, { cause: error }); }
    finally { await client.query('ROLLBACK'); }
  }
  const acl = (await client.query("SELECT has_function_privilege('anon','public.restore_recovery_snapshot(jsonb)','EXECUTE') AS anon_restore, has_function_privilege('service_role','public.restore_recovery_snapshot(jsonb)','EXECUTE') AS service_restore")).rows[0];
  if (acl.anon_restore || !acl.service_restore) throw new Error('Recovery role grants are incorrect.');
  console.log(`PostgreSQL 17: clean schema, ${migrations.length} migrations, ${fixtures.length} rollback fixtures, and recovery ACL passed.`);
} finally { await client.end(); }
