# Glossary

- **Tenant:** a restaurant/business boundary used for data isolation.
- **Branch:** a location/operating unit within a restaurant tenant.
- **Legacy ID:** identifier used by the existing system that must remain mapped during migration.
- **Strangler migration:** gradual replacement of one domain at a time while the old path remains available.
- **Idempotency key:** client/provider-supplied key allowing safe retries without duplicate effects.
- **Outbox:** durable record of an event that must be published/retried after a database write.
- **Source of truth:** system authoritative for a specific domain's state.
- **Readiness:** whether the service can safely handle requests, including required dependencies.
- **Liveness:** whether the process is running.
- **Feature flag:** runtime control to enable a migrated domain for a controlled cohort.
- **RLS:** Row Level Security policies in Supabase/Postgres.
- **PII:** personally identifiable information.
