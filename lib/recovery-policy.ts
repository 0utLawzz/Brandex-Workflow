export type RecoveryOptions = { confirmed: boolean; allowMissingAssets: boolean };
export type RecoveryReport = { count: number; clients: number; history: number; documents: number; series: number; workspaceSettings: number; configurationIncluded: boolean; missingAssets: number; restoredAssets: number; originalIdsPreserved: boolean; alreadyRestored: boolean; caseIdMap: Record<string, number>; clientIdMap: Record<string, number>; packageHash: string; projectRef: string };

export function assertRecoveryTarget(url: string, enabled: string | undefined, approvedRef: string | undefined, confirmed: boolean): string {
  if (!confirmed) throw new Error('Review the preflight and explicitly confirm restore.');
  const target = new URL(url);
  const reference = target.hostname.split('.')[0];
  if (enabled !== 'true' || !approvedRef || target.protocol !== 'https:' || target.hostname !== `${approvedRef}.supabase.co`) throw new Error('Restore is disabled for this database. A reviewed target must be enabled by its administrator.');
  return reference;
}
