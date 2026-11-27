# Authorization Checklist — Required Before Business Routes

- [ ] Auth provider and token format formally selected.
- [ ] Token signature/issuer/audience/expiry verified server-side.
- [ ] Revoked/suspended identities denied.
- [ ] Actor identity is created by trusted middleware, not request body.
- [ ] Membership lookup is server-side.
- [ ] Role and permission checked for each action.
- [ ] Tenant scope included in every tenant-owned query.
- [ ] Branch scope included when branch-specific.
- [ ] Object ID enumeration cannot cross tenant boundary.
- [ ] List, detail, update, delete and export paths tested.
- [ ] Public routes separated from staff routes.
- [ ] Tests include missing token, expired token, invalid token, wrong tenant, wrong branch, insufficient role and suspended membership.
- [ ] Support/platform-admin access separately controlled and audited.
- [ ] No production route is enabled merely because the frontend hides it.
