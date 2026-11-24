import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createHash } from 'node:crypto';

let db;
before(async () => {
  db = new PGlite();
  await db.waitReady;
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
  await db.exec(await readFile(new URL('../supabase_schema.sql', import.meta.url), 'utf8'));
  const directory = new URL('../supabase/migrations/', import.meta.url);
  for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) {
    try { await db.exec(await readFile(new URL(name, directory), 'utf8')); }
    catch (error) { throw new Error(`Migration ${name}: ${error.message}${error.position ? ` at character ${error.position}` : ''}`); }
  }
}, { timeout: 30000 });
after(async () => { await db?.close(); }, { timeout: 10000 });

test('clean schema and every migration execute in disposable Postgres', async () => {
  const result = await db.query("SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema='public'");
  assert.ok(result.rows[0].count >= 7);
});
test('client assignment updates relationships and audit rows atomically', async () => {
  await db.exec('BEGIN');
  try {
    const client = (await db.query("INSERT INTO public.clients(client_code,name,company_name) VALUES('887','SAVED CLIENT','SAVED BUSINESS') RETURNING id")).rows[0].id;
    const cases = (await db.query("INSERT INTO public.trademark_records(mark_name,selection_menu,client_code,case_no) VALUES('ASSIGN ONE','A','886','001'),('ASSIGN TWO','A','886','002') RETURNING id")).rows.map(row => row.id);
    await db.query('UPDATE public.trademark_records SET status=NULL WHERE id=$1',[cases[0]]);
    await db.exec('SAVEPOINT bad_assignment');
    await assert.rejects(db.query('SELECT public.assign_cases_to_client($1::bigint[],$2::bigint)', [[cases[0],99999999],client]), /no longer exists/);
    await db.exec('ROLLBACK TO SAVEPOINT bad_assignment');
    assert.equal((await db.query('SELECT count(*)::int AS n FROM public.trademark_records WHERE client_id=$1',[client])).rows[0].n,0);
    const result = await db.query('SELECT public.assign_cases_to_client($1::bigint[],$2::bigint) AS changed',[cases,client]);
    assert.equal(result.rows[0].changed,2);
    const rows = (await db.query('SELECT client_id,client_code,applicant_name,trading_as FROM public.trademark_records WHERE id=ANY($1::bigint[])',[cases])).rows;
    assert.ok(rows.every(row=>String(row.client_id)===String(client) && row.client_code==='887' && row.applicant_name==='SAVED CLIENT' && row.trading_as==='SAVED BUSINESS'));
    assert.equal((await db.query('SELECT count(*)::int AS n FROM public.trademark_history WHERE record_id=ANY($1::bigint[])',[cases])).rows[0].n,2);
    assert.equal((await db.query('SELECT status FROM public.trademark_history WHERE record_id=$1',[cases[0]])).rows[0].status,'PENDING');
  } finally { await db.exec('ROLLBACK'); }
});
test('CSV import is atomic and relates cases, proof documents and history', async () => {
  await db.exec('BEGIN');
  try { await db.exec(await readFile(new URL('./sql/case-csv-import.sql', import.meta.url), 'utf8')); }
  finally { await db.exec('ROLLBACK'); }
});
test('recovery remaps parents and children, detects retry and rolls back late failures', async () => {
  await db.exec('BEGIN');
  try {
    await db.exec(await readFile(new URL('./sql/recovery-restore.sql', import.meta.url), 'utf8'));
    assert.equal((await db.query('SELECT id FROM public.trademark_records WHERE id=920001')).rows.length,1);
    const next = (await db.query("SELECT nextval('public.trademark_records_id_seq')::bigint AS id")).rows[0].id;
    assert.ok(Number(next)>920001);
  }
  finally { await db.exec('ROLLBACK'); }
});

test('recovery into a populated target remaps colliding source IDs and keeps existing rows', async () => {
  await db.exec('BEGIN');
  try {
    await db.exec("INSERT INTO public.clients(id,client_code,name) VALUES(1,'980','EXISTING')");
    const result = await db.query("SELECT public.restore_recovery_snapshot('{\"clients\":[{\"id\":1,\"client_code\":\"981\",\"name\":\"RESTORED\"}],\"records\":[],\"history\":[],\"documents\":[]}') AS report");
    assert.equal(result.rows[0].report.originalIdsPreserved,false);
    assert.notEqual(result.rows[0].report.clientIdMap['1'],1);
    assert.equal((await db.query('SELECT name FROM public.clients WHERE id=1')).rows[0].name,'EXISTING');
  } finally { await db.exec('ROLLBACK'); }
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

test('creation saves IN REVIEW and history atomically, with separate approval timestamp', async () => {
  await db.exec('BEGIN');
  try {
    await db.exec("INSERT INTO public.clients(client_code,name) VALUES('992','CREATE TEST')");
    const result = await db.query("SELECT public.create_case_record('{\"selection_menu\":\"A\",\"client_code\":\"992\",\"case_no\":\"001\",\"mark_name\":\"TEST\",\"status\":\"APPROVED\"}') AS saved");
    const saved = result.rows[0].saved;
    assert.equal(saved.status, 'IN REVIEW'); assert.ok(saved.in_review_at); assert.equal(saved.approved_at, null);
    const history = await db.query('SELECT status FROM public.trademark_history WHERE record_id=$1',[saved.id]);
    assert.equal(history.rows[0].status,'RECORD_CREATED');
    await db.query("SELECT public.apply_case_workflow_transition(ARRAY[$1::bigint],'APPROVED','Test approval','{}')",[saved.id]);
    const row = (await db.query('SELECT in_review_at,approved_at,status FROM public.trademark_records WHERE id=$1',[saved.id])).rows[0];
    assert.ok(row.approved_at); assert.equal(row.status,'APPROVED');
    await assert.rejects(db.query("SELECT public.create_case_record('{\"selection_menu\":\"A\",\"client_code\":\"991\",\"case_no\":\"001\",\"mark_name\":\"INVALID\"}')"), /missing or ambiguous/);
  } finally { await db.exec('ROLLBACK'); }
});

test('client imports roll back duplicates and identity guards protect linked cases', async () => {
  await db.exec('BEGIN');
  const rejectSafely = async (query, pattern) => {
    await db.exec('SAVEPOINT expected_failure');
    await assert.rejects(db.query(query), pattern);
    await db.exec('ROLLBACK TO SAVEPOINT expected_failure');
  };
  try {
    await rejectSafely("SELECT public.import_client_csv('[{\"client_code\":\"989\",\"name\":\"FIRST\"},{\"client_code\":\"989\",\"name\":\"DUPLICATE\"}]')", /duplicate/);
    assert.equal((await db.query("SELECT count(*)::int n FROM public.clients WHERE client_code='989'")).rows[0].n,0);
    const client = (await db.query("INSERT INTO public.clients(client_code,name) VALUES('990','GUARDED') RETURNING id")).rows[0].id;
    await db.query("INSERT INTO public.trademark_records(mark_name,selection_menu,client_code,case_no,client_id) VALUES('GUARDED','GUARD','990','001',$1)",[client]);
    await rejectSafely(`DELETE FROM public.clients WHERE id=${Number(client)}`,/has cases/);
    await rejectSafely(`UPDATE public.clients SET client_code='988' WHERE id=${Number(client)}`,/in use/);
    await rejectSafely(`INSERT INTO public.trademark_records(mark_name,selection_menu,client_code,case_no,client_id) VALUES('WRONG','GUARD','987','002',${Number(client)})`,/same client/);
  } finally { await db.exec('ROLLBACK'); }
});

test('workflow retry is idempotent and unknown metadata cannot silently disappear', async () => {
  await db.exec('BEGIN');
  try {
    const id = (await db.query("INSERT INTO public.trademark_records(mark_name,selection_menu,client_code,case_no,status) VALUES('RETRY','RETRY','979','001','IN REVIEW') RETURNING id")).rows[0].id;
    await db.query("SELECT public.apply_case_workflow_transition(ARRAY[$1::bigint],'APPROVED','First','{}')",[id]);
    await db.query("SELECT public.apply_case_workflow_transition(ARRAY[$1::bigint],'APPROVED','Retry','{}')",[id]);
    assert.equal((await db.query('SELECT count(*)::int n FROM public.trademark_history WHERE record_id=$1',[id])).rows[0].n,1);
    await db.exec('SAVEPOINT invalid_metadata');
    await assert.rejects(db.query('SELECT public.apply_case_metadata_update($1,$2::jsonb,$3)',[id,JSON.stringify({ typo_field:'lost',mark_name:'UNSAFE' }),'bad']),/Unsupported metadata/);
    await db.exec('ROLLBACK TO SAVEPOINT invalid_metadata');
    assert.equal((await db.query('SELECT mark_name FROM public.trademark_records WHERE id=$1',[id])).rows[0].mark_name,'RETRY');
  } finally { await db.exec('ROLLBACK'); }
});

test('recovery retry detects records removed after a previous restore', async () => {
  await db.exec('BEGIN');
  const source = JSON.stringify({ clients: [], records: [{ id:11, mark_name:'RECOVERY',selection_menu:'REC',client_code:'978',case_no:'001' }], history:[], documents:[] });
  try {
    await db.query('SELECT public.restore_recovery_snapshot($1::jsonb)',[source]);
    await db.exec('DELETE FROM public.trademark_records WHERE id=11; SAVEPOINT removed_row');
    await assert.rejects(db.query('SELECT public.restore_recovery_snapshot($1::jsonb)',[source]),/restored rows are missing/);
    await db.exec('ROLLBACK TO SAVEPOINT removed_row');
  } finally { await db.exec('ROLLBACK'); }
});

test('actual filing dates persist independently, reject invalid dates and can be cleared', async () => {
  await db.exec('BEGIN');
  try {
    await db.exec("INSERT INTO public.clients(client_code,name) VALUES('977','FILED')");
    const saved = (await db.query("SELECT public.create_case_record('{\"selection_menu\":\"A\",\"client_code\":\"977\",\"case_no\":\"001\",\"mark_name\":\"FILED\",\"issue_date\":\"2026-10-01\",\"filing_date\":\"2026-11-24\"}') AS saved")).rows[0].saved;
    assert.equal(saved.filing_date, '2026-11-24');
    assert.equal(saved.issue_date, '2026-10-01');
    await db.exec('SAVEPOINT invalid_filing_date');
    await assert.rejects(db.query('SELECT public.apply_case_metadata_update($1,$2::jsonb,$3)', [saved.id, JSON.stringify({filing_date:'2026-02-30',mark_name:'UNSAFE'}),'bad']), /date/);
    await db.exec('ROLLBACK TO SAVEPOINT invalid_filing_date');
    const snapshot = (await db.query('SELECT public.get_recovery_snapshot() AS snapshot')).rows[0].snapshot;
    assert.equal(snapshot.records.find(row => row.id === saved.id).filing_date, '2026-11-24');
    await db.query('SELECT public.apply_case_metadata_update($1,$2::jsonb,$3)', [saved.id, JSON.stringify({filing_date:null}),'clear date']);
    const row = (await db.query('SELECT filing_date,issue_date,mark_name FROM public.trademark_records WHERE id=$1',[saved.id])).rows[0];
    assert.equal(row.filing_date, null); assert.equal(row.issue_date,'2026-10-01'); assert.equal(row.mark_name,'FILED');
  } finally { await db.exec('ROLLBACK'); }
});

test('recovery staging enforces expiry, chunk identity, byte counts and service-only access', async () => {
  await db.exec('BEGIN; SET LOCAL ROLE service_role');
  const id = 'bfbb1823-d2ef-4ce4-b455-76b7cba79f65';
  const rejectSafely = async (sql, params, pattern) => {
    await db.exec('SAVEPOINT staging_failure');
    await assert.rejects(db.query(sql, params), pattern);
    await db.exec('ROLLBACK TO SAVEPOINT staging_failure');
  };
  try {
    await db.query('SELECT public.begin_recovery_transfer($1,$2,$3,$4,$5)',[id,'upload',4,1,'a'.repeat(64)]);
    await db.query('SELECT public.put_recovery_chunk($1,0,$2)',[id,'dGVzdA==']);
    await db.query('SELECT public.put_recovery_chunk($1,0,$2)',[id,'dGVzdA==']);
    await rejectSafely('SELECT public.put_recovery_chunk($1,0,$2)',[id,'YWJjZA=='],/conflicts/);
    await rejectSafely('SELECT public.put_recovery_chunk($1,0,$2)',[id,'YQ=='],/size mismatch/);
    await rejectSafely('SELECT public.put_recovery_chunk($1,1,$2)',[id,'dGVzdA=='],/Invalid recovery chunk/);
    assert.equal((await db.query('SELECT count(*)::int n FROM public.recovery_transfer_chunks WHERE transfer_id=$1',[id])).rows[0].n,1);
    await db.query("UPDATE public.recovery_transfers SET expires_at=now()-interval '1 second' WHERE id=$1",[id]);
    await rejectSafely('SELECT public.put_recovery_chunk($1,0,$2)',[id,'dGVzdA=='],/expired/);
    await db.query('SELECT public.begin_recovery_transfer($1,$2,$3,$4,$5)',['877c086f-d6fa-479c-bbc7-58163d0c30cb','download',4,1,'b'.repeat(64)]);
    assert.equal((await db.query('SELECT count(*)::int n FROM public.recovery_transfer_chunks WHERE transfer_id=$1',[id])).rows[0].n,0);
    for (const role of ['anon','authenticated']) {
      const acl = (await db.query("SELECT has_table_privilege($1,'public.recovery_transfers','SELECT') AS reads,has_function_privilege($1,'public.put_recovery_chunk(uuid,integer,text)','EXECUTE') AS writes",[role])).rows[0];
      assert.equal(acl.reads,false); assert.equal(acl.writes,false);
    }
  } finally { await db.exec('ROLLBACK'); }
});

test('workspace and series recover with case rows atomically and never overwrite conflicting configuration', async () => {
  await db.exec('BEGIN; SET LOCAL ROLE service_role');
  const source = {
    clients:[{id:501,client_code:'976',name:'CONFIG'}],
    records:[{id:502,client_id:501,client_code:'976',case_no:'001',selection_menu:'RECSET',mark_name:'CONFIG CASE'}],
    history:[],documents:[],
    series:[{id:1001,series_code:'RECSET',is_active:true,sort_order:50}],
    workspaceSettings:[{id:true,display_name:'RECOVERED',brand_prefix:'RC',tagline:'Recovered configuration',logo_url:'https://example.com/logo.png',revision:5}]
  };
  const restore = object => db.query('SELECT public.restore_recovery_snapshot($1::jsonb) AS report',[JSON.stringify(object)]);
  const rejectSafely = async (object, pattern) => {
    await db.exec('SAVEPOINT configuration_failure');
    await assert.rejects(restore(object),pattern);
    await db.exec('ROLLBACK TO SAVEPOINT configuration_failure');
  };
  try {
    const baseline = (await db.query('SELECT public.get_recovery_snapshot() AS snapshot')).rows[0].snapshot;
    assert.equal(baseline.workspaceSettings[0].display_name,'BRANDEX');
    await rejectSafely({...source,documents:[{id:503,record_id:999,file_url:'https://example.com/file'}]},/Unresolved child/);
    assert.equal((await db.query("SELECT count(*)::int n FROM public.case_series WHERE series_code='RECSET'")).rows[0].n,0);
    assert.equal((await db.query('SELECT display_name FROM public.workspace_settings')).rows[0].display_name,'BRANDEX');
    const report = (await restore(source)).rows[0].report;
    assert.equal(report.configurationIncluded,true); assert.equal(report.series,1); assert.equal(report.workspaceSettings,1);
    assert.equal((await restore(source)).rows[0].report.alreadyRestored,true);
    const saved = (await db.query('SELECT public.get_recovery_snapshot() AS snapshot')).rows[0].snapshot;
    assert.equal(saved.workspaceSettings[0].display_name,'RECOVERED');
    assert.ok(saved.series.some(row=>row.series_code==='RECSET'));
    await rejectSafely({...source,workspaceSettings:[{...source.workspaceSettings[0],display_name:'OVERWRITE'}]},/branding conflicts/);
    await rejectSafely({...source,series:[{...source.series[0],sort_order:51}]},/Series configuration conflicts/);
    assert.equal((await db.query('SELECT display_name FROM public.workspace_settings')).rows[0].display_name,'RECOVERED');
    assert.equal((await db.query('SELECT count(*)::int n FROM public.trademark_records')).rows[0].n,1);
  } finally { await db.exec('ROLLBACK'); }
});

test('recovery retries verify unchanged client, case, history and document content across time zones', async () => {
  await db.exec("BEGIN; SET LOCAL ROLE service_role; SET LOCAL timezone='Asia/Karachi'");
  const source = JSON.stringify({
    clients:[{id:601,client_code:'975',name:'INTACT'}],
    records:[{id:602,client_id:601,client_code:'975',case_no:'001',selection_menu:'INTACT',mark_name:'INTACT'}],
    history:[{id:603,record_id:602,status:'IMPORTED',notes:'ORIGINAL'}],
    documents:[{id:604,record_id:602,file_name:'ORIGINAL',file_type:'application/pdf',file_url:'https://drive.google.com/file/d/1234567890/view'}]
  });
  const restore = () => db.query('SELECT public.restore_recovery_snapshot($1::jsonb) AS report',[source]);
  try {
    const first = (await restore()).rows[0].report;
    assert.equal(first.fingerprints,undefined);
    await db.exec("SET LOCAL timezone='UTC'");
    assert.equal((await restore()).rows[0].report.alreadyRestored,true);
    for (const mutation of [
      "UPDATE public.clients SET name='EDITED' WHERE id=601",
      "UPDATE public.trademark_records SET mark_name='EDITED' WHERE id=602",
      "UPDATE public.trademark_history SET notes='EDITED' WHERE id=603",
      "DELETE FROM public.trademark_documents WHERE id=604"
    ]) {
      await db.exec('SAVEPOINT original_content');
      await db.exec(mutation);
      await db.exec('SAVEPOINT before_retry');
      await assert.rejects(restore(),/restored rows are missing or changed/);
      await db.exec('ROLLBACK TO SAVEPOINT before_retry');
      await db.exec('ROLLBACK TO SAVEPOINT original_content');
    }
    assert.equal((await restore()).rows[0].report.alreadyRestored,true);
  } finally { await db.exec('ROLLBACK'); }
});

test('dispatch stores an explicit same-case proof pointer and metadata replacement/clear retains history', async () => {
  await db.exec('BEGIN');
  try {
    const id=(await db.query("INSERT INTO public.trademark_records(mark_name,selection_menu,client_code,case_no,status) VALUES('PROOF','PROOF','974','001','APPROVED') RETURNING id")).rows[0].id;
    await db.query("SELECT public.apply_case_workflow_transition(ARRAY[$1::bigint],'DISPATCHED','Sent',$2::jsonb)",[id,JSON.stringify({dispatchedDate:'2026-11-24',trackingId:'TRACK',dispatchedImage:'https://example.com/original.pdf',dispatchedDocName:'Original.pdf',dispatchedDocType:'application/pdf'})]);
    const first=(await db.query('SELECT d.* FROM public.trademark_records r JOIN public.trademark_documents d ON (d.id,d.record_id)=(r.dispatch_document_id,r.id) WHERE r.id=$1',[id])).rows[0];
    assert.equal(first.file_url,'https://example.com/original.pdf');
    await db.query('SELECT public.apply_case_metadata_update($1,$2::jsonb,$3)',[id,JSON.stringify({dispatchedImage:'https://example.com/replacement.pdf',dispatchedDocName:'Replacement.pdf'}),'New evidence']);
    const next=(await db.query('SELECT dispatch_document_id FROM public.trademark_records WHERE id=$1',[id])).rows[0].dispatch_document_id;
    assert.notEqual(String(next),String(first.id));
    await db.query('SELECT public.apply_case_metadata_update($1,$2::jsonb,$3)',[id,JSON.stringify({dispatch_document_id:null,dispatchedImage:''}),'Clear current proof']);
    assert.equal((await db.query('SELECT dispatch_document_id FROM public.trademark_records WHERE id=$1',[id])).rows[0].dispatch_document_id,null);
    assert.equal((await db.query('SELECT count(*)::int n FROM public.trademark_documents WHERE record_id=$1',[id])).rows[0].n,2);
    const other=(await db.query("INSERT INTO public.trademark_records(mark_name,selection_menu,client_code,case_no) VALUES('OTHER','PROOF','974','002') RETURNING id")).rows[0].id;
    await db.exec('SAVEPOINT wrong_proof');
    await assert.rejects(db.query('SELECT public.apply_case_metadata_update($1,$2::jsonb,$3)',[other,JSON.stringify({dispatch_document_id:first.id}),'Wrong case']),/must belong/);
    await db.exec('ROLLBACK TO SAVEPOINT wrong_proof');
    await db.query('SELECT public.apply_case_metadata_update($1,$2::jsonb,$3)',[id,JSON.stringify({dispatch_document_id:first.id}),'Select historical evidence']);
    await db.exec('SET CONSTRAINTS fk_case_dispatch_document IMMEDIATE');
    await db.query('DELETE FROM public.trademark_records WHERE id=$1',[id]);
  } finally { await db.exec('ROLLBACK'); }
});

test('bulk dispatch writes each case to its own Drive proof reference atomically', async () => {
  await db.exec('BEGIN');
  try {
    const ids=[];
    for (const caseNo of ['011','012']) {
      ids.push((await db.query("INSERT INTO public.trademark_records(mark_name,selection_menu,client_code,case_no,status) VALUES($1,'MAP','973',$2,'APPROVED') RETURNING id",[`MAP ${caseNo}`,caseNo])).rows[0].id);
    }
    const metadata={
      dispatchedDate:'2026-11-24', trackingId:'MAP-TRACK',
      proofByCase:{
        [ids[0]]:{dispatchedImage:'https://drive.google.com/file/d/first/view',dispatchedDocName:'first.pdf',dispatchedDocType:'application/pdf'},
        [ids[1]]:{dispatchedImage:'https://drive.google.com/file/d/second/view',dispatchedDocName:'second.png',dispatchedDocType:'image/png'},
      },
    };
    await db.query('SELECT public.apply_case_dispatch_with_proofs($1::bigint[],$2,$3::jsonb)',[ids,'Mapped dispatch',JSON.stringify(metadata)]);
    const proofRows=(await db.query('SELECT r.id,r.status,d.file_url,d.file_name,d.file_type FROM public.trademark_records r JOIN public.trademark_documents d ON (d.id,d.record_id)=(r.dispatch_document_id,r.id) WHERE r.id=ANY($1::bigint[]) ORDER BY r.id',[ids])).rows;
    assert.equal(proofRows.length,2);
    assert.equal(proofRows[0].status,'DISPATCHED'); assert.equal(proofRows[1].status,'DISPATCHED');
    for (const row of proofRows) {
      assert.equal(row.file_url,metadata.proofByCase[row.id].dispatchedImage);
      assert.equal(row.file_name,metadata.proofByCase[row.id].dispatchedDocName);
      assert.equal(row.file_type,metadata.proofByCase[row.id].dispatchedDocType);
    }
    await db.exec('SAVEPOINT missing_case_proof');
    await assert.rejects(db.query('SELECT public.apply_case_dispatch_with_proofs($1::bigint[],$2,$3::jsonb)',[ids,'Retry',JSON.stringify({ ...metadata, proofByCase:{[ids[0]]:metadata.proofByCase[ids[0]]} })]),/individual Drive proofs/);
    await db.exec('ROLLBACK TO SAVEPOINT missing_case_proof');
  } finally { await db.exec('ROLLBACK'); }
});

test('recovery remaps an explicit proof relationship into a populated target', async () => {
  await db.exec('BEGIN');
  try {
    await db.exec("INSERT INTO public.trademark_records(id,mark_name,selection_menu,client_code,case_no) VALUES(801,'EXISTING','PROOF','973','001')");
    const source={clients:[],records:[{id:801,mark_name:'RECOVER PROOF',selection_menu:'PROOF',client_code:'972',case_no:'001',dispatch_document_id:803}],history:[],documents:[{id:803,record_id:801,file_name:'PROOF',file_url:'https://example.com/proof.pdf'}]};
    const report=(await db.query('SELECT public.restore_recovery_snapshot($1::jsonb) AS report',[JSON.stringify(source)])).rows[0].report;
    assert.notEqual(report.caseIdMap['801'],801);
    const row=(await db.query('SELECT r.id,d.record_id,d.file_url FROM public.trademark_records r JOIN public.trademark_documents d ON (r.dispatch_document_id,r.id)=(d.id,d.record_id) WHERE r.id=$1',[report.caseIdMap['801']])).rows[0];
    assert.equal(String(row.id),String(row.record_id)); assert.equal(row.file_url,'https://example.com/proof.pdf');
    await db.exec('SET CONSTRAINTS fk_case_dispatch_document IMMEDIATE');
    assert.equal((await db.query('SELECT public.restore_recovery_snapshot($1::jsonb) AS report',[JSON.stringify(source)])).rows[0].report.alreadyRestored,true);
  } finally { await db.exec('ROLLBACK'); }
});

test('normal API staging claims execution once, freezes input and captures the original response atomically', async () => {
  await db.exec('BEGIN; SET LOCAL ROLE service_role');
  const id='d0b9b2e4-2cad-49f2-b519-2be2fbc042c7';
  const input='{"operation":"getRecords"}';
  const hash=value=>createHash('sha256').update(value).digest('hex');
  const encoded=value=>Buffer.from(value).toString('base64');
  const rejectSafely=async(sql,params,pattern)=>{
    await db.exec('SAVEPOINT app_transfer_failure');
    await assert.rejects(db.query(sql,params),pattern);
    await db.exec('ROLLBACK TO SAVEPOINT app_transfer_failure');
  };
  try {
    await db.query('SELECT public.start_application_request($1,$2,$3,$4)',[id,'database',encoded(input),hash(input)]);
    const started=(await db.query('SELECT purpose,claimed_at FROM public.recovery_transfers WHERE id=$1',[id])).rows[0];
    assert.equal(started.purpose,'database'); assert.ok(started.claimed_at);
    await rejectSafely('SELECT public.claim_application_transfer($1)',[id],/execution already started/);
    await rejectSafely('SELECT public.put_recovery_chunk($1,0,$2)',[id,encoded(input)],/chunks are immutable/);
    const output='{"ok":true,"result":{"id":1}}';
    await db.query('SELECT public.complete_application_transfer($1,$2,$3,$4,$5,$6)',[id,Buffer.byteLength(output),1,hash(output),201,encoded(output)]);
    const captured=(await db.query('SELECT t.*,c.content FROM public.recovery_transfers t JOIN public.recovery_transfer_chunks c ON c.transfer_id=t.id WHERE t.id=$1',[id])).rows[0];
    assert.equal(captured.purpose,'api-result'); assert.equal(captured.direction,'download'); assert.equal(captured.claimed_at,null);
    assert.equal(captured.response_status,201); assert.equal(Buffer.from(captured.content,'base64').toString(),output);
    await rejectSafely('SELECT public.claim_application_transfer($1)',[id],/unavailable/);
    await rejectSafely('SELECT public.start_application_request($1,$2,$3,$4)',['16a539df-425a-4570-9385-26c7ec7df939','database',encoded(input),'0'.repeat(64)],/Invalid inline request/);
    for(const role of ['anon','authenticated']) {
      const access=(await db.query("SELECT has_function_privilege($1,'public.start_application_request(uuid,text,text,text)','EXECUTE') AS allowed",[role])).rows[0];
      assert.equal(access.allowed,false);
    }
  } finally {await db.exec('ROLLBACK');}
});

test('API transport cannot claim recovery packages and rejects unknown targets and oversized input', async()=>{
  await db.exec('BEGIN; SET LOCAL ROLE service_role');
  const id='ba576a94-82a6-4c92-8384-d0ebd11d279b';
  const rejectSafely=async(sql,params,pattern)=>{
    await db.exec('SAVEPOINT app_scope_failure');
    await assert.rejects(db.query(sql,params),pattern);
    await db.exec('ROLLBACK TO SAVEPOINT app_scope_failure');
  };
  try {
    await db.query('SELECT public.begin_recovery_transfer($1,$2,$3,$4,$5)',[id,'upload',4,1,'a'.repeat(64)]);
    await db.query('SELECT public.put_recovery_chunk($1,0,$2)',[id,'dGVzdA==']);
    await rejectSafely('SELECT public.claim_application_transfer($1)',[id],/unavailable/);
    await rejectSafely('SELECT public.begin_application_transfer($1,$2,$3,$4,$5)',['805ce528-0460-4acc-b3de-c3adf47f4e17','restore',4,1,'a'.repeat(64)],/invalid target/);
    await rejectSafely('SELECT public.begin_application_transfer($1,$2,$3,$4,$5)',['805ce528-0460-4acc-b3de-c3adf47f4e17','database',12582913,25,'a'.repeat(64)],/exceeds its limit/);
    assert.equal((await db.query('SELECT count(*)::int n FROM public.recovery_transfers')).rows[0].n,1);
  } finally {await db.exec('ROLLBACK');}
});
