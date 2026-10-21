# Servora API — backend foundation

Initial Node.js + Express + TypeScript foundation. Current scope is startup configuration, MongoDB connectivity, security headers, CORS, request-size limits, basic rate limiting, health endpoints and graceful shutdown.

## Endpoints
- GET / — service identity
- GET /v1/health/live — process liveness
- GET /v1/health/ready — readiness including MongoDB connection

## Deliberately deferred
- OTP provider and final authentication-provider choice
- Business routes or production data writes
- Supabase payment/subscription integration
- Order migration and frontend cutover

The existing frontend remains on its current data path while this foundation is developed. Do not expose business routes until token verification, restaurant membership/role authorization, request validation, audit logging and tenant isolation are implemented and tested.

## Local setup
1. Install Node.js 20 or newer.
2. Run npm install from this directory.
3. Copy .env.example to .env and set MONGODB_URI.
4. Start a local MongoDB instance.
5. Run npm run dev.
6. Check http://localhost:4000/v1/health/live and /v1/health/ready.

Never commit .env or real credentials. Production secrets belong in the deployment platform's secret manager.
