# Observability and Reliability Targets

Do not invent final numeric SLOs before baseline traffic and product expectations are known. Start by collecting measurements.

## Metrics
- Request count, latency percentiles, status code/error rate.
- MongoDB readiness, query latency and pool pressure.
- Order creation success/failure and idempotency conflicts.
- Invalid/denied authorization attempts.
- Queue/job attempts and dead-letter count.
- Webhook verification failures and reconciliation mismatches.
- Migration mismatch counts.

## Logs
- JSON structured logs.
- Request/correlation ID across API and jobs.
- Safe error codes and route templates.
- No raw credentials, auth tokens, QR tokens or payment secrets.

## Alerts to define
- Sustained 5xx increase.
- Readiness/database outage.
- Order creation failures above agreed threshold.
- Growing job backlog or repeated permanent failures.
- Payment reconciliation mismatch.
- Unusual auth/QR abuse rate.

## Runbooks
- MongoDB unavailable.
- High API error rate.
- Failed order write/retry.
- Duplicate or mismatched operational record.
- Payment webhook failure.
- Suspected credential exposure.
- Rollback after a domain cutover.
