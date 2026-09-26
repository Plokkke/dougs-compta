# @plokkke/n8n-nodes-dougs

[n8n](https://n8n.io/) community node for [Dougs](https://www.dougs.fr/), built on
[`@plokkke/dougs-compta`](../sdk).

## Installation

In n8n: **Settings → Community Nodes → Install**, then enter `@plokkke/n8n-nodes-dougs`.
See the [n8n guide](https://docs.n8n.io/integrations/community-nodes/installation/).

## Operations

| Resource          | Operations                   |
| ----------------- | ---------------------------- |
| Expense           | Create                       |
| Mileage Allowance | Create                       |
| Operation         | Validate, Invalidate, Delete |
| Vendor Invoice    | Upload (PDF, JPEG, PNG)      |

Companies, cars, partners and expense categories are picked from searchable lists. Amounts are typed in euros and sent
as integer cents; dates keep the calendar day chosen in the picker. With **Continue On Fail**, a failing item outputs
its error and the others go on.

A typical workflow: an email trigger receives a receipt, and **Vendor Invoice → Upload** attaches it in Dougs.

## Credentials

Create a **Dougs Login API** credential with the email and password of your Dougs account. The node logs in like the
web app does and renews the session when it expires.

## Compatibility

Built and tested against `n8n-workflow` 2.x, Node 20+.
