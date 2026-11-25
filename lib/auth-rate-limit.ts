import { checkRateLimit } from '@vercel/firewall';

export type AuthRateLimitResult = { allowed: true } | { allowed: false; status: 429 | 503 };
type AuthRateLimitEnvironment = Record<string, string | undefined>;
type RateLimitCheck = typeof checkRateLimit;

/**
 * Distributed authentication-attempt limit. Vercel deployments must have a
 * matching Firewall SDK rule; local development does not call the platform.
 */
export async function checkAuthAttemptRateLimit(
  request: Request,
  env: AuthRateLimitEnvironment = process.env,
  check: RateLimitCheck = checkRateLimit,
): Promise<AuthRateLimitResult> {
  if (env.VERCEL !== '1') return { allowed: true };
  const id = env.VERCEL_AUTH_RATE_LIMIT_ID?.trim();
  if (!id) return { allowed: false, status: 503 };

  try {
    const result = await check(id, { request, timeout: 1000 });
    if (result.error === 'blocked' || result.rateLimited) return { allowed: false, status: 429 };
    if (result.error) return { allowed: false, status: 503 };
    return { allowed: true };
  } catch {
    return { allowed: false, status: 503 };
  }
}
