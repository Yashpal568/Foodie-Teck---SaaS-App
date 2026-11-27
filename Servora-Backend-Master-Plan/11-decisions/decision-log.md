# Architecture/Product Decision Log

Append decisions here. Do not silently overwrite important product constraints.

## D-001 — Backend stack
- Status: DECIDED
- Decision: Node.js + Express + TypeScript + MongoDB.
- Reason: matches agreed backend direction and existing JavaScript ecosystem.

## D-002 — Data ownership split
- Status: DECIDED
- Decision: MongoDB for operational restaurant data; Supabase remains authoritative for payment and billing records.
- Constraint: no casual cross-database dual writes.

## D-003 — Authentication provider
- Status: DEFERRED
- Decision: no provider selected now; OTP work is postponed.
- Constraint: protected business APIs remain disabled until a real verifier and tenant authorization are implemented.

## D-004 — Migration style
- Status: DECIDED
- Decision: gradual, domain-by-domain strangler migration.
- Constraint: preserve legacy IDs and existing QR URLs.

## D-005 — Initial deployment shape
- Status: PROPOSED
- Decision: modular monolith before microservices.
- Revisit only with evidence of scaling/ownership needs.

## Decision template
- ID:
- Date:
- Status: DECIDED / PROPOSED / DEFERRED
- Context:
- Decision:
- Alternatives:
- Consequences:
- Owner:
