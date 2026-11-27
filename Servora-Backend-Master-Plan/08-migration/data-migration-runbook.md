# Data Migration Runbook Template

For each domain, copy this template into a domain-specific runbook.

## Before
- [ ] Confirm authoritative source and target.
- [ ] Snapshot/backup source.
- [ ] Confirm schema and indexes.
- [ ] Detect duplicates and invalid rows.
- [ ] Map legacy IDs.
- [ ] Dry-run migration; output counts and errors.
- [ ] Confirm rollback plan and owner.

## Execute
- [ ] Freeze or control writes if required by the consistency plan.
- [ ] Run idempotent migration with batch limits.
- [ ] Record checkpoint/cursor and rejected rows.
- [ ] Avoid logging PII.
- [ ] Verify counts and key relationships.

## After
- [ ] Compare source/target counts and sampled records.
- [ ] Compare monetary totals where applicable.
- [ ] Verify indexes and query plans.
- [ ] Run tenant-isolation and functional tests.
- [ ] Enable feature flag for controlled cohort.
- [ ] Monitor and reconcile.
- [ ] Keep source path available for rollback until sign-off.
