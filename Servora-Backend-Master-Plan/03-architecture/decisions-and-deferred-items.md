# Decisions and Deferred Items

## Decided
- Node.js, Express, TypeScript, MongoDB for operational backend.
- Supabase remains billing/payment record source of truth.
- Existing frontend and QR routes are migrated incrementally.
- Auth/OTP provider is deferred.
- Preserve legacy IDs.
- Avoid unnecessary infrastructure and data retention cost.

## Proposed; confirm during M0/M1
- Modular monolith.
- Mongoose.
- Zod.
- OpenAPI 3.1.
- Vitest + Supertest.
- Feature flags by migrated domain.
- Structured JSON logs and request ID propagation.

## Must be answered before related implementation
- Authentication provider and exact token type.
- Restaurant staff invitation and owner onboarding flow.
- Final roles/permissions based on current UI.
- Production host and domain.
- Payment provider webhook contract, if changing or adding provider.
- Existing Supabase schema, live RLS policies and payment fallback behavior.
- Inventory negative-stock and order cancellation/refund policy.
- Data retention, export and deletion rules.
- Notification providers and failure policy.
- Whether current realtime events remain on Supabase during early phases.
