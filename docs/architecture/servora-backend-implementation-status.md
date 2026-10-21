# Servora Backend Implementation Status

## Current decisions
- Backend foundation: Node.js + Express + TypeScript.
- MongoDB: operational data (restaurants, menus, tables, QR sessions, orders, inventory and kitchen workflow).
- Supabase: payment records, payment verification and subscriptions/billing records.
- OTP provider and final identity-provider choice: deferred; do not block backend foundation on this.
- Existing frontend and QR ordering flows remain unchanged until a migration slice is tested.
- No protected business endpoint may be released without verified authentication and restaurant/tenant authorization.

## Implemented in the foundation
- [x] TypeScript API package scaffold.
- [x] Startup environment validation.
- [x] MongoDB connection and readiness check.
- [x] Security headers, CORS allowlist and JSON request-size limit.
- [x] Basic API rate limiting.
- [x] Liveness/readiness routes.
- [x] Graceful shutdown.
- [x] No business routes exposed before auth/authorization are ready.

## Next phases
1. Run dependency installation and typecheck in CI or a development environment.
2. Add structured logging, request IDs and centralized validation conventions.
3. Design schemas for restaurants, menus, table sessions and orders; preserve legacy IDs.
4. Implement an authentication adapter and tenant authorization after provider choice. Until then, keep the current frontend auth/data path unchanged.
5. Add a first low-risk read-only API slice and compare results with current frontend behavior.
6. Add one low-risk write path with audit logs, feature flag and rollback.
7. Migrate order creation only after idempotency, consistency, retry and reconciliation are tested.
8. Integrate Supabase payment/subscription records through verified provider webhooks and idempotent handlers.
9. Deploy to staging, run security and compatibility tests, then cut over gradually.
10. Phase 2 mobile delivery app consumes the same stable API.

## Safety gates
- Never put MongoDB URI, Supabase service-role key, Clerk secret key or other private secrets in VITE_* frontend variables.
- Do not trust client-supplied user or restaurant IDs without server-side authorization.
- Do not dual-write the same entity to MongoDB and Supabase as independent operations.
- Do not report payment success from client-side fallback logic.
- Preserve existing QR URLs and restaurant identifiers during migration.
