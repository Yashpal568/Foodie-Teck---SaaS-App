# Operational Runbooks Index

Create and test these runbooks before production cutover:
1. API startup/configuration failure.
2. MongoDB unavailable or connection pool exhausted.
3. High 5xx or latency.
4. Order idempotency collision / duplicate report.
5. Order state stuck in an invalid operational state.
6. Notification/job backlog.
7. Payment webhook invalid signature or retry storm.
8. Supabase/Mongo operational mismatch.
9. Suspected tenant data exposure.
10. Secret rotation.
11. Database restore.
12. Domain feature-flag rollback.
13. Failed migration and resume.
14. QR token compromise/rotation.
