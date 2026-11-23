import { getSupabaseClient } from './supabase';

/** Resolve saved destinations server-side; browser folder IDs are never authoritative. */
export async function resolveGenerationDestination(recordId: number) {
  const client = getSupabaseClient();
  const { data: record, error } = await client.from('trademark_records').select('id,client_id,client_code,drive_folder_id').eq('id', recordId).single();
  if (error || !record) throw new Error('Saved case destination could not be loaded. Verify the destination migration.');
  let query = client.from('clients').select('id,client_prefix,client_code,name,city,folder_reference,drive_folder_id');
  if (record.client_id) query = query.eq('id', record.client_id);
  else {
    const code = String(record.client_code || '').trim();
    if (!/^\d{1,3}$/.test(code)) throw new Error('Case has no resolvable client identity.');
    query = query.in('client_code', Array.from(new Set([code, code.padStart(3, '0'), String(Number(code))])));
  }
  const { data: clients, error: clientError } = await query;
  if (clientError || !clients || clients.length !== 1) throw new Error('Select one unambiguous saved client before generation.');
  const profile = clients[0];
  const folderId = record.drive_folder_id || profile.drive_folder_id || '';
  if (folderId && !/^[A-Za-z0-9_-]{10,200}$/.test(folderId)) throw new Error('Saved Drive folder ID is invalid. Choose the folder again.');
  return { driveFolderId: folderId, clientPrefix: profile.client_prefix || '', clientName: profile.name || '', clientCity: profile.city || '', clientFolderReference: profile.folder_reference || '', destinationMode: record.drive_folder_id ? 'case' : profile.drive_folder_id ? 'client' : 'configured-root' };
}
