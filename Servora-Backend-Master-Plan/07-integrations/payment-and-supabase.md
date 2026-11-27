# Payment and Supabase Integration Plan

## Existing boundary
Supabase remains the source of truth for payment records, payment verification and subscription/billing records. Preserve current flow until the live schema, RLS policies and provider behavior have been inspected.

## Required review
- [ ] Map every frontend payment/billing service call.
- [ ] Inspect actual payment provider and webhook configuration.
- [ ] Inspect Supabase tables, RLS policies and service-role usage.
- [ ] Identify local fallbacks that simulate success when a backend is unavailable.
- [ ] Ensure simulated success cannot run in production.
- [ ] Define idempotency and state transition rules.
- [ ] Define reconciliation schedule and mismatch handling.

## Webhook requirements
- Verify signature using provider-prescribed raw request bytes.
- Enforce event ID deduplication.
- Validate timestamp/replay window where supported.
- Acknowledge only after durable acceptance, according to provider retry semantics.
- Keep processing idempotent.
- Log request/event IDs, not secrets or full sensitive payloads.
- Never treat a browser redirect as proof of payment.

## Do not
- Move billing records to MongoDB as part of the operational data migration.
- Mark order paid based on order status.
- Run MongoDB and Supabase writes as though they share one transaction.
- Invent provider-specific endpoints before confirming the provider.
