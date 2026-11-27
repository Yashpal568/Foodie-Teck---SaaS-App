# Testing Strategy

## Unit tests
- Pure business calculations: totals, taxes, discounts and rounding.
- Order state machine.
- Permission evaluation.
- Validation schemas.
- Idempotency key/payload mismatch handling.
- QR token hashing and expiry policy.

## Integration tests
- MongoDB repository queries.
- Unique index and duplicate handling.
- Order create/retry behavior.
- Order transition and audit event.
- Inventory movement/replay.
- Outbox/job retry behavior.
- Supabase/payment integration adapter using provider-approved test fixtures.

## Security tests
- Missing/invalid/expired token.
- Cross-tenant and cross-branch reads/writes.
- Mass assignment attempts.
- Object ID enumeration.
- Rate-limit behavior.
- Oversized/malformed request.
- QR token replay/rotation behavior.
- Webhook signature failure/replay.
- Secret redaction in logs.

## Contract tests
- OpenAPI schema validation.
- Existing frontend payload/response compatibility.
- Error response consistency.
- Legacy QR URL compatibility.

## Migration tests
- Dry-run idempotency.
- Resume after partial failure.
- Duplicate legacy IDs.
- Count and monetary reconciliation.
- Rollback path.

## Required gates
A business route is not production-ready until unit, integration, tenant-isolation, contract and migration-relevant tests pass.
