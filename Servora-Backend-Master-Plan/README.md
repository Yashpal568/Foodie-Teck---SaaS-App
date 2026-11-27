# Servora Backend — Master Planning Pack

**Purpose:** Freeze the backend product and engineering plan before implementation begins.

This is the planning source of truth for building Servora's backend progressively. It is not an assertion that the backend has already been implemented or production-validated.

## Product decisions already made
- Backend stack: Node.js, Express, TypeScript, MongoDB.
- MongoDB owns restaurant operational data.
- Supabase remains the source of truth for payment records, subscription/billing records and payment-verification metadata.
- Payment processing is handled by a payment provider; webhook verification and reconciliation are mandatory.
- Authentication/OTP provider choice is deferred. Do not invent or lock in a provider in the implementation.
- Existing frontend remains operational during migration.
- Preserve legacy restaurant IDs and existing QR URL formats.
- Migrate one domain at a time; no big-bang rewrite.
- Do not trust frontend guards, localStorage, or a client-supplied restaurant ID for authorization.
- Keep infrastructure and data-storage costs proportional to actual usage.

## How to use this pack
1. Read `00-executive-decisions.md` and `01-product-scope.md`.
2. Treat `02-requirements/` and `03-architecture/` as the agreed design baseline.
3. Use `04-data-model/` and `05-api-spec/` to implement one domain at a time.
4. Follow `06-security/`, `07-integrations/`, `08-migration/`, and `09-quality/` before enabling any business route.
5. Track completion using `10-implementation/implementation-roadmap.md` and `10-implementation/definition-of-done.md`.
6. Record every later change in `11-decisions/decision-log.md`.

## Planning status labels
- **DECIDED**: established product constraint.
- **PROPOSED**: recommended design to validate during implementation.
- **DEFERRED**: intentionally not chosen yet.
- **BLOCKED**: requires a real credential, provider decision, environment or product answer.

## Important boundary
This pack contains the complete plan, contracts, schemas, checklists, test strategy, and rollout plan. It does not claim every endpoint, integration, model, CI pipeline, or deployment has been implemented. Production credentials must never be stored in this ZIP or committed to Git.
