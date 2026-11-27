# Threat Model

## Assets
- Restaurant operational data.
- Customer contact/order history.
- Staff identities and permissions.
- QR bearer tokens and table sessions.
- Payment/billing status and webhook integrity.
- Admin access and audit records.
- Production credentials.

## Main threats and controls
1. Cross-tenant access: derive tenant scope from verified identity/membership; test every query.
2. Forged client role/restaurant ID: ignore as authority; resolve server-side.
3. QR screenshot sharing/replay: high-entropy token, hash at rest, rate limits, rotation, session policy. Do not claim screenshots can be perfectly prevented.
4. Duplicate orders: idempotency key, unique index and payload hash.
5. Price tampering: server-side menu lookup and calculation.
6. Order status tampering: state-machine service, not generic PATCH.
7. Webhook spoofing/replay: raw-body signature verification, timestamp/replay rules, idempotency.
8. Secrets exposure: secret manager/environment, redaction, scanning.
9. Abuse/DoS: bounded bodies, separate rate limits, upstream edge protections, timeouts.
10. Injection/mass assignment: schema validation and allowlisted patch fields.
11. Privileged staff misuse: least privilege and audit trails.
12. Data leakage through logs: safe structured logs and PII minimization.

## Security baseline
- TLS at edge.
- Helmet/security headers.
- Explicit CORS allowlist; CORS is not authentication.
- Rate limiting by endpoint class.
- Token/session verification on server.
- Tenant/branch authorization in services.
- Audit sensitive changes.
- Dependency and secret scanning.
- Backups and restore drills.
