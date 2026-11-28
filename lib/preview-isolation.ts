export const DEFAULT_PRODUCTION_PROJECT_REF = 'pjthtvkzuthxwpvcdqxy';
type Environment = Record<string, string | undefined>;

/** Preview writes require an explicitly reviewed disposable target; production is never a test target. */
export function previewWriteError(env: Environment, databaseUrl: string, scriptUrl?: string): string | null {
  if (env.VERCEL_ENV !== 'preview') return null;
  const databaseError = 'Preview changes are locked. Configure an approved test database first.';
  try {
    const target = new URL(databaseUrl);
    const approved = env.PREVIEW_WRITE_PROJECT_REF;
    if (!approved || [DEFAULT_PRODUCTION_PROJECT_REF, env.PRODUCTION_PROJECT_REF].includes(approved) ||
      target.protocol !== 'https:' || target.hostname !== `${approved}.supabase.co` || target.username || target.password || target.port) return databaseError;
  } catch { return databaseError; }
  if (scriptUrl !== undefined) {
    const production = env.PRODUCTION_APPS_SCRIPT_URL;
    const approved = env.PREVIEW_APPS_SCRIPT_URL;
    const scriptPattern = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;
    if (!approved || !production || approved === production || scriptUrl !== approved || !scriptPattern.test(approved) || !scriptPattern.test(production)) {
      return 'Preview file changes are locked. Configure separate approved test and production Apps Script destinations.';
    }
  }
  return null;
}
