export class RequestPayloadError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
export async function readBoundedJson(request: Request, maxBytes: number): Promise<unknown> {
  const declared = request.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) throw new RequestPayloadError('Request exceeds its byte limit.', 413);
  if (!request.body) throw new RequestPayloadError('Request body is required.', 400);
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let length = 0;
  let text = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) { await reader.cancel(); throw new RequestPayloadError('Request exceeds its byte limit.', 413); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof RequestPayloadError) throw error;
    throw new RequestPayloadError('Invalid JSON request.', 400);
  } finally { reader.releaseLock(); }
}
