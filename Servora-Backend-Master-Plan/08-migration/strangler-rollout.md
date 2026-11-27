# Strangler Migration and Rollout

## Pattern
- Existing frontend can continue using current services.
- Add a backend adapter for one domain.
- Run local/staging comparisons before routing real traffic.
- Cut over behind a feature flag.
- Keep rollback available until data correctness is proven.
- Do not migrate unrelated domains in the same release.

## Per-domain stages
1. Discovery: inventory current reads/writes and side effects.
2. Contract: define request/response mapping and error behavior.
3. Backfill: repeatable, idempotent, dry-run-capable.
4. Verify: counts, IDs, totals, sample records and relationships.
5. Shadow/staging: compare old and new behavior without duplicate writes.
6. Limited rollout: controlled users/branches.
7. Observe: latency, errors, mismatches and support reports.
8. Expand: only when metrics and reconciliation pass.
9. Retire old path: only after stable period and explicit sign-off.

## Rollback
- Feature flag returns requests to old path.
- Preserve old records and compatibility IDs.
- Avoid reverse dual-write unless explicitly designed.
- Document whether writes since cutover require replay or reconciliation.
- Never roll back by deleting orders or payment history.
