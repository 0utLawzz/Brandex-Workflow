import { buildBackupAssetManifest, validateBackupPackage } from './backup-package.ts';
import { validateSharedSettings } from './shared-settings.ts';

type Row = Record<string, any>;
export type RestorePreflight = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  counts: { cases: number; clients: number; history: number; documents: number; missingAssets: number; idCollisions: number; existingReferences: number };
};

function caseIdentity(row: Row): string {
  const series = String(row.selectionMenu || '').trim().toUpperCase();
  const code = String(row.clientCode || '').trim();
  const number = String(row.caseNo || '').trim();
  return /^[A-Z][A-Z0-9]{0,7}$/.test(series) && /^\d{1,3}$/.test(code) && /^\d{1,3}$/.test(number)
    ? `${series}-${code.padStart(3, '0')}-${number.padStart(3, '0')}` : '';
}

/** Read-only validation. Collision counts require explicit ID mapping at execution. */
export function preflightRestore(sourceJson: string, destinationJson: string): RestorePreflight {
  const report: RestorePreflight = { valid: false, errors: [], warnings: [], counts: { cases: 0, clients: 0, history: 0, documents: 0, missingAssets: 0, idCollisions: 0, existingReferences: 0 } };
  const source = validateBackupPackage(sourceJson);
  const destination = validateBackupPackage(destinationJson);
  if (!source.success || !source.data) { report.errors.push(source.message); return report; }
  if (!destination.success || !destination.data) { report.errors.push(`Destination snapshot invalid: ${destination.message}`); return report; }
  const data = source.data;
  if (data.schemaVersion !== 3 || data.version !== '3.0-brandex') report.errors.push('Full recovery requires a version 3 backup. Legacy snapshots need an explicit conversion review.');
  for (const table of ['records', 'clients', 'history', 'documents'] as const) {
    if (!Array.isArray(data[table])) { report.errors.push(`Missing ${table} collection.`); continue; }
    const seen = new Set<number>();
    const destinationIds = new Set((destination.data[table] || []).map((row: Row) => Number(row.id)));
    for (const row of data[table]) {
      const id = Number(row.id);
      if (!Number.isSafeInteger(id) || id < 1 || seen.has(id)) report.errors.push(`${table}: invalid or duplicate source ID ${row.id}.`);
      seen.add(id);
      if (destinationIds.has(id)) report.counts.idCollisions++;
    }
  }
  const records: Row[] = data.records || [];
  const clients: Row[] = data.clients || [];
  const clientIds = new Map(clients.map(row => [Number(row.id), row]));
  const codes = new Set<string>();
  for (const client of clients) {
    const raw = String(client.client_code || '').trim();
    const code = raw.padStart(3, '0');
    if (!/^\d{1,3}$/.test(raw) || codes.has(code)) report.errors.push(`Client ${client.id}: missing or duplicate client code.`);
    codes.add(code);
  }
  const references = new Set<string>();
  const existing = new Set((destination.data.records || []).map(caseIdentity).filter(Boolean));
  for (const row of records) {
    const reference = caseIdentity(row);
    if (!reference || references.has(reference)) report.errors.push(`Case ${row.id}: missing or duplicate case identity.`);
    references.add(reference);
    if (existing.has(reference)) report.counts.existingReferences++;
    if (row.clientId !== undefined && row.clientId !== null) {
      const client = clientIds.get(Number(row.clientId));
      if (!client) report.errors.push(`Case ${row.id}: unresolved client ${row.clientId}.`);
      else if (String(client.client_code).padStart(3, '0') !== String(row.clientCode).padStart(3, '0')) report.errors.push(`Case ${row.id}: client relationship does not match client code.`);
    } else report.warnings.push(`Case ${row.id}: no explicit client relationship in source; do not infer one.`);
  }
  // Reconstruct from actual rows; never trust a manifest's bytesIncluded flag.
  const assets = buildBackupAssetManifest({ records, clients, history: data.history || [], documents: data.documents || [] });
  report.counts = { ...report.counts, cases: records.length, clients: clients.length, history: (data.history || []).length, documents: (data.documents || []).length, missingAssets: assets.filter(asset => !asset.bytesIncluded).length };
  if (report.counts.missingAssets) report.warnings.push(`${report.counts.missingAssets} files contain references only; file recovery is incomplete.`);
  if (report.counts.idCollisions) report.warnings.push('Destination IDs overlap; execution must remap parent and child IDs without overwriting.');
  if (report.counts.existingReferences) report.warnings.push('Existing case references require duplicate detection and content comparison before execution.');
  if (data.series !== undefined) {
    const seen = new Set<string>();
    for (const series of data.series) {
      const code = series?.series_code;
      if (typeof code !== 'string' || !/^[A-Z][A-Z0-9]{0,7}$/.test(code) || seen.has(code) || typeof series.is_active !== 'boolean' || !Number.isInteger(series.sort_order) || series.sort_order < 0 || series.sort_order > 10000) {
        report.errors.push('Series collection contains invalid or duplicate configuration.'); continue;
      }
      seen.add(code);
      const existing = (destination.data.series || []).find((row: Row) => row.series_code === code);
      if (existing && (existing.is_active !== series.is_active || existing.sort_order !== series.sort_order)) report.errors.push(`Series ${code} conflicts with the destination registry; reconcile before recovery.`);
    }
  } else report.warnings.push('Series configuration is absent from this backup and will remain unchanged.');
  if (data.workspaceSettings !== undefined) {
    try {
      if (data.workspaceSettings.length !== 1 || destination.data.workspaceSettings?.length !== 1) throw new Error('A single source and destination settings row is required.');
      const source = validateSharedSettings(data.workspaceSettings[0]);
      const target = validateSharedSettings(destination.data.workspaceSettings[0]);
      const same = ['display_name','brand_prefix','tagline','logo_url'].every(key => source[key as keyof typeof source] === target[key as keyof typeof target]);
      const emptyTarget = ['records','clients','history','documents'].every(key => destination.data![key]?.length === 0);
      const initialTarget = target.revision === 1 && target.display_name === 'BRANDEX' && target.brand_prefix === 'BRANDEX' && !target.tagline && !target.logo_url;
      if (!same && !(emptyTarget && initialTarget)) throw new Error('Workspace branding conflicts; reconcile destination settings before recovery.');
    } catch (error) { report.errors.push(error instanceof Error ? error.message : 'Invalid workspace settings.'); }
  } else report.warnings.push('Shared branding is absent from this backup and will remain unchanged.');
  report.valid = report.errors.length === 0;
  return report;
}
