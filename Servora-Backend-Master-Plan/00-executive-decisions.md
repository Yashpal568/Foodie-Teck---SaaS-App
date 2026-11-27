# Executive Decisions and Constraints

## DECIDED
| Topic | Decision |
|---|---|
| Backend language/runtime | Node.js + TypeScript |
| HTTP framework | Express |
| Operational database | MongoDB |
| Billing/payment record ownership | Supabase |
| Existing frontend | Keep working; migrate incrementally |
| Legacy IDs | Preserve and map; do not casually replace |
| QR URL compatibility | Preserve current formats and test old QR codes |
| Auth/OTP provider | Deferred |
| Migration approach | Strangler pattern, one domain at a time |
| Cost strategy | Start lean; scale based on measured demand |
| Payment correctness | Verified webhooks, idempotency, reconciliation |
| Public/business APIs before auth | Deny by default |

## PROPOSED
- Modular monolith first, not microservices.
- Versioned API prefix `/v1`.
- Zod schemas for request validation.
- Mongoose for MongoDB models.
- OpenAPI as the canonical machine-readable API contract.
- Structured JSON logs with request IDs.
- Feature flags per migrated domain.
- Outbox/retry pattern only where cross-system events require durable delivery.

## DEFERRED
- Authentication/OTP provider and delivery channel.
- Production hosting target and domain.
- SMS/WhatsApp provider and credentials.
- Payment provider specifics, unless already configured by the existing app.
- Exact production retention periods and legal policies.
- Real-time transport choice for every screen (existing Supabase Realtime may remain during migration).

## Do not do
- Do not enable business routes with placeholder auth.
- Do not move payment/billing source of truth to MongoDB.
- Do not store secrets in frontend `VITE_*` variables.
- Do not accept client-provided prices or totals as authoritative.
- Do not silently change QR URLs.
- Do not dual-write MongoDB and Supabase without an explicit consistency/reconciliation design.
- Do not migrate all domains in one release.
