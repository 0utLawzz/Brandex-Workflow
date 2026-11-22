export type BackupAsset = {
  assetId: string;
  recordId: number;
  source: 'case-logo' | 'dispatch-proof' | 'delivery-proof' | 'document';
  fileName: string;
  mimeType: string;
  sourceUrl: string;
  embedded: boolean;
  bytesIncluded: boolean;
};

export type BackupPackageInput = {
  records: Array<Record<string, any>>;
  clients: Array<Record<string, any>>;
  history: Array<Record<string, any>>;
  documents: Array<Record<string, any>>;
};

const isDataUrl = (value: string) => /^data:[^;,]+(?:;[^,]*)?,/i.test(value);

function addAsset(
  assets: BackupAsset[],
  recordId: number,
  source: BackupAsset['source'],
  value: unknown,
  fileName: string,
  mimeType: string
) {
  if (typeof value !== 'string' || !value.trim()) return;
  const sourceUrl = value.trim();
  // Keep every non-empty asset reference visible. Unknown schemes/paths are
  // deliberately marked as missing bytes instead of being silently ignored.
  assets.push({
    assetId: `${recordId}:${source}:${assets.length + 1}`,
    recordId,
    source,
    fileName,
    mimeType,
    sourceUrl,
    embedded: isDataUrl(sourceUrl),
    // Only data URLs contain file bytes in the JSON itself. HTTP(S) and unknown
    // references require an external copy and therefore remain incomplete.
    bytesIncluded: isDataUrl(sourceUrl),
  });
}

export function buildBackupAssetManifest(input: BackupPackageInput): BackupAsset[] {
  const assets: BackupAsset[] = [];
  for (const record of input.records) {
    const id = Number(record.id);
    if (!Number.isSafeInteger(id) || id < 1) continue;
    addAsset(assets, id, 'case-logo', record.img, `case-${id}-logo`, 'image/*');
    addAsset(assets, id, 'dispatch-proof', record.dispatchedImage, record.dispatchedDocName || `case-${id}-dispatch-proof`, record.dispatchedDocType || 'application/octet-stream');
    addAsset(assets, id, 'delivery-proof', record.receiptImage, `case-${id}-delivery-proof`, 'image/*');
  }
  for (const document of input.documents) {
    const id = Number(document.record_id);
    if (!Number.isSafeInteger(id) || id < 1) continue;
    addAsset(assets, id, 'document', document.file_url, String(document.file_name || `case-${id}-document`), String(document.file_type || 'application/octet-stream'));
  }
  return assets;
}

export function createBackupPackage(input: BackupPackageInput, exportedAt = new Date().toISOString()) {
  const assets = buildBackupAssetManifest(input);
  const missingAssetBytes = assets.filter(asset => !asset.bytesIncluded);
  return {
    version: '3.0-brandex',
    schemaVersion: 3,
    exportedAt,
    appName: 'Brandex Law Associates CMS',
    backupStatus: missingAssetBytes.length ? 'partial' : 'complete',
    backupNotice: missingAssetBytes.length
      ? `This backup contains all exported database rows and an asset manifest, but ${missingAssetBytes.length} external file(s) are URL references only. Their file bytes are not included.`
      : 'All detected file assets are embedded in this package.',
    counts: {
      records: input.records.length,
      clients: input.clients.length,
      history: input.history.length,
      documents: input.documents.length,
      assets: assets.length,
      assetsWithBytes: assets.filter(asset => asset.bytesIncluded).length,
      assetsMissingBytes: missingAssetBytes.length,
    },
    records: input.records,
    clients: input.clients,
    history: input.history,
    documents: input.documents,
    assets,
  };
}

export function validateBackupPackage(json: string): {
  success: boolean;
  message: string;
  data?: Record<string, any>;
} {
  try {
    const data = JSON.parse(json);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { success: false, message: 'Invalid backup JSON object.' };
    }
    for (const key of ['records', 'clients', 'history', 'documents']) {
      if (data[key] !== undefined && !Array.isArray(data[key])) {
        return { success: false, message: `Backup field "${key}" must be an array.` };
      }
    }
    const records = Array.isArray(data.records) ? data.records : [];
    const clients = Array.isArray(data.clients) ? data.clients : [];
    const history = Array.isArray(data.history) ? data.history : [];
    const documents = Array.isArray(data.documents) ? data.documents : [];
    if (records.some((row: any) => !row || typeof row !== 'object' || !Number.isSafeInteger(Number(row.id)) || Number(row.id) < 1)) {
      return { success: false, message: 'Backup contains a case without a valid positive ID.' };
    }
    if (clients.some((row: any) => !row || typeof row !== 'object' || !Number.isSafeInteger(Number(row.id)) || Number(row.id) < 1)) {
      return { success: false, message: 'Backup contains a client without a valid positive ID.' };
    }
    const recordIds = new Set(records.map((row: any) => Number(row.id)));
    if (history.some((row: any) => !row || !recordIds.has(Number(row.record_id)))) {
      return { success: false, message: 'Backup history contains a broken case reference.' };
    }
    if (documents.some((row: any) => !row || !recordIds.has(Number(row.record_id)))) {
      return { success: false, message: 'Backup documents contain a broken case reference.' };
    }
    if (data.assets !== undefined && !Array.isArray(data.assets)) {
      return { success: false, message: 'Backup asset manifest must be an array.' };
    }
    if (Array.isArray(data.assets) && data.assets.some((asset: any) =>
      !asset || typeof asset !== 'object' || !Number.isSafeInteger(Number(asset.recordId)) ||
      !recordIds.has(Number(asset.recordId)) || typeof asset.sourceUrl !== 'string'
    )) {
      return { success: false, message: 'Backup asset manifest contains an invalid or unlinked asset.' };
    }
    return {
      success: true,
      message: `Backup contains ${records.length} cases, ${clients.length} clients, ${history.length} history rows, and ${documents.length} document references.`,
      data,
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to parse backup JSON.' };
  }
}
