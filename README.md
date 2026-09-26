# dougs-compta

[![CI](https://github.com/Plokkke/dougs-compta/actions/workflows/ci.yml/badge.svg)](https://github.com/Plokkke/dougs-compta/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@plokkke/dougs-compta.svg)](https://www.npmjs.com/package/@plokkke/dougs-compta)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Unofficial TypeScript toolkit for [Dougs](https://www.dougs.fr/), the online accounting firm that keeps the books of
my consulting company. Dougs has no public API, only the private one behind its web app. This repository wraps it in
a typed client, then builds two tools on top:

| Package                                          | What it does                                                                                        |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| [`@plokkke/dougs-compta`](packages/sdk)          | Typed client: session handling, idempotency-aware retries, validated responses, integer-cent inputs |
| [`@plokkke/dougs-cli`](packages/cli)             | `dougs export`: the whole bookkeeping as lossless JSON + CSV, invoice documents included            |
| [`@plokkke/n8n-nodes-dougs`](packages/n8n-nodes) | n8n node: book expenses and mileage allowances, validate operations, upload receipts from workflows |

I built it to automate recurring bookkeeping chores (mileage allowances, receipts) from n8n, and to keep a full,
independent copy of my company's accounting data.

## Highlights

- **Retries that cannot double-book.** Transient failures (429, 5xx) are retried with backoff and `Retry-After`, but a
  `POST` that creates an operation is only replayed after a 429, when the server provably did nothing. Full-state updates
  opt in explicitly as idempotent.
- **Fail fast on API drift.** Every response is validated with Zod. When Dougs changes a field, the client stops with the
  offending path (`0.amount: expected number`) instead of writing a wrong figure into the books.
- **Typed yet lossless.** Schemas type what the code relies on and keep every other field, so the export is a faithful
  copy and not a projection of what this library happened to know.
- **Integer cents, calendar dates.** Callers pass `amountCents` and `YYYY-MM-DD` dates. The conversion to the float euros
  the API expects happens in one audited place, and a date never travels as an instant a timezone could shift.
- **Tested against the contract, mutation-checked.** Tests run against a scripted `fetch` (no network), cover retries,
  re-login on 401, pagination and payload shapes, and the SDK suite kills 91% of [Stryker](https://stryker-mutator.io/)
  mutants.
- **Safe exports.** CSV cells that a spreadsheet would execute as formulas are neutralised, amounts go through integer
  cents (`0.30`, never `0.30000000000000004`), and document downloads are concurrency-limited and resumable.

## Quick start

```bash
# Export everything to ./export (raw JSON, CSV, manifest), with the invoice PDFs
DOUGS_EMAIL=you@company.com DOUGS_PASSWORD=... npx @plokkke/dougs-cli export --files
```

```ts
import { DougsClient } from '@plokkke/dougs-compta';

const dougs = new DougsClient({ auth: { email: process.env.DOUGS_EMAIL!, password: process.env.DOUGS_PASSWORD! } });
const { company } = await dougs.getMe();

const expense = await dougs.registerExpense(company.id, {
  date: '2026-03-31',
  memo: 'Train Paris - Lyon',
  amountCents: 8_450,
  categoryId: 77,
  partnerId: 5,
});
await dougs.validateOperation(company.id, expense.id);
```

## Architecture

```
packages/
  sdk/         HTTP layer (retries, auth hook) → session (login, cookie expiry) → client (endpoints + Zod schemas)
  cli/         export: raw JSON writer, CSV columns, resumable concurrent downloads
  n8n-nodes/   declarative operations → generated n8n properties, list-search lookups
```

The two tools only depend on the SDK's public API; the SDK depends on nothing but Zod and the platform `fetch`.

## Development

```bash
pnpm install
pnpm validate        # build, lint, typecheck, test every package
pnpm mutation        # Stryker mutation testing of the SDK
```

Node 20+ and pnpm are required. CI runs the validation on Node 20, 22 and 24.

## Scope and responsibility

This project is not affiliated with Dougs. It only talks to the account of the person running it, with that person's
own credentials, like the web app does; exporting is the right to data portability (GDPR, article 20) put into
practice. Requests are rate-limit friendly (bounded concurrency, `Retry-After` honoured). Credentials are read from the
environment or a git-ignored file, never logged, and exported data is git-ignored by default.

## License

[MIT](LICENSE)
