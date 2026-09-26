import type { FetchLike } from '../src/http';

export type RecordedRequest = { method: string; url: URL; headers: Record<string, string>; body: unknown };

export type Reply = Response | ((request: RecordedRequest) => Response);

export function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
}

export function status(code: number, headers: Record<string, string> = {}): Response {
  return new Response(code === 204 ? null : `status ${code}`, { status: code, headers });
}

/** Answers requests in order with the scripted replies, and records what was sent. */
export function scriptedFetch(...replies: Reply[]) {
  const requests: RecordedRequest[] = [];
  const fetch: FetchLike = async (input, init = {}) => {
    const request = {
      method: init.method ?? 'GET',
      url: new URL(input),
      headers: (init.headers ?? {}) as Record<string, string>,
      body: typeof init.body === 'string' ? JSON.parse(init.body) : init.body,
    };
    requests.push(request);
    const reply = replies.shift();
    if (!reply) {
      throw new Error(`Unexpected request ${request.method} ${request.url}`);
    }
    return typeof reply === 'function' ? reply(request) : reply;
  };
  return { fetch, requests };
}

export const noSleep = async () => undefined;
