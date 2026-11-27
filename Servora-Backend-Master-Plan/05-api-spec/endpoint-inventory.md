# Endpoint Inventory

These are planned contracts, not a statement that all endpoints exist.

## Health
- `GET /`
- `GET /v1/health/live`
- `GET /v1/health/ready`

## Identity/membership (provider-dependent)
- `GET /v1/me`
- `GET /v1/me/memberships`
- Owner/admin membership invitation and revocation endpoints after onboarding rules are agreed.

## Restaurants/branches
- `GET /v1/restaurants/:restaurantId`
- `PATCH /v1/restaurants/:restaurantId`
- `GET /v1/restaurants/:restaurantId/branches`
- `POST /v1/restaurants/:restaurantId/branches`
- `PATCH /v1/branches/:branchId`
- `GET /v1/branches/:branchId`

## Settings
- `GET /v1/restaurants/:restaurantId/settings`
- `PATCH /v1/restaurants/:restaurantId/settings`
- Optional branch override endpoints after precedence rules are defined.

## Menu
- `GET /v1/public/menus/:publicSlug` (public-safe projection)
- `GET/POST /v1/menu/categories`
- `PATCH/DELETE /v1/menu/categories/:categoryId`
- `GET/POST /v1/menu/items`
- `PATCH/DELETE /v1/menu/items/:itemId`
- `PATCH /v1/menu/items/:itemId/availability`

## QR/tables
- `GET/POST /v1/tables`
- `PATCH /v1/tables/:tableId`
- `POST /v1/tables/:tableId/qr/rotate`
- `POST /v1/public/qr/resolve`
- Public endpoints require separate rate limits and minimal responses.

## Orders
- `POST /v1/public/orders` (public QR order path, abuse-protected)
- `GET /v1/orders`
- `GET /v1/orders/:orderId`
- `POST /v1/orders/:orderId/accept`
- `POST /v1/orders/:orderId/transitions`
- `POST /v1/orders/:orderId/cancel`
- Idempotency and server-side totals required.

## Kitchen
- `GET /v1/kitchen/queue`
- `POST /v1/kitchen/orders/:orderId/transitions`

## Inventory
- `GET/POST /v1/inventory/items`
- `GET /v1/inventory/items/:itemId/movements`
- `POST /v1/inventory/movements`
- `GET /v1/inventory/reconciliation`

## Operational customers
- `GET /v1/customers`
- `GET /v1/customers/:customerId/order-history`
- Must follow privacy, access and retention policy.

## Audit
- `GET /v1/audit-events` for authorized roles only.

## Billing/payment boundary
- Existing Supabase-backed flows remain authoritative.
- Provider webhooks should be handled by a dedicated integration path with raw-body signature verification, idempotency and reconciliation.
- Do not implement guessed payment endpoints until the current provider and schema are inspected.
