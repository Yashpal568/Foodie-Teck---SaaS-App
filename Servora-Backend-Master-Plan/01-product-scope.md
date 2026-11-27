# Product Scope

## Product summary
Servora is a multi-tenant restaurant operations SaaS. The backend will support restaurant owners and staff operating restaurant/branch settings, menu/catalog, QR/table sessions, orders, kitchen workflows, operational customer history, inventory and later delivery operations.

## Goals
- Provide a secure, tenant-isolated operational API.
- Support multiple restaurants and branches.
- Preserve current customer ordering and staff workflows during migration.
- Make order and inventory mutations safe under retries.
- Provide auditable changes and recoverable migrations.
- Keep billing/payment ownership clear.
- Support later institutional/scale needs without prematurely paying for unnecessary infrastructure.

## In scope
1. Backend foundation and runtime configuration.
2. Authentication adapter boundary (provider decision deferred).
3. Staff memberships, role/permission model and tenant authorization.
4. Restaurant and branch management.
5. Restaurant settings.
6. Menu categories, menu items, availability, price and images metadata.
7. QR/table identities and table sessions.
8. Order creation, history, state transitions and cancellation policy.
9. Kitchen workflow.
10. Operational customer/order history with privacy controls.
11. Inventory and stock movement ledger.
12. Notifications/events and background job boundaries.
13. Admin/owner operational APIs.
14. Audit logs, observability, testing, CI, deployment and migration.
15. Phase 2 delivery foundations, only after core flows are stable.

## Out of scope for initial backend launch
- Rewriting the frontend from scratch.
- Choosing OTP provider before the user is ready.
- Moving payment records/subscriptions out of Supabase.
- Launching microservices before measured need.
- AI features unrelated to core restaurant operations.
- Enabling live production cutover before tenant security and rollback are verified.

## Primary actors
- Platform administrator: platform-level support and controlled tenant administration.
- Restaurant owner: manages restaurant, branches, staff, settings and reports.
- Manager: manages assigned branch operations and staff permissions within policy.
- Staff: limited operational actions such as orders/kitchen.
- Kitchen staff: sees and updates allowed kitchen workflow.
- Customer/QR visitor: accesses public menu and can submit a public order under abuse controls.
- System worker: executes scheduled/retryable tasks with least privilege.

## Success measures
- No cross-tenant data access in authorization tests.
- No duplicate order creation on safe retries with same idempotency key.
- Existing QR codes continue to resolve after migration.
- Order totals are calculated server-side and auditable.
- No unverified payment is marked successful.
- Every migration domain has reconciliation and rollback steps.
- API latency/error rate and database load are measurable.
