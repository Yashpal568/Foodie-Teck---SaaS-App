# API Implementation Tracker

Status legend: `PLANNED`, `IN PROGRESS`, `TESTED`, `STAGING`, `PRODUCTION`.

| Domain | Contract | Auth needed | Main risk | Initial status |
|---|---|---|---|---|
| Health | `/v1/health/*` | No | Incorrect readiness reporting | PLANNED |
| Identity | `/v1/me/*` | Yes/provider-dependent | Token verification | BLOCKED by provider decision |
| Membership | Membership endpoints | Yes | Tenant escalation | PLANNED |
| Restaurants | `/v1/restaurants/*` | Yes | Cross-tenant access | PLANNED |
| Branches | `/v1/branches/*` | Yes | Cross-branch access | PLANNED |
| Settings | `/v1/restaurants/:id/settings` | Yes | Mass assignment/secrets | PLANNED |
| Public menu | `/v1/public/menus/*` | Public-limited | Data leakage/abuse | PLANNED |
| Menu admin | `/v1/menu/*` | Yes | Price/category scope | PLANNED |
| QR/table | `/v1/tables/*`, `/v1/public/qr/*` | Mixed | Token abuse/compatibility | PLANNED |
| Orders | `/v1/orders/*`, `/v1/public/orders` | Mixed | Duplicates/pricing/state | PLANNED |
| Kitchen | `/v1/kitchen/*` | Yes | Invalid state changes | PLANNED |
| Inventory | `/v1/inventory/*` | Yes | Double stock mutation | PLANNED |
| Customers | `/v1/customers/*` | Yes | PII leakage | PLANNED |
| Audit | `/v1/audit-events` | Yes | Sensitive audit exposure | PLANNED |
| Billing boundary | Existing integration | Provider-specific | False payment success | REVIEW REQUIRED |
