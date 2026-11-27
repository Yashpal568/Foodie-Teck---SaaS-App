# Non-Functional Requirements

## Security
- Deny by default.
- Server-side authentication and tenant authorization.
- Strict input validation and output minimization.
- Secrets only in environment/secret manager.
- No raw auth tokens, payment secrets or QR tokens in logs.
- Dependency and secret scanning in CI.

## Reliability
- Graceful shutdown and connection draining.
- Idempotency for retryable writes.
- Timeouts for external services.
- Bounded retries with exponential backoff and jitter.
- Reconciliation for cross-system state.

## Performance
- Indexes based on actual query patterns.
- Pagination on collection endpoints.
- Avoid N+1 database calls.
- Add caching only after correctness and invalidation strategy are understood.
- Establish performance budgets from baseline measurements rather than guessing.

## Scalability
- Start with a modular monolith and a managed MongoDB deployment when production warrants it.
- Separate worker process only when background workload justifies it.
- Use connection pooling and rate limits.
- Avoid microservices and high-retention data collection until usage requires them.

## Observability
- Structured JSON logs with request IDs.
- Metrics: request count, latency, error rate, DB readiness/latency, job failures, webhook failures, order creation and idempotency collisions.
- Alerts for sustained error spikes, failed jobs and payment reconciliation mismatches.
- Do not include secrets or unnecessary PII in telemetry.

## Maintainability
- Strict TypeScript.
- Consistent route/controller/service/repository boundaries where complexity justifies them.
- OpenAPI contract.
- Unit, integration, security and migration tests.
- Architecture decision log.
