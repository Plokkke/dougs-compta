import type { z } from 'zod';

export class DougsApiError extends Error {
  override readonly name = 'DougsApiError';

  constructor(
    readonly method: string,
    readonly path: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(`${method} ${path} -> HTTP ${status}${body ? `: ${body.slice(0, 200)}` : ''}`);
  }
}

const MAX_REPORTED_ISSUES = 5;

/** The API answered, but not with the shape this SDK relies on: better to stop than to guess. */
export class DougsSchemaError extends Error {
  override readonly name = 'DougsSchemaError';

  constructor(
    readonly path: string,
    readonly issues: z.core.$ZodIssue[],
  ) {
    const details = issues
      .slice(0, MAX_REPORTED_ISSUES)
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ');
    const more = issues.length > MAX_REPORTED_ISSUES ? ` (and ${issues.length - MAX_REPORTED_ISSUES} more)` : '';
    super(`Unexpected response shape from ${path}: ${details}${more}`);
  }
}

export class DougsAuthError extends Error {
  override readonly name = 'DougsAuthError';
}
