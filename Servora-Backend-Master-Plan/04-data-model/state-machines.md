# State Machines

## Order lifecycle — proposed
- `placed -> accepted | cancelled`
- `accepted -> preparing | cancelled`
- `preparing -> ready | cancelled`
- `ready -> served | completed`
- `served -> completed`
- `completed` and `cancelled` are terminal by default.

Only the server applies transitions. Every transition records previous/next state, actor, timestamp and request ID. Replays must be idempotent.

## Payment lifecycle — separate from order
Payment states depend on the existing provider and Supabase schema. Do not invent a new state machine until current billing/payment behavior is inspected. Never infer paid status from order state or a client redirect.

## Inventory movement
- Stock changes are ledger movements, not arbitrary balance patches.
- A retry with the same idempotency key must not apply the movement twice.
- Reversal is a new compensating movement; do not delete history.
- Define negative-stock and cancellation reversal policies before enabling automatic stock deductions.

## Table session
Proposed states: `open`, `closed`, `expired`, `revoked` (validate against current QR flow).
- QR token rotation revokes previous token.
- Session close must not delete order history.
- Expiry and reopening rules must be explicit.
