/** Write routes require an explicit browser origin matching the public proxy URL. */
export function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const url = new URL(request.url);
    const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host') || url.host;
    const protocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || url.protocol.slice(0, -1);
    if (!['http', 'https'].includes(protocol)) return false;
    const publicUrl = new URL(`${protocol}://${host}`);
    const supplied = new URL(origin);
    return supplied.origin === publicUrl.origin && origin === supplied.origin;
  } catch { return false; }
}
