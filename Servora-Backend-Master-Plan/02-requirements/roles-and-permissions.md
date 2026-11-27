# Roles and Permissions Matrix — Proposed Baseline

This is a proposed starting point. Final role rules must be confirmed against existing Servora behavior before cutover.

| Capability | Platform admin | Owner | Manager | Staff | Kitchen | Public customer |
|---|---:|---:|---:|---:|---:|---:|
| Platform-wide tenant support | Restricted/audited | No | No | No | No | No |
| View restaurant settings | Support-only/audited | Yes | Limited | No | No | No |
| Edit restaurant settings | Support-only/audited | Yes | Limited | No | No | No |
| Manage branches | Support-only/audited | Yes | Assigned branches | No | No | No |
| Manage staff memberships | Support-only/audited | Yes | Limited by policy | No | No | No |
| Manage menu | Support-only/audited | Yes | Yes | Optional limited | No | No |
| Create public QR order | No | No | No | No | No | Yes |
| View all restaurant orders | Support-only/audited | Yes | Assigned branches | Limited | Queue only | Own session/order only |
| Update kitchen state | No | Yes | Yes | If permitted | Yes | No |
| Adjust inventory | Support-only/audited | Yes | Yes | If permitted | No | No |
| View billing | Platform support policy | Yes | No by default | No | No | No |

## Enforcement rules
- Permissions are evaluated server-side on each request.
- Every tenant-owned query is scoped by the authorized restaurant ID and, when relevant, branch ID.
- Platform support access is not a normal tenant role and must be logged.
- Public QR routes are separate from staff routes and return minimal data.
- Denial tests must cover cross-tenant and cross-branch access.
