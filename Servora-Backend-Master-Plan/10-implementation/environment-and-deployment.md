# Environment and Deployment Plan

## Environments
- Local development: local/dev MongoDB, fake/test provider credentials only.
- CI: isolated test database and provider mocks/official sandbox.
- Staging: production-like configuration, separate database and secrets.
- Production: managed secrets, backups, monitoring, restricted access.

## Environment variables
Names are proposed; validate them when implementing:
- `NODE_ENV`
- `PORT`
- `MONGODB_URI`
- `CORS_ORIGINS`
- `LOG_LEVEL`
- `RATE_LIMIT_*`
- Auth provider-specific values only after provider selection.
- Payment webhook secrets only on server, never frontend.
- Supabase service credentials only where server use is explicitly required.

## Deployment checklist
- Confirm actual production host and deployment target.
- Pin Node runtime and install from lockfile.
- Configure secrets in platform secret manager.
- Set explicit CORS origins.
- Configure trusted proxy correctly for rate limits.
- Add liveness/readiness probes.
- Configure graceful shutdown.
- Configure database backups and test restore.
- Configure log retention and alert routing.
- Use staging before production.
- Keep feature flags disabled by default for new domains.
