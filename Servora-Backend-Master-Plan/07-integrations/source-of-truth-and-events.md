# Integration Boundaries and Source of Truth

## Ownership matrix
| Domain | Authoritative store/system |
|---|---|
| Restaurants/branches/settings | MongoDB after domain cutover |
| Menu/categories/items | MongoDB after domain cutover |
| Tables/QR sessions | MongoDB after domain cutover |
| Orders/order lines/kitchen | MongoDB after domain cutover |
| Operational inventory | MongoDB after domain cutover |
| Payment records/verification | Supabase remains authoritative |
| Subscriptions/billing records | Supabase remains authoritative |
| Payment processing | Existing/selected payment provider |
| Auth identity | Provider decision deferred; membership authorization remains app-owned |

## Cross-system consistency
- Avoid casual dual writes.
- A successful MongoDB order should not depend on an unverified client payment claim.
- Webhook handlers verify signatures and deduplicate provider event IDs.
- If an event must be delivered reliably, use a durable outbox/job record and retry.
- Reconciliation compares source provider/Supabase records with operational references.
- Document the recovery action for each mismatch.

## Event design
Potential internal events: `OrderPlaced`, `OrderAccepted`, `OrderReady`, `OrderCancelled`, `InventoryMovementRecorded`.
Events need event ID, tenant ID, aggregate ID, timestamp, schema version and safe payload.
Do not publish secrets or unnecessary PII.
