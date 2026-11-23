export type SharedSettings = { display_name: string; brand_prefix: string; tagline: string; logo_url: string; revision: number };
export const DEFAULT_BRAND: SharedSettings = { display_name: 'BRANDEX', brand_prefix: 'BRANDEX', tagline: '', logo_url: '', revision: 0 };
export function validateSharedSettings(value: unknown): SharedSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid shared settings.');
  const row = value as Record<string, unknown>;
  const result = {} as SharedSettings;
  for (const [key, max] of [['display_name', 80], ['brand_prefix', 12], ['tagline', 160], ['logo_url', 2048]] as const) {
    if (typeof row[key] !== 'string' || row[key].length > max) throw new Error(`Invalid ${key.replaceAll('_', ' ')}.`);
    result[key] = row[key].trim();
  }
  if (!result.display_name || !/^[A-Za-z0-9 -]{1,12}$/.test(result.brand_prefix)) throw new Error('Display name and valid brand prefix are required.');
  if (result.logo_url) {
    const url = new URL(result.logo_url);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Logo must use an HTTPS URL without credentials.');
  }
  if (!Number.isSafeInteger(row.revision) || Number(row.revision) < 1) throw new Error('Reload settings before saving.');
  result.revision = Number(row.revision);
  return result;
}
