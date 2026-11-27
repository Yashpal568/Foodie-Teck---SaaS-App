# Legacy Inventory and Compatibility Work

Before implementation of any domain:
1. List every frontend service/hook touching the domain.
2. Record Supabase tables, policies, triggers, realtime subscriptions and edge functions involved.
3. Record all legacy IDs and foreign-key relationships.
4. Record current API/QR URLs and payload shapes.
5. Record side effects: stock updates, notifications, customer history, analytics and billing.
6. Build representative fixtures from anonymized data.
7. Confirm source-of-truth ownership.
8. Create a domain-specific migration plan and rollback plan.

## Required outputs per domain
- Read/write call inventory.
- Data mapping and legacy ID mapping.
- Validation/reconciliation report.
- Compatibility test cases.
- Feature flag and rollback steps.
- Monitoring signals.
