# Implementation Roadmap

Work in dependency order. Do not begin broad endpoint implementation before the gates in earlier milestones pass.

## M0 — Plan and repository baseline
- [ ] Review current repo and this planning pack.
- [ ] Confirm existing frontend flows and production host.
- [ ] Add package scripts, strict TypeScript, lint and lockfile.
- [ ] Add CI: typecheck, build, tests, secret scan.
- [ ] Validate config, health and Mongo readiness.
- Exit gate: CI green and local setup documented.

## M1 — Identity and tenant authorization
- [ ] Select auth provider only after explicit decision.
- [ ] Implement server-side token verifier adapter.
- [ ] Define membership model, roles and permissions.
- [ ] Add authorization middleware/service.
- [ ] Add cross-tenant and cross-branch denial tests.
- Exit gate: no protected route can be reached without verified identity + authorized membership.

## M2 — Restaurant and branch domain
- [ ] Define exact fields from current frontend.
- [ ] Implement CRUD, validation, pagination and audit.
- [ ] Map legacy IDs.
- [ ] Integration and compatibility tests.
- Exit gate: owner/manager scopes verified; feature flag ready.

## M3 — Settings and menu
- [ ] Restaurant/branch setting precedence.
- [ ] Category and item CRUD.
- [ ] Price representation and availability rules.
- [ ] Image URL/storage contract.
- [ ] Tenant isolation and frontend compatibility.
- Exit gate: menu reads/writes stable in staging.

## M4 — QR/table sessions
- [ ] Document current QR URL patterns.
- [ ] Generate/store hashed high-entropy tokens.
- [ ] Resolve, rotate, revoke and expire tokens.
- [ ] Public endpoint abuse controls.
- Exit gate: old QR codes pass compatibility suite.

## M5 — Orders
- [ ] Map all existing order side effects.
- [ ] Implement server-side pricing and item snapshots.
- [ ] Implement idempotency and order state machine.
- [ ] Audit events and order events.
- [ ] Preserve customer history and notification behavior.
- [ ] Design stock effects explicitly.
- Exit gate: duplicate retries, state transitions and totals pass tests.

## M6 — Kitchen and notifications
- [ ] Queue/list endpoints and state transitions.
- [ ] Durable event/job design as required.
- [ ] Retry and manual recovery.
- Exit gate: operational flow verified under retries/outages.

## M7 — Inventory
- [ ] Inventory item and movement ledger.
- [ ] Idempotent consumption/reversal.
- [ ] Negative-stock policy approved.
- [ ] Reconciliation report.
- Exit gate: ledger and derived balance reconcile.

## M8 — Billing/payment boundary review
- [ ] Audit Supabase schema/RLS and current provider.
- [ ] Remove production fake-success fallback.
- [ ] Verify webhook/idempotency/reconciliation.
- [ ] No ownership migration without explicit approval.
- Exit gate: payment state is provider-verified and auditable.

## M9 — Staging rollout
- [ ] Feature flags per domain.
- [ ] Data migration dry-run and reconciliation.
- [ ] Smoke, security and performance baseline.
- [ ] Rollback runbook rehearsed.
- Exit gate: controlled cohort sign-off.

## M10 — Phase 2 extensions
- Delivery operations and other product features only after core ordering, tenant isolation and reliability are stable.
