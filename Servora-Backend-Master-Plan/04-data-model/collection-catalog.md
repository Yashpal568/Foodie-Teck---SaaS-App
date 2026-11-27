# MongoDB Collection Catalog

All tenant-owned collections must carry `restaurantId`; branch-specific documents should carry `branchId` where appropriate.

## restaurants
- `_id`: ObjectId.
- `legacyRestaurantId`: compatibility key, unique when present.
- `name`, `slug`, `status`, `timezone`, `currency`.
- `createdBy`, timestamps.
- Indexes: unique slug; sparse unique legacy ID; status.

## branches
- `_id`, `restaurantId`, `legacyBranchId`, `name`, `address`, `status`, timestamps.
- Indexes: `{ restaurantId, name }`; sparse unique `{ restaurantId, legacyBranchId }`.

## staffmemberships
- Proposed fields: `identityProvider`, `providerSubject`, `restaurantId`, optional `branchIds`, `role`, `permissions`, `status`, `invitedBy`, timestamps.
- Unique membership key must prevent duplicate active membership records.
- Do not implement identity subject assumptions until auth provider is selected.

## restaurantsettings
- `restaurantId`, optional `branchId`, typed setting groups, `updatedBy`, timestamps.
- Validate allowed setting keys; do not allow arbitrary secret injection.

## menucategories
- `restaurantId`, optional `branchId`, `legacyCategoryId`, `name`, `sortOrder`, `isActive`, timestamps.
- Unique name/sort rules must account for branch/global scope.

## menuitems
- `restaurantId`, optional `branchId`, `categoryId`, `legacyMenuItemId`, `name`, `description`, `priceMinor`, `currency`, `isAvailable`, `dietaryType`, `imageUrl`, `sortOrder`, timestamps.
- `priceMinor` is integer paise for INR.
- Snapshot current price/name into order lines at order creation.

## tables
- `restaurantId`, `branchId`, `legacyTableId`, `label`, `status`, timestamps.
- Unique `{ restaurantId, legacyTableId }`.

## qrtokens / table sessions
- Store only token hash, table reference, status, issued/expiry/revocation metadata.
- Never store the raw QR bearer token in database or logs.
- Define session ownership and expiry policy before implementation.

## orders
- `restaurantId`, `branchId`, `legacyOrderId`, `idempotencyKey`, `tableId/sessionId`, `customerRef`, `orderType`, `status`, lines snapshot, subtotal/tax/discount/total minor units, notes, actor, timestamps.
- Unique `{ restaurantId, idempotencyKey }`.
- Unique sparse legacy ID within tenant.
- Index status/time query patterns.

## orderevents
- `restaurantId`, `orderId`, `eventType`, `fromStatus`, `toStatus`, `actorId`, `requestId`, `occurredAt`, minimal metadata.
- Append-only application policy.

## inventoryitems
- `restaurantId`, optional `branchId`, `legacyInventoryId`, `name`, `unit`, reorder threshold, active status.
- Unique key by tenant and legacy ID/name policy.

## inventorymovements
- `restaurantId`, `branchId`, `inventoryItemId`, `quantityDelta`, `unit`, `reason`, `sourceType`, `sourceId`, `idempotencyKey`, `actorId`, `occurredAt`.
- Append-only ledger; enforce unique idempotency key scoped appropriately.

## auditevents
- Actor, action, resource type/ID, tenant, request ID, timestamp, safe change metadata.
- Do not log passwords, tokens, secrets, payment card details or full unnecessary PII.

## customers (if retained in Mongo)
- Only operational fields needed by current flows.
- Define identity/deduplication and retention policy before migration.
- Avoid assuming phone number alone is a safe global identifier.
