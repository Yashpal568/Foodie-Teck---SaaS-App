# Functional Requirements

## FR-01 Foundation
- Load and validate environment configuration at startup.
- Fail startup when required configuration is invalid.
- Provide liveness and readiness endpoints.
- Readiness must report MongoDB state separately from process liveness.
- Use request IDs, structured errors, security headers, explicit CORS and bounded request bodies.
- Business routes remain disabled until authentication and tenant authorization are implemented.

## FR-02 Identity and membership
- Verify tokens server-side using a replaceable provider adapter.
- Resolve identity to staff/owner membership.
- Enforce role and restaurant/branch scope on every protected operation.
- Support membership suspension/revocation.
- Never trust role, user ID or tenant ID from the request body as authorization evidence.
- Provider decision remains deferred; build the interface only after product approval.

## FR-03 Restaurants and branches
- Create/update/view restaurant profile and operational settings.
- Create/update/disable branches.
- Preserve legacy identifiers.
- Ensure a branch belongs to the authorized restaurant.
- Enforce unique slug and documented uniqueness rules.

## FR-04 Menu
- CRUD categories and items.
- Support ordering/sort position, active/inactive, availability and dietary metadata.
- Store money as integer minor units (paise for INR).
- Enforce category and item tenant/branch scope.
- Use pagination and stable sorting for list APIs.
- Preserve menu-item legacy IDs during migration.

## FR-05 QR and tables
- Preserve current QR URL patterns.
- Resolve QR token to an allowed table/session without revealing internal IDs unnecessarily.
- Store a hash of high-entropy QR tokens, not raw secrets.
- Support revoke/rotate/disable.
- Rate-limit public QR resolution and order creation.
- Define table/session expiry and reopen rules before production launch.

## FR-06 Orders
- Validate menu availability and current price on server.
- Calculate subtotal, tax, discount and total server-side.
- Store snapshots of item name and price at order time.
- Require idempotency for order-creation retries.
- Apply explicit state transition rules.
- Record actor, timestamp, request ID and state changes.
- Separate order status from payment status.
- Preserve existing notifications/customer history behavior until replacement is verified.

## FR-07 Kitchen
- Provide queue/filter endpoints for permitted branch.
- Permit only allowed status transitions.
- Handle duplicate/replayed events safely.
- Provide timestamps for accepted/preparing/ready/served/completed stages.

## FR-08 Inventory
- Represent inventory adjustments as immutable movement records.
- Track reason, actor, quantity delta and source order where relevant.
- Make stock consumption/reversal idempotent.
- Define negative-stock policy before enabling automatic decrement.
- Reconcile derived balance with movement ledger.

## FR-09 Customers and history
- Keep only data needed for operational workflows.
- Limit PII in logs and analytics.
- Scope customer/order history to authorized restaurant.
- Define deletion/export/retention policy before launch.

## FR-10 Notifications and jobs
- Notification delivery is retryable and idempotent.
- Keep durable event/job state if missing an event would cause operational loss.
- Do not block order creation indefinitely on non-critical notification providers.
- Define retry limits, backoff and dead-letter/manual recovery path.

## FR-11 Billing and payment boundaries
- Supabase remains source of truth for subscription/billing/payment records.
- Payment provider handles actual processing.
- Verify webhook signatures, enforce idempotency and reconcile status.
- Never mark a payment successful based only on a browser redirect.
- Remove or gate any local fallback that simulates successful payment in production.

## FR-12 Platform administration
- Separate platform-admin actions from restaurant-owner actions.
- Require stronger audit and least-privilege controls for tenant impersonation/support actions.
- Avoid a universal bypass role; support access should be explicit, time-bound and auditable.
