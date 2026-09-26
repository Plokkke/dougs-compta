# @plokkke/n8n-nodes-dougs

[n8n](https://n8n.io/) community node for [Dougs](https://www.dougs.fr/), built on
[`@plokkke/dougs-compta`](../sdk).

## Installation

In n8n: **Settings → Community Nodes → Install**, then enter `@plokkke/n8n-nodes-dougs`.
See the [n8n guide](https://docs.n8n.io/integrations/community-nodes/installation/).

This node is not verified by n8n (it relies on its SDK at runtime). From n8n 3.0, self-hosted instances must set
`N8N_UNVERIFIED_PACKAGES_ENABLED=true` to install it.

## Operations

| Resource          | Operations                   |
| ----------------- | ---------------------------- |
| Expense           | Create                       |
| Mileage Allowance | Create                       |
| Operation         | Validate, Invalidate, Delete |
| Session           | Request Code, Verify Code    |
| Vendor Invoice    | Upload (PDF, JPEG, PNG)      |

Companies, cars, partners and expense categories are picked from searchable lists. Amounts are typed in euros and sent
as integer cents; dates keep the calendar day chosen in the picker. With **Continue On Fail**, a failing item outputs
its error and the others go on. The node can also be used as a tool by AI agents.

## Credentials

Create a **Dougs Login API** credential with the email and password of your Dougs account, and a **Session Token**.

Dougs protects logins with a code sent by email, which a credential cannot type. The node therefore works from a
session token, valid about a month, and fails with an explicit "session expired" error once it is gone. Two ways to
keep it fresh:

- **By hand**: log in to app.dougs.fr, copy the `auth_session` cookie into **Session Token**.
- **With a workflow**, fully automated, using the **Session** operations:

```
Schedule (every 3 weeks)
  → Dougs · Session · Request Code        logs in, has the code emailed, outputs the pending session
  → Wait 1 min
  → Gmail · Get Many                      from:noreply@dougs.fr subject:"Votre code de connexion Dougs", newest
  → Code                                  extract the 6 digits
  → Dougs · Session · Verify Code         outputs the verified sessionToken and its expiry
  → HTTP Request                          PATCH /api/v1/credentials/{id} of your n8n instance (n8n API key)
                                          { "data": { "sessionToken": "…" }, "isPartialData": true }
```

`isPartialData` merges the new token into the credential and keeps the email and password. Disable saving successful
executions for that workflow, so the token does not linger in the execution history.

## Compatibility

Built and tested against `n8n-workflow` 2.38, Node 20+.
