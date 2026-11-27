# Pre-Implementation Checklist

Do not begin broad feature implementation until this checklist is reviewed.

## Repository and frontend discovery
- [ ] Confirm default branch and current open backend PR state.
- [ ] Inventory existing frontend services/hooks and direct Supabase access.
- [ ] Map current order creation, stock changes, notifications, customer history and realtime.
- [ ] Inspect current billing fallback behavior; ensure no fake production payment success.
- [ ] Confirm actual production host and deployment configuration.
- [ ] Export/document current Supabase schema and RLS policies.

## Product decisions
- [ ] Confirm role/permission matrix against existing product.
- [ ] Confirm order cancellation and stock reversal policy.
- [ ] Confirm table/session expiry and QR rotation behavior.
- [ ] Confirm customer data retention requirements.
- [ ] Decide auth provider before protected routes are enabled.
- [ ] Confirm payment provider and webhook behavior before payment integration changes.

## Engineering readiness
- [ ] Complete package baseline, lockfile and CI.
- [ ] Run typecheck, build and tests.
- [ ] Create dev/staging database.
- [ ] Establish migration script conventions.
- [ ] Establish logging, monitoring and rollback.
- [ ] Review this master plan and update decision log.

## First implementation ticket
After M0 validation, implement M1 identity/tenant authorization only once provider selection is approved. If provider remains undecided, work on provider-independent membership/permission design and tests without exposing protected endpoints.
