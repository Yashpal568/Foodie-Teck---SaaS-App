# API Conventions

## Base
- Prefix: `/v1`.
- JSON request/response unless endpoint explicitly uses webhook raw bytes.
- HTTPS in staging/production.
- Authentication: provider adapter deferred; protected routes must fail closed until enabled.

## Success responses
Use consistent response shapes. Example:
`{ "data": { ... }, "meta": { "requestId": "..." } }`

For paginated lists:
`{ "data": [], "meta": { "requestId": "...", "nextCursor": null } }`

## Error response
`{ "error": { "code": "VALIDATION_ERROR", "message": "Request data is invalid", "requestId": "..." } }`

Never expose stack traces, raw database errors, secrets or internal provider payloads to clients.

## Validation
- Validate path params, query params and body separately.
- Reject unknown high-risk fields rather than silently trusting them.
- Normalize only where documented.
- Bound strings, arrays, quantities, body sizes and pagination.
- Do not accept authoritative `restaurantId`, `role`, `price`, `subtotal`, `tax` or `total` from clients as trusted values.

## Pagination
- Default page size should be modest; maximum is a documented hard cap.
- Prefer cursor pagination for high-volume orders/events.
- Stable sort must include a tie-breaker such as `_id`.

## Idempotency
- Commands with external retries require an idempotency key.
- Scope key to tenant and operation.
- Store result/reference and reject reuse with a different payload hash.
- Define retention to exceed likely client/provider retry window.

## Versioning
- Add backward-compatible fields first.
- Breaking changes require a new version or migration plan.
