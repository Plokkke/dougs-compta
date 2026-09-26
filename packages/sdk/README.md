# @plokkke/dougs-compta

Unofficial typed client for the private API of [Dougs](https://www.dougs.fr/). See the
[repository README](https://github.com/Plokkke/dougs-compta#readme) for the design notes.

```bash
npm install @plokkke/dougs-compta
```

```ts
import { DougsClient } from '@plokkke/dougs-compta';

const dougs = new DougsClient({ auth: { email: 'you@company.com', password: '...' } });
// or reuse a browser session: new DougsClient({ auth: { sessionToken: '<auth_session cookie>' } })

const { company } = await dougs.getMe();
for await (const operation of dougs.iterateOperations(company.id, { validated: false })) {
  console.log(operation.date, operation.wording, operation.amount);
}
```

## API

| Method                                                                                           | Endpoint                                   |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `getMe()`                                                                                        | `GET /users/me`                            |
| `getCompany(companyId)`                                                                          | `GET /companies/:id`                       |
| `listCars`, `listPartners`, `listCategories(companyId, type, search?)`                           | reference data                             |
| `listCollection(companyId, name)`                                                                | any of `COMPANY_COLLECTIONS`, untyped      |
| `iterateOperations(companyId, filter?)`, `listOperations`                                        | `GET /companies/:id/operations`, paginated |
| `getOperation`, `validateOperation`, `invalidateOperation`, `updateOperation`, `deleteOperation` | single operation                           |
| `registerExpense(companyId, { date, amountCents, categoryId, partnerId, memo?, vatExemption? })` | new expense                                |
| `registerMileageAllowance(companyId, { date, distanceKm, carId?, memo? })`                       | new mileage allowance                      |
| `listVendorInvoices`, `uploadVendorInvoice(companyId, fileName, bytes)`                          | vendor invoices (PDF, JPEG, PNG)           |
| `downloadFile(filePath)`                                                                         | stored documents                           |

Errors are typed: `DougsApiError` (HTTP status, method, path, body excerpt), `DougsSchemaError` (unexpected response
shape, with the failing paths) and `DougsAuthError`.

`fetch`, `sleep`, `now`, `baseUrl` and the `retry` policy are injectable, which is how the test suite runs without network.

See [CHANGELOG](CHANGELOG.md) to migrate from 0.x.
