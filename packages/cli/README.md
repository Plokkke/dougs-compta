# @plokkke/dougs-cli

Exports the whole bookkeeping of your [Dougs](https://www.dougs.fr/) company: to audit it, to feed your own tools, or to
switch accounting firm without losing history.

```bash
DOUGS_EMAIL=you@company.com DOUGS_PASSWORD=... npx @plokkke/dougs-cli export --out ./export --files
```

Credentials come from `DOUGS_SESSION`, or `DOUGS_EMAIL` + `DOUGS_PASSWORD`, or a git-ignored `.dougs.json`
(`{"email","password"}` or `{"sessionToken"}`).

| Output                             | Content                                                         |
| ---------------------------------- | --------------------------------------------------------------- |
| `raw/*.json`                       | Every API response, complete: the lossless source of truth      |
| `operations.csv`                   | One line per operation (bank line, expense, mileage allowance…) |
| `operations-breakdowns.csv`        | One line per breakdown, with accounting number, VAT and partner |
| `vendor-invoices.csv`              | Vendor invoices                                                 |
| `accounts.csv`, `declarations.csv` | Bank accounts, tax and social filings                           |
| `manifest.json`                    | Company, counts, date range                                     |
| `files/vendor-invoices/`           | Invoice documents (`--files`); re-running skips what is on disk |

Amounts are written with two decimals through integer cents, and cells that a spreadsheet would run as a formula are
escaped. The exit code is `2` when some documents could not be downloaded.
