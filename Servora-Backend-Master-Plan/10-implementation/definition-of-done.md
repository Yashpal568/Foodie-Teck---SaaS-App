# Definition of Done

A feature is done only when all applicable items are satisfied:
- [ ] Requirement and API contract documented.
- [ ] Validation covers params, query and body.
- [ ] Authorization is server-side and tenant-scoped.
- [ ] Business rule lives in service/domain layer.
- [ ] Persistence and indexes are reviewed.
- [ ] Idempotency/retry behavior is defined for commands.
- [ ] Audit events exist for sensitive actions.
- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] Cross-tenant denial tests pass.
- [ ] Contract compatibility tests pass.
- [ ] Logs/metrics are safe and useful.
- [ ] Error and outage behavior is defined.
- [ ] Migration/rollback steps are documented if relevant.
- [ ] OpenAPI contract is updated.
- [ ] CI passes.
- [ ] Staging smoke test passes.
- [ ] Production flag remains off until approved.
