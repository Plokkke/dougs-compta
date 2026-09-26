# Changelog

## 1.1.0

### Added

- Email verification codes at login: the client requests the email, then `onMfaChallenge` provides the code. It
  detects whether the new session is already authenticated, so accounts without a second factor keep working.
- `requestLoginCode` and `verifyLoginCode` expose both halves of that login, for callers that cannot prompt (an n8n
  workflow reads the code from the mailbox), and `DougsMfaRequiredError` tells them a new code is needed.
- `auth` accepts credentials together with a saved `sessionToken`: the saved session is used first, and the client logs
  in again only once it expires.

## 1.0.1

### Fixed

- Schemas aligned with responses recorded on a real account: categories may have a `null` description and no
  `keywords` (now `[]`), a car may have no partner, vendor invoices may be `partially_paid`.
- Schema errors list the first five issues and count the rest, instead of printing every failing item.

## 1.0.0

Rewrite on the platform `fetch`; the only runtime dependency left is Zod (axios, lodash, luxon and mime-types removed).

### Breaking changes

- `DougsApiByLogin({ username, password })` becomes `new DougsClient({ auth: { email, password } })`, or
  `{ auth: { sessionToken } }` to reuse an existing session.
- Money inputs are integer cents with an explicit name: `ExpenseInput.amountCents` replaces `amount`.
- Dates are `YYYY-MM-DD` strings instead of luxon `DateTime`.
- `MileageInput.distanceKm` replaces `distance`.
- `getCars`, `getPartners`, `getCategories` are renamed `listCars`, `listPartners`, `listCategories`.
- Responses keep the fields the SDK does not model (they used to be stripped).

### Added

- Retries that never replay a non-idempotent `POST` after a 5xx, and honour `Retry-After`.
- Re-login on HTTP 401 and before the session cookie expires.
- `iterateOperations` / `listOperations` walk every page of operations.
- `listVendorInvoices`, `downloadFile`, `getCompany`, `listCollection`.
- Typed errors: `DougsApiError`, `DougsSchemaError`, `DougsAuthError`.

### Packaging

- Only the built library is published (`files: ["dist"]`, single entry point). Versions before 1.0.0 are no longer
  supported.
