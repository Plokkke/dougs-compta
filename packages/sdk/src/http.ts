import { DougsApiError } from './errors';

export const DOUGS_BASE_URL = 'https://app.dougs.fr';

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type RetryPolicy = {
  maxRetries: number;
  retryableStatuses: ReadonlySet<number>;
  backoffMs: (attempt: number) => number;
};

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 4,
  retryableStatuses: new Set([429, 500, 502, 503, 504]),
  backoffMs: (attempt) => 500 * attempt,
};

/** Replaying these cannot create a duplicate: a 5xx on them is safe to retry. */
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'PUT', 'DELETE']);

export interface Authenticator {
  cookie(): Promise<string>;
  /** Called once on HTTP 401. Resolves to true when a new session was obtained. */
  renew(): Promise<boolean>;
}

export type Query = Record<string, string | number | boolean | undefined>;

export type RequestOptions = {
  query?: Query;
  json?: unknown;
  form?: FormData;
  /** Overrides the method-based idempotency rule, e.g. for a full-state update sent as POST. */
  idempotent?: boolean;
  anonymous?: boolean;
  headers?: Record<string, string>;
};

export type HttpClientOptions = {
  baseUrl: string;
  fetch: FetchLike;
  retry: RetryPolicy;
  sleep: (ms: number) => Promise<void>;
  auth?: Authenticator;
};

/** Transport settings shared by the client and the standalone login steps; all injectable for tests. */
export type ConnectionOptions = {
  baseUrl?: string;
  fetch?: FetchLike;
  retry?: RetryPolicy;
  sleep?: (ms: number) => Promise<void>;
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function connection(options: ConnectionOptions = {}): HttpClientOptions {
  return {
    baseUrl: options.baseUrl ?? DOUGS_BASE_URL,
    fetch: options.fetch ?? fetch,
    retry: options.retry ?? DEFAULT_RETRY_POLICY,
    sleep: options.sleep ?? wait,
  };
}

export class HttpClient {
  constructor(private readonly options: HttpClientOptions) {}

  async request(method: string, path: string, opts: RequestOptions = {}): Promise<Response> {
    const response = await this.withRetries(method, opts, () => this.send(method, path, opts));
    if (response.status === 401 && !opts.anonymous && (await this.options.auth?.renew())) {
      return this.ensureOk(method, path, await this.send(method, path, opts));
    }
    return this.ensureOk(method, path, response);
  }

  async json(method: string, path: string, opts?: RequestOptions): Promise<unknown> {
    const response = await this.request(method, path, opts);
    const text = await response.text();
    return text ? JSON.parse(text) : undefined;
  }

  private async withRetries(method: string, opts: RequestOptions, send: () => Promise<Response>): Promise<Response> {
    const { maxRetries, backoffMs } = this.options.retry;
    for (let attempt = 1; ; attempt += 1) {
      const response = await send();
      if (attempt > maxRetries || !this.isRetryable(method, opts, response.status)) {
        return response;
      }
      await this.options.sleep(retryAfterMs(response) ?? backoffMs(attempt));
    }
  }

  private isRetryable(method: string, opts: RequestOptions, status: number): boolean {
    if (!this.options.retry.retryableStatuses.has(status)) {
      return false;
    }
    const idempotent = opts.idempotent ?? IDEMPOTENT_METHODS.has(method);
    return idempotent || status === 429;
  }

  private async send(method: string, path: string, opts: RequestOptions): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Origin: this.options.baseUrl,
      ...opts.headers,
    };
    if (!opts.anonymous && this.options.auth) {
      headers.Cookie = await this.options.auth.cookie();
    }
    if (opts.json !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    const body = opts.form ?? (opts.json === undefined ? undefined : JSON.stringify(opts.json));
    return this.options.fetch(buildUrl(this.options.baseUrl, path, opts.query), { method, headers, body });
  }

  private async ensureOk(method: string, path: string, response: Response): Promise<Response> {
    if (response.ok) {
      return response;
    }
    const body = await response.text().catch(() => '');
    throw new DougsApiError(method, path, response.status, body);
  }
}

export function buildUrl(baseUrl: string, path: string, query: Query = {}): URL {
  const url = new URL(path, baseUrl);
  Object.entries(query)
    .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined)
    .forEach(([key, value]) => url.searchParams.set(key, String(value)));
  return url;
}

function retryAfterMs(response: Response): number | undefined {
  const seconds = Number(response.headers.get('retry-after'));
  return response.headers.has('retry-after') && Number.isFinite(seconds) ? seconds * 1000 : undefined;
}
