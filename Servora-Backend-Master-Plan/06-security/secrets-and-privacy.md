# Secrets, PII and Privacy

## Secret handling
- Use local ignored `.env` only for development.
- Use deployment secret manager for staging/production.
- Never commit database URI, Supabase service-role key, payment secret, signing key or auth secret.
- Never put backend secrets in `VITE_*` variables.
- Rotate exposed secrets immediately and audit access.

## Logging
Allowed: request ID, route template, status, latency, non-sensitive error code.
Avoid: raw tokens, QR tokens, full phone numbers, passwords, payment payloads, unnecessary customer data.

## Customer data
Before launch, define:
- What data is collected and why.
- Role-based access.
- Retention/deletion and export process.
- Data access/audit policy.
- Backup retention.
- Incident response and breach escalation.
