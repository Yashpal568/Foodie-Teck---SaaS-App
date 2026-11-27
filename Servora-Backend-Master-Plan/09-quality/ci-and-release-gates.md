# CI and Release Gates

## Pull request checks
- Install dependencies with lockfile.
- TypeScript typecheck.
- Lint/format checks when configured.
- Unit tests.
- Build.
- Dependency audit and secret scanning.
- OpenAPI validation.
- Integration tests against an ephemeral/test database where supported.

## Release gates
- [ ] Code review completed.
- [ ] No secrets in diff.
- [ ] Migrations tested and reversible/repairable.
- [ ] Tenant authorization tests pass.
- [ ] Monitoring and rollback plan documented.
- [ ] Staging smoke test passes.
- [ ] Data reconciliation passes.
- [ ] Payment/billing paths remain unchanged unless separately approved.
- [ ] Production feature flag starts disabled for new domain.
- [ ] Post-deploy verification owner identified.

## Branch/release policy
- Keep changes small and domain-scoped.
- Use feature branches and pull requests.
- Do not merge a scaffold solely because it compiles.
- Keep dependency lockfile committed.
- Pin runtime versions in deployment configuration.
