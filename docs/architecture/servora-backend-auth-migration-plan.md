# Servora Backend & Identity Migration Plan
## Repository-grounded architecture, phased migration, and Phase 2 mobile delivery app

**Repository:** `Yashpal568/Foodie-Teck---SaaS-App`  
**Reviewed ref:** `main`  
**Document status:** Architecture and migration plan; implementation has not started  
**Core constraint:** Keep the currently deployed web application functioning for existing clients throughout the migration.

---

## 0. Executive decision

Servora is currently a Vite + React SPA using Supabase JavaScript SDK directly from the frontend. Supabase currently provides PostgreSQL, Auth, RLS, and Realtime. The repository does not currently contain a dedicated Node.js backend package; `src/services/billing.service.js` calls a presumed `VITE_API_URL` but implements local fallback behavior if the API is unavailable.

### Target architecture

- **Frontend:** Keep the existing React/Vite web application. Do not rewrite it during backend introduction.
- **Backend:** Add a separate Node.js + Express API, preferably TypeScript for new backend code, behind a versioned REST API.
- **Database:** Use MongoDB for new backend-owned application domains, once the migration strategy and data ownership are agreed. Keep the existing Supabase/PostgreSQL project available for the legacy web application during the transition.
- **Authentication:** Adopt Clerk for new identity and OTP flows. The Node API must verify Clerk session/JWT tokens on every protected request.
- **Migration:** Use a **strangler pattern**: migrate one domain at a time behind adapters, with feature flags and rollback. Do not flip all frontend calls from Supabase to MongoDB in one release.
- **Realtime:** Preserve current Supabase Realtime channels while existing pages depend on them. For new Node/Mongo domains, add an explicit realtime channel later (e.g. Socket.IO/SSE or a managed realtime service) only after requirements are measured.
- **Mobile app:** Phase 2 only. It will consume the same Node API and Clerk identity; do not build mobile-only business logic or a separate database.

### The key safety principle

**Do not migrate production clients' data or force their authentication to Clerk until the new path is proven on a staging copy and there is a tested rollback.** Existing users, QR URLs, subscriptions, restaurant IDs, order history, table sessions, and admin flows are production compatibility constraints.

---

## 1. What was inspected in the repository

Reviewed the repository tree and key files from the default `main` branch, including:

- `package.json`
- `.env.example`
- `wrangler.json`
- `vercel.json`
- `README.md`
- `src/App.jsx`
- `src/lib/supabase.js`
- `src/lib/api.js`
- `src/lib/adminSupabase.js`
- `src/lib/adminDataService.js`
- `src/services/restaurant.service.js`
- `src/services/menu.service.js`
- `src/services/order.service.js`
- `src/services/table.service.js`
- `src/services/customer.service.js`
- `src/services/admin.service.js`
- `src/services/billing.service.js`
- `src/hooks/useOrderManagement.js`
- `src/hooks/useTableSessions.js`
- `src/pages/marketing/LoginPage.jsx`
- `src/pages/marketing/RegisterPage.jsx`
- `src/pages/marketing/ForgotPasswordPage.jsx`
- `src/pages/marketing/ResetPasswordPage.jsx`
- `src/components/auth/MerchantProtectedRoute.jsx`
- `src/components/admin/AdminProtectedRoute.jsx`
- `src/components/dashboard/OrderManagement.jsx`
- `src/pages/CustomerMenu.jsx`
- `src/docs/supabase_schema_and_rls.sql`
- `src/docs/diagram/database_schema.md`
- `src/docs/diagram/product_specs.md`
- `src/docs/diagram/plan_schema.md`

The repository has 231 entries in the recursive tree at the time it was inspected. This was a review of the complete tree and selected critical files, not a line-by-line audit of every JSX/component file.

### Current technical baseline

- Vite and React, JavaScript/JSX, React Router.
- `@supabase/supabase-js` is a direct frontend dependency.
- Current package scripts include `dev`, `build`, `lint`, and `preview`; no `test` script was present in the inspected `package.json`.
- Frontend service modules directly read/write Supabase tables.
- Customer menus use public restaurant/menu reads and Supabase Realtime for order updates.
- Merchant/admin login and registration rely on Supabase Auth and direct database reads.
- Existing merchant route guard includes local/session-storage authorization shortcuts that must not be treated as server-side security.
- Order creation inserts the order and order items in separate requests, then independently adjusts table state, inventory, notifications, customer CRM and broadcasts. A server-side transactional service should eventually own this critical workflow.
- Supabase SQL schema contains 16 main tables: restaurants, subscriptions, payment_verifications, payment_methods, menu_categories, menu_items, table_sessions, qr_codes, orders, order_items, gst_settings, customers, support_tickets, ticket_replies, notifications, waiter_calls and audit_logs.
- RLS is enabled, but the inspected SQL includes broad policies such as public `USING (true)` / `WITH CHECK (true)` for orders, order_items, table_sessions, restaurants, subscriptions, payment verifications, payment methods, audit logs, ticket replies and waiter calls. **This is a serious security concern that must be reviewed before increasing traffic or adding a privileged backend.**
- The SQL file appears to be a setup/fix script, not proof that it exactly matches the live production schema. Introspect the real Supabase project before planning a migration.
- `src/services/billing.service.js` calls `/api/billing/*`, but if that API cannot be reached, it falls back to client-side tax/pricing calculations and even simulated invoice/payment success. This must not be treated as production-safe billing. Do not remove these fallbacks until callers have been migrated and tested, but make them observable and never claim payment success based only on fallback behavior.
- `.env.example` and `wrangler.json` include a Supabase URL and public/anon key, plus a default admin email/password placed in frontend runtime variables. The Supabase anon key is intended to be public, but RLS must be secure. **A privileged admin password must never be exposed through Vite variables or shipped in the frontend bundle.** Rotate/remove any exposed real admin credential and move privileged admin authorization server-side. Verify whether the apparent password is a placeholder or has ever been used.
- Both `vercel.json` and `wrangler.json` exist. Confirm which platform currently serves production before changing deployments. The frontend's Vercel rewrite is SPA routing; `wrangler.json` builds static assets to `dist`.

Repository: https://github.com/Yashpal568/Foodie-Teck---SaaS-App

---

## 2. Migration principles

1. **No big-bang rewrite.** Existing clients are live. Continue using their existing schema and IDs until the specific domain is migrated.
2. **No dual writes by default.** Writing to Supabase and MongoDB independently without an outbox/idempotency design can create split-brain data. Prefer one source of truth per domain and controlled one-way migration.
3. **Stable public URLs.** Existing QR code URLs and menu URLs must continue working unchanged.
4. **Stable restaurant IDs.** Keep legacy Supabase restaurant UUIDs as `legacyRestaurantId` in MongoDB. Do not replace the IDs embedded in QR URLs during the initial rollout.
5. **Stable order IDs where needed.** Existing Supabase UUIDs remain usable in old web pages and reports. New IDs must carry an explicit provider/system mapping.
6. **Feature-flagged routing.** Every migrated feature can be switched back to the legacy implementation without requiring a frontend redeploy where feasible.
7. **Observability first.** Log API errors, auth failures, latency and migration paths with request IDs; do not log tokens, OTPs, passwords or sensitive customer data.
8. **Protect tenants at every layer.** Derive tenant membership from authenticated identity/server-side membership records, never trust a client-supplied restaurant ID by itself.
9. **Test on sanitized staging copy.** Do not copy production customer PII into staging unnecessarily.
10. **Cut over incrementally.** One internal/admin capability first, then low-risk read domains, then writes, then critical order workflows and identity migration.

---

## 3. Target system architecture

```text
Existing Servora Web (React/Vite)               Phase 2 Mobile App
         |                                               |
         | Clerk session token after migration           | Clerk session token
         +--------------------------+--------------------+
                                    |
                              HTTPS /v1 API
                                    |
                          Node.js + Express API
                                    |
             +----------------------+----------------------+
             |                      |                      |
         Auth/RBAC              Domain services       Integration adapters
             |                      |                      |
             |                +-----+------+        Petpooja (after approval)
             |                |            |        Zomato/Swiggy (if approved)
             |             MongoDB      Legacy Supabase
             |             (new/       (temporary legacy
             |             migrated     source domains)
             |             domains)
             |
          Clerk token verification + Servora membership/roles

Realtime:
- Preserve existing Supabase Realtime for legacy screens during transition.
- New Node/Mongo order events use a documented event channel when implemented.
- Do not mix two realtime sources for the same migrated domain without deduplication.
```

### Clarify database responsibility before coding

The user requested MongoDB support. MongoDB should not be introduced merely as a second database with no defined ownership. Recommended allocation:

- **Supabase/PostgreSQL (temporary legacy):** existing client data and tables until each migration is complete; keep available to old code during rollout.
- **MongoDB (new backend-owned domains):** begin with integration connections/events, API idempotency records, background jobs, and new mobile-specific delivery domain later. For core restaurant/menu/order data, choose a deliberate cutover per domain after a schema mapping and rollback plan.
- **Clerk:** identity provider only. Clerk does not replace Servora's restaurant membership, tenant authorization, business records, or audit requirements.

Because the existing data is relational and already protected (though some policies are overly permissive), there is a real cost to migrating everything to MongoDB. Before moving all domain data, compare the operational benefits with keeping PostgreSQL for transactional restaurant order data. If MongoDB is a firm product requirement, use it for the new backend domain model and migrate domain-by-domain; do not retain PostgreSQL and MongoDB as permanent competing sources for the same data.

---

## 4. Authentication design with Clerk OTP

### Target identity flow

- Clerk manages registration, phone/email verification, OTP, sessions, recovery and identity.
- React uses Clerk's official React SDK to sign in and obtain a session token.
- React sends the token as `Authorization: Bearer <token>` to Node.
- Node verifies the Clerk session token using Clerk's supported backend SDK/middleware and configured issuer/key.
- Node loads the Servora user profile and restaurant memberships from backend-controlled data.
- Backend authorization checks role, tenant membership, and resource scope for every protected endpoint.

### Do not equate Clerk user ID with restaurant ID

Create a mapping:

```text
clerkUserId
   ↕
servoraUser
   ↕
restaurantMembership(s)
   ↕
restaurant/outlet IDs (including legacy Supabase UUID)
```

One owner may eventually have multiple outlets or staff memberships. The identity model must support this instead of one user = one restaurant.

### OTP decisions

- Configure Clerk for the intended channel (phone/SMS OTP, email OTP, or both). Decide explicitly which channel is the main sign-in identifier.
- Use Clerk's built-in verification flow; **do not implement OTP generation/verification yourself**.
- Apply rate limits and abuse controls; do not expose whether an arbitrary phone/email belongs to an account.
- Test OTP expiry, resend rate limits, wrong OTP, replay, session expiry, sign-out and compromised-session revocation.
- OTP service availability/costs and supported flows must be verified in Clerk's current plan/docs before launch.
- Existing Supabase-authenticated users require an account-linking/migration process. Do not assume their password hashes can be transferred into Clerk. Use an invitation/verified-email-or-phone linking flow, or a controlled reset/reverification.
- Preserve admin separation. Super-admin status must be stored in trusted backend role/membership data; never accept `user_metadata.role`, localStorage, or frontend env variables as proof of super-admin access.

### First identity rollout

1. Introduce Clerk in staging only.
2. Build a server-side `/v1/me` endpoint.
3. Map test Clerk users to test Servora memberships.
4. Add a hidden/flagged login path.
5. Test the full existing merchant workflows.
6. Pilot with an internal/demo account.
7. Only then invite one consenting existing client.
8. Keep the existing Supabase-auth flow available to non-migrated clients until completion.

---

## 5. Node.js backend responsibilities

### Initial stack

- Node.js LTS
- Express
- TypeScript recommended for backend code
- Zod or equivalent request validation
- Clerk backend SDK for authentication
- MongoDB Node driver or Mongoose (choose one; avoid mixed access patterns)
- Structured logger (e.g. Pino)
- Central error handling
- OpenAPI documentation
- Unit/integration tests
- Health/readiness endpoints
- Rate limiting and request size limits
- CORS allowlist
- Request correlation IDs

Do not split into microservices now. Use a modular monolith, then extract workers/services only when measured load or operational constraints justify it.

### Proposed folder structure

```text
server/
  package.json
  tsconfig.json
  .env.example
  src/
    app.ts
    server.ts
    config/
      env.ts
      clerk.ts
      mongo.ts
      legacySupabase.ts
    middleware/
      authenticate.ts
      requireRole.ts
      requireRestaurantMembership.ts
      validateRequest.ts
      rateLimit.ts
      requestId.ts
      errorHandler.ts
    modules/
      auth/
      users/
      memberships/
      restaurants/
      menu/
      tables/
      tableSessions/
      orders/
      customers/
      inventory/
      analytics/
      admin/
      integrations/
        petpooja/
        zomato/
        swiggy/
    repositories/
    services/
    jobs/
    queues/
    observability/
    tests/
  openapi/
  Dockerfile (only if chosen deployment needs it)
```

### API standards

- Prefix all endpoints with `/v1`.
- JSON request/response contract.
- Consistent errors: `{ error: { code, message, requestId } }`.
- Pagination for orders/customers/audit lists.
- Validate all inputs server-side.
- Do not leak stack traces or secrets.
- Idempotency keys for order creation and external webhooks.
- Use transactions where supported by the chosen data store and workflow.
- Separate liveness from readiness.
- Publish an OpenAPI contract before the frontend migration.

---

## 6. Data migration and domain ownership

### Phase A: inventory the live schema

Before any move:

- Export table names, columns, constraints, indexes, policies, triggers, functions, publications and row counts from the real Supabase project.
- Map every page/service/hook to its data tables.
- Record actual production table/session/order status values.
- Identify all external references to Supabase UUIDs: QR URLs, customer menu links, invoices, subscriptions, support cases, integrations and admin records.
- Take a recoverable backup and perform a restore test.
- Remove credentials/secrets from reports and sanitized staging data.

The checked-in SQL file is not sufficient proof of the live database schema.

### Domain migration matrix

| Domain | Current owner | Migration approach | Risk |
|---|---|---|---|
| Public restaurant/menu reads | Supabase | Preserve first; add API reads behind feature flag | Medium |
| Authentication | Supabase Auth | Clerk migration by cohort; explicit account linking | High |
| Restaurant profile | Supabase | API façade, then migrate with ID mapping if chosen | High |
| Menu/categories | Supabase | Read-through API first; writes behind API after parity | High |
| Tables/QR/table sessions | Supabase + public QR URLs | Keep IDs/URLs stable; migrate only after session parity | High |
| Orders/order_items | Supabase | Critical path; migrate last after transactions/idempotency | Very high |
| Customer CRM | Supabase | Consent-aware staged migration | High |
| Notifications/realtime | Supabase Realtime | Preserve until new event channel passes tests | High |
| Subscriptions/payment verification | Supabase | Server-side authorization audit before moving | Very high |
| Admin/audit data | Supabase | Lock down privileged access early; migrate admin flows separately | Very high |
| Integration connections/events | Not yet implemented | New Node/Mongo domain | Medium |
| Delivery mobile app domain | Phase 2 | New APIs after backend/auth stable | Medium |

### Cross-database synchronization policy

Avoid arbitrary dual writes. If data needs temporary replication:

- Choose a primary system per domain.
- Use a one-way change feed/outbox with monotonic version/timestamp and idempotent consumers.
- Record migration state and compare row counts/hashes.
- Never silently write both databases and assume both succeeded.
- Define how rollback handles writes created after cutover.

---

## 7. Compatibility layer for the existing frontend

The current frontend imports Supabase directly across multiple hooks and services. The safest first step is an API façade, not mass replacement.

### Introduce feature-based repositories

Existing components should call stable functions, e.g.:

- `restaurantRepository.getProfile()`
- `menuRepository.list()`
- `orderRepository.create()`
- `orderRepository.list()`
- `orderRepository.updateStatus()`
- `tableRepository.getSessions()`
- `customerRepository.list()`

Initially those repositories keep calling the existing Supabase services. Later, a feature flag can route a specific operation to Node.

Example conceptual configuration:

```text
VITE_API_BASE_URL=https://api-staging.servora...
VITE_FEATURE_MENU_API=false
VITE_FEATURE_ORDER_API=false
VITE_FEATURE_CLERK_AUTH=false
```

Frontend Vite variables are public. Never place a private API secret, Clerk secret key, MongoDB URI or Supabase service-role key in a `VITE_*` variable.

### Backwards compatibility requirements

- Keep current routes: `/`, `/pricing`, `/register`, `/login`, `/console/:restaurantId`, `/menu/:restaurantId`, admin routes, help/docs pages.
- Keep old QR URLs resolving to the same restaurant/menu/table semantics.
- Keep order fields/status values readable by old dashboard code during the transition.
- Add compatibility serializers for camelCase/snake_case differences.
- Preserve demo mode, but never let demo-mode shortcuts grant real resource access.
- Do not change subscription/plan behavior as part of the auth/database migration unless it is a separately tested migration.

---

## 8. Billing-specific migration warning

`src/services/billing.service.js` calls these backend paths:

- `POST /api/billing/calculate`
- `POST /api/billing/invoice/generate`
- `POST /api/billing/payment/settle`

If the backend call fails, it performs local fallback calculation/invoice generation/payment settlement. In production, a fallback result must **not** represent a real persisted invoice or confirmed payment.

Actions:

1. Inventory all callers and label demo vs production use.
2. Introduce a real authenticated billing API only after Node auth/tenant middleware exists.
3. For financial actions, fail closed on server failure instead of returning a fake “paid” success.
4. Keep a demo-only calculation fallback isolated behind explicit demo mode.
5. Add idempotency, payment provider verification, audit trail and DB constraints.
6. Check tax logic with an India GST professional; do not rely on client-side item-name heuristics for tax categories.

---

## 9. RLS and database security priority

The checked-in `src/docs/supabase_schema_and_rls.sql` enables RLS but then creates broad policies including public all-access policies on several sensitive tables. RLS enabled does not automatically mean data is secure.

### Immediate security task (before migration)

- Audit the **live** RLS policies and grants.
- Identify which tables are genuinely public read (e.g. published menu/profile) versus private (orders, customer PII, subscriptions, payment verification, payment methods, audit logs, staff).
- Restrict all merchant reads/writes to server-verified tenant memberships or correctly mapped authenticated identities.
- Give public QR clients only minimal necessary read/write operations.
- Do not let a public client freely select every order/customer/subscription or update arbitrary order statuses.
- Protect admin operations exclusively through trusted server authorization.
- Add automated cross-tenant tests for every endpoint and policy.
- Keep RLS even after Node is added; privileged server access must have explicit authorization checks.
- Never use service-role credentials on the frontend.

Do not blindly apply a new SQL policy script to production. Create a reviewed migration, test in staging, and have a rollback plan.

---

## 10. Deployment layout

Keep frontend and backend deploys independent.

### Frontend

Continue on its currently confirmed production platform. Repo has Vercel SPA rewrite and Cloudflare Wrangler config; confirm the actual production target and CI/CD before changes.

### Backend

Deploy Node API to a persistent Node-compatible host (e.g. Render/Fly.io/Railway/AWS or another chosen platform). Confirm webhooks, persistent connections, logs, TLS, environment secrets, health checks and scaling support.

### Database

MongoDB Atlas or another managed MongoDB service, with network access restrictions and database user scoped to least privilege.

### Clerk

Configure separate development/staging/production Clerk applications and domains. Configure allowed origins/redirect URLs and OTP methods separately per environment.

### Environments

- Local development
- Staging
- Production

Each environment must have separate secrets, DBs, auth settings and integration credentials.

---

## 11. Phased implementation plan

### Phase 0 — Baseline & safety (before coding)

Deliverables:
- Tag current production commit.
- Create a migration branch.
- Ensure production and staging settings are documented (not secrets).
- Capture screenshots and smoke-test scripts for key current routes.
- Back up Supabase and test a restore.
- Obtain sanitized copy for staging.
- Confirm production hosting platform and deployment pipeline.
- Create a baseline build/lint record.
- Add tests around critical customer order and merchant dashboard behavior.

Exit gate: rollback plan and staging environment exist.

### Phase 1 — Backend skeleton (no user-facing behavior changes)

Deliverables:
- Add `server/` workspace/package separately from frontend.
- Express app, health/readiness endpoints, request IDs, safe error handler, logging, schema validation, CORS, rate limits.
- MongoDB connection module and health check.
- Clerk verifier middleware in test/staging, not yet enforced on production routes.
- OpenAPI docs and CI checks.
- Secret-free `.env.example`.

Exit gate: backend deploys independently; existing frontend continues to build and run unchanged.

### Phase 2 — Clerk proof of concept

Deliverables:
- Add Clerk SDK only behind a feature flag to the frontend.
- Configure OTP in staging.
- `GET /v1/me` endpoint validates Clerk token and returns Servora profile/memberships.
- Create `users` and `restaurantMemberships` mapping in the chosen authoritative backend store.
- Test owner, staff, admin, multi-outlet and no-membership users.
- Preserve Supabase auth for all non-migrated users.

Exit gate: login, logout, OTP, expired session, unauthorized console, wrong tenant and refresh flows pass in staging.

### Phase 3 — Backend-owned new domains

Start with domains not entangled with current client records:

- Integration connections
- Webhook event log/idempotency store
- Background jobs
- New audit events for API/integration operations

Use MongoDB for these as the first clear ownership boundary.

Exit gate: no impact on existing restaurant/menu/order tables.

### Phase 4 — Read-only API façade

Move one low-risk read path, e.g. public restaurant profile or menu reads, through Node API while data still comes from Supabase. Keep it behind a feature flag and preserve response shape.

Exit gate: old vs API results match; latency/error rate are acceptable; rollback flag works.

### Phase 5 — Low-risk writes through Node

Select one low-risk write domain after audit, e.g. restaurant profile or menu metadata. Node verifies Clerk identity + membership, validates input and then writes to the existing Supabase table using a controlled server pattern. Maintain RLS where possible; if a privileged key is used, enforce full backend ownership and authorization and never expose it.

Do not migrate orders yet.

Exit gate: tenant isolation tests pass and data comparison is clean.

### Phase 6 — Data migration strategy for MongoDB

Before moving core domains:
- Produce source-to-target mapping.
- Decide which domains truly need MongoDB and whether order transactions/analytics remain better in Postgres.
- Create migration scripts that are repeatable and idempotent.
- Map legacy UUIDs.
- Validate row counts, relationships, amounts, dates and status distributions.
- Implement a read-only shadow comparison.
- Test rollback with post-migration writes.

Suggested order after low-risk proof:
1. User/membership mapping
2. Restaurant profile if needed
3. Menu/categories
4. Table/QR metadata
5. Table sessions
6. Customer CRM
7. Orders/order items **last**

Orders are last because they drive the live kitchen, customer tracking, analytics, table sessions and client billing/reconciliation.

### Phase 7 — Order API and event consistency

Deliverables:
- Server-authoritative order creation and pricing.
- Order state machine validated server-side.
- Idempotency key on customer order submission.
- Atomic/transactional persistence for order + items where supported.
- Inventory update via transaction/outbox/worker with idempotency; no silent partial failure.
- Realtime updates that keep old clients working.
- Status history and audit events.
- Feature flag per restaurant/cohort.

Exit gate: duplicate clicks/retries, simultaneous orders, failed writes and real-time updates tested under load.

### Phase 8 — Merchant/admin auth cutover

Migrate existing users by verified account-linking/reverification, not by assuming Supabase and Clerk user IDs match. Keep fallback login until every pilot user is migrated.

Admin:
- Remove frontend secret/default password.
- Use Clerk identity + server-side SUPER_ADMIN role in DB/claims controlled by server.
- Require stronger MFA for privileged actions.
- Audit admin access and sensitive mutations.

Exit gate: one pilot restaurant complete; no lockout; rollback rehearsed.

### Phase 9 — Progressive production rollout

Cohort order:
1. Internal/demo restaurant
2. Test tenant
3. One consenting existing client
4. Small group of existing clients
5. All clients only after success

For each cohort:
- Enable feature flag
- Watch errors/latency
- Compare data
- Verify Realtime and orders
- Keep one-click rollback
- Notify clients if the login experience changes

Do not migrate all tenants on the same day.

### Phase 10 — Phase 2 food-delivery mobile app

Start only after backend/auth contracts are stable.

Mobile app reuses:
- Clerk identity/OTP
- Node API `/v1`
- Restaurant, menu, cart, order and customer contracts
- Universal order IDs
- Notification system
- Observability
- API versioning

Mobile-specific capabilities (later):
- Customer location/address book
- Delivery zones
- Delivery fee calculation
- Payment/checkout
- Driver/dispatch model if Servora will operate delivery
- Order tracking
- Push notifications
- Cancellation/refund rules
- Food-delivery-specific search/discovery

Do not build the delivery app until product/business scope decides whether deliveries are restaurant-managed, aggregator-managed, or Servora-managed. Those are materially different operating models.

---

## 12. Phase 2 food delivery app boundary

Phase 2 is explicitly out of the current web cutover.

### First mobile MVP candidate

- Phone/email OTP via Clerk
- Browse restaurants
- Browse dynamic menus
- Add to cart
- Place order
- View order status
- View order history
- Manage saved addresses only if direct delivery is supported
- Push notifications

Before shipping, define:
- Delivery provider/driver responsibility
- Restaurant acceptance/rejection
- Delivery fee and tax rules
- Payment provider and refund process
- Service area/geofencing
- Customer support/refund workflows
- Privacy/data retention
- Cancellation policy
- Restaurant/driver/customer role boundaries

---

## 13. Testing and acceptance criteria

### Existing web regression suite

Every migration phase must check:
- Marketing pages still render.
- Existing QR links still open the correct restaurant/menu/table.
- Owner can log in, open `/console/:restaurantId`, manage menu, tables, QR and settings.
- Customers can browse menu, add to cart, order and track status.
- Orders continue to appear in dashboard/realtime.
- Table sessions remain linked to the correct restaurant/table.
- CRM, analytics and plan limits remain correct.
- Admin can manage subscriptions/verifications/support with server-side authorization.
- Existing customers do not lose account history.

### Security tests

- Invalid/expired Clerk token rejected.
- User with no restaurant membership cannot access console data.
- Restaurant A cannot access Restaurant B data.
- Staff cannot perform owner/admin operations without permission.
- Public customer cannot read private orders/customer CRM/payment/subscription/audit data.
- Client cannot forge restaurantId/owner role/price/total.
- Service-role key is absent from frontend build/source maps/public config.
- Admin password is not in frontend bundle.
- Rate limits on OTP, login, order creation and webhook endpoints.
- No sensitive values in logs.

### Data integrity tests

- Order + item persistence is all-or-nothing where possible.
- Duplicate idempotency key creates one order.
- Duplicate webhook processed once.
- Inventory is not deducted twice.
- Menu price changes do not rewrite historical order line prices.
- Table session maps to correct restaurant/table.
- Legacy UUID mapping works.
- Repeated migration produces same state.
- Rollback can restore old path.

### Performance tests

Establish measured baselines first. Do not predeclare throughput capacity.
- p50/p95/p99 API latency
- Error rate
- DB connection/query metrics
- Realtime update delay
- Order creation success rate
- Webhook processing success rate
- Resource consumption

### Release gates

No cohort cutover if:
- Any P0 issue remains.
- Cross-tenant leakage exists.
- Existing QR URL breaks.
- Orders are lost or duplicated.
- Auth migration can lock out existing clients.
- Data comparison is unresolved.
- Rollback isn't tested.
- Monitoring/alerting is unavailable.

---

## 14. Environment variables (illustrative only)

Frontend:
```dotenv
VITE_API_BASE_URL=https://api-staging.example.com
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_FEATURE_CLERK_AUTH=false
VITE_FEATURE_MENU_API=false
VITE_FEATURE_ORDER_API=false
```

Backend:
```dotenv
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/servora_dev
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_JWT_ISSUER=...
LEGACY_SUPABASE_URL=...
LEGACY_SUPABASE_ANON_KEY=...
LEGACY_SUPABASE_SERVICE_ROLE_KEY= # only if approved and required; never frontend
CORS_ALLOWED_ORIGINS=http://localhost:5173
LOG_LEVEL=info
```

Use example placeholders only. Real secrets go into the selected platform's secret manager. In production, use separate environment-specific Clerk keys, database credentials and API origins.

Important: the frontend publishable key is public by design; Clerk secret keys, Mongo URI, Supabase service-role keys and third-party API secrets are private.

---

## 15. Deployment and operations

- Add backend deployment separately from Vite frontend.
- Add staging environment and CI.
- Run frontend build/lint and backend unit/integration tests on PR.
- Run migration verification scripts before cutover.
- Use backward-compatible API response schemas.
- Keep `/v1` stable; use a new API version for breaking changes.
- Use database backups and restore drills.
- Configure secret rotation.
- Monitor backend health, queue depth, 5xx, authentication failure rates, migration errors and order failures.
- Document roll-forward and rollback per phase.

---

## 16. Open decisions required before production

These need explicit answers in the implementation issue, but do not block building the skeleton:

1. **MongoDB ownership:** Is MongoDB mandatory for all core data or only new backend domains? Recommendation: migrate domain-by-domain; avoid permanent double sources.
2. **Clerk OTP:** Phone SMS, email OTP, or both? Recommendation: choose the primary channel from client needs and confirm current Clerk plan/pricing.
3. **Deployment:** Is the live frontend on Vercel or Cloudflare Pages? Confirm before configuring CORS/domains.
4. **Realtime:** Keep Supabase Realtime through the initial migration; define whether Node Socket.IO/SSE is eventually needed.
5. **Mobile delivery model:** restaurant-managed, third-party delivery/aggregator, or Servora-managed driver fleet?
6. **Account linking:** verify how existing Supabase Auth users will be migrated and what recovery path is acceptable.
7. **Admin access:** remove any frontend-configured admin credentials and specify the trusted backend SUPER_ADMIN enrollment process.

---

## 17. Engineering rules for Antigravity or any coding agent

1. Start by reading this plan and tracing each relevant existing service and hook.
2. Do not immediately replace imports across the app.
3. Create a migration branch and baseline commit.
4. Do not write to production databases while implementing.
5. Do not modify live RLS policies without a reviewed migration and staging verification.
6. Do not add fake success fallbacks to critical operations.
7. Do not change existing route paths or QR formats without a compatibility plan.
8. Implement new backend in small PR-sized phases.
9. Write tests for existing behavior before refactoring it.
10. After each phase run frontend build/lint and the regression suite.
11. Keep feature flags and rollback paths.
12. Report files changed, test results, remaining risks and exact cutover instructions.
13. Never expose secret values in logs/reports.
14. Do not implement external POS/aggregator connectors until official credentials and permission exist.
15. Phase 2 mobile app must consume the stable API; do not build a second backend.

---

## 18. Definition of done

The backend/auth migration is complete only when:

- Existing web clients work without forced downtime.
- Clerk OTP login and account recovery work reliably.
- Tenant membership and role checks happen on the server.
- Node API owns the migrated business workflows.
- Supabase RLS remains correctly configured for any still-live Supabase data.
- MongoDB has defined ownership, indexes, backups and migration scripts.
- Restaurant/menu/order/QR/table identifiers remain compatible.
- Every migrated domain has data parity evidence.
- Order creation/status flows are idempotent.
- Realtime still works for each supported client.
- No fake invoice/payment success fallback remains in production path.
- P0 security/data-integrity issues are zero.
- Rollback has been rehearsed.
- Logs/alerts are working.
- The Phase 2 mobile app can reuse the API/auth contracts.

**Immediate engineering priority:** Baseline + live schema/RLS audit → Node.js skeleton → Clerk staging proof of concept → backend-owned integration/event domains → gradual API façade → migrate low-risk domains → orders last → mobile app only after API/auth stability.

**The rule throughout is simple: protect today's customers while building tomorrow's platform.**
