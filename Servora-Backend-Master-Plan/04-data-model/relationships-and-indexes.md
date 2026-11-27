# Relationships, Indexes and Consistency

## Relationships
- Restaurant 1:N Branch.
- Restaurant/Branch 1:N MenuCategory.
- Restaurant/Branch 1:N MenuItem; MenuItem belongs to a category.
- Restaurant/Branch 1:N Table; table can have multiple historical sessions.
- Restaurant 1:N Order; each order has immutable line snapshots.
- Order 1:N OrderEvent.
- InventoryItem 1:N InventoryMovement.
- Restaurant 1:N StaffMembership.
- Restaurant 1:N AuditEvent.

## Index principles
- Every tenant query begins with tenant scope in the filter.
- Indexes follow actual filters and sort order.
- Unique indexes must be designed around legacy data before deployment; preflight duplicates first.
- Do not add arbitrary indexes without checking write cost and explain plans.
- Use pagination caps; never return an unbounded tenant collection.
- Use TTL indexes only when retention and expiry semantics are approved.

## Transactions
- MongoDB multi-document transactions require a deployment that supports them (typically replica set or managed equivalent).
- If order creation touches order + inventory + events, choose a transaction or a robust idempotent ledger/outbox design.
- Never assume a local standalone MongoDB can validate production transaction behavior.
- Do not perform a MongoDB transaction and a Supabase write as if they were one atomic transaction.

## Money
- Store monetary values as integer minor units (paise for INR).
- Store currency with the amount when multiple currencies are possible.
- Tax/discount calculation and rounding rules must be explicit and tested.
