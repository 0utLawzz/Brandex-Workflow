type AccessEnvironment = Record<string, string | undefined>;

/** Only an entirely unconfigured local demo can run without staff sign-in. */
export function allowUnauthenticatedLocalDemo(env: AccessEnvironment): boolean {
  return env.NODE_ENV !== 'production' && env.VERCEL_ENV === undefined &&
    !env.APP_ACCESS_USER && !env.APP_ACCESS_PASSWORD &&
    !env.SUPABASE_SERVICE_ROLE_KEY && !env.APPS_SCRIPT_RECORDS_TOKEN;
}
