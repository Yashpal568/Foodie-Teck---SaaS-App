# Notifications and Background Jobs

## Scope
Order notifications, kitchen updates, low-stock alerts, reminders and future delivery updates may require asynchronous work.

## Design rules
- Separate critical order persistence from non-critical delivery of a notification.
- Use a durable job/outbox when dropped events would cause operational harm.
- Give each job a stable ID and idempotency key.
- Retry transient errors with bounded exponential backoff and jitter.
- Do not retry permanent validation errors forever.
- Record attempts, last error code, next attempt and final failure state.
- Provide a manual replay/recovery path for authorized operators.
- Do not include sensitive customer data in job logs.
- Select queue technology only after workload and hosting are known; start with the simplest reliable option.
