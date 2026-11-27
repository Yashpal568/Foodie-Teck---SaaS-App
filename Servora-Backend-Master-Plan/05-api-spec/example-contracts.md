# Example API Contracts

These examples define intent; field names may be refined to match the current frontend and existing data.

## Create order
`POST /v1/public/orders`
Headers:
- `Idempotency-Key: <high-entropy client-generated key>`
- QR/session proof required by the agreed public flow.

Request example:
```json
{
  "qrToken": "opaque-token",
  "items": [
    { "menuItemId": "server-resolved-id", "quantity": 2 }
  ],
  "notes": "No onion"
}
```

The server must:
1. Resolve QR/table/session securely.
2. Load current menu items from the authorized restaurant.
3. Verify availability and quantity bounds.
4. Calculate prices, tax, discount and total from server-side rules.
5. Store item name/price snapshots.
6. Create an idempotent order.
7. Emit durable/ retryable follow-up events as designed.
8. Return only the safe order receipt projection.

The client must not submit trusted totals or payment success flags.

## Order transition
`POST /v1/orders/:orderId/transitions`
```json
{ "toStatus": "preparing", "expectedVersion": 3 }
```
The server verifies actor permission, tenant scope, allowed transition, optimistic concurrency/idempotency and audit event.

## Error example
```json
{
  "error": {
    "code": "ORDER_TRANSITION_NOT_ALLOWED",
    "message": "The requested order transition is not allowed.",
    "requestId": "req_..."
  }
}
```
