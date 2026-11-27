# System Architecture

## Recommended initial shape
A modular monolith: one API deployment, one MongoDB operational store, and explicit module boundaries. Split workers/services only when operational load or reliability needs justify the added cost.

```text
Existing React/Vite frontend
        |
        | HTTPS /v1 API (gradual migration by domain)
        v
Express + TypeScript API
  | config / middleware / validation / auth adapter
  | restaurants / branches / menu / QR / orders / kitchen / inventory
  | audit / integrations / jobs boundaries
  |
  +---- MongoDB: operational source of truth
  |
  +---- Supabase: existing billing/payment records remain authoritative
  |
  +---- Payment provider: signed webhook -> verification -> reconciliation
  |
  +---- Optional messaging/notification providers (chosen later)
```

## Layer responsibilities
- Routes: HTTP binding only; parse request and call controller/service.
- Controllers: translate request context and service result to HTTP response.
- Services: business rules and state transitions.
- Repositories: persistence/query implementation where abstraction helps.
- Models: schema and indexes, not authorization policy.
- Middleware: request IDs, auth context, validation, rate limits, error handling.
- Integrations: provider adapters and webhook verification.
- Jobs: retryable asynchronous work with explicit idempotency.

## Module boundaries
1. Platform config and health.
2. Identity/auth adapter and memberships.
3. Tenant/restaurant and branches.
4. Settings.
5. Menu/catalog.
6. QR/table sessions.
7. Orders.
8. Kitchen.
9. Customers/history.
10. Inventory.
11. Notifications/jobs.
12. Billing/payment boundary.
13. Audit and observability.

## Architectural rules
- Business services do not trust unvalidated raw request bodies.
- Controllers do not implement complex business rules.
- All tenant queries require an authorized tenant context.
- Cross-system effects are not performed as casual dual writes.
- External provider adapters must be replaceable.
