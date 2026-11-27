# Proposed Repository Structure

```text
backend/
  package.json
  tsconfig.json
  .env.example
  src/
    app.ts
    server.ts
    config/
      env.ts
      database.ts
      logger.ts
    middleware/
      request-id.ts
      error-handler.ts
      not-found.ts
      authenticate.ts
      require-permission.ts
      validate-request.ts
      rate-limiters.ts
    common/
      errors/
      pagination/
      money/
      idempotency/
      audit/
    modules/
      identity/
      memberships/
      restaurants/
      branches/
      settings/
      menu/
      qr-tables/
      orders/
      kitchen/
      customers/
      inventory/
      notifications/
      billing-boundary/
    integrations/
      auth/
      supabase/
      payments/
      messaging/
    jobs/
    openapi/
  tests/
    unit/
    integration/
    security/
    contract/
    migrations/
docs/
  PRD/
  architecture/
  api/
  data-model/
  security/
  migration/
  runbooks/
  decisions/
```

## Structure rules
- Keep modules separate without prematurely creating separate deployments.
- A module may start small; avoid empty abstraction layers that add no value.
- Keep integration-specific code under `integrations/`.
- Keep schemas/contracts near the module that owns them and generate a unified OpenAPI document.
- Keep migration scripts versioned and repeatable.
