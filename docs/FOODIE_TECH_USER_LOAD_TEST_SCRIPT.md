# Foodie-Tech — Full User Load & Multi-Restaurant Stress Test

## Purpose

This document is a dedicated user-load testing plan for Foodie-Tech.

The objective is to simulate a large number of restaurants, restaurant staff, admins, tables, and customers using the SaaS at the same time.

This is not a normal feature test. The goal is to determine whether Foodie-Tech remains correct, stable, secure, and performant under realistic and extreme workload.

---

## 1. Safety Rules

- NEVER run the full stress test against production.
- Use local or dedicated staging infrastructure.
- Use a dedicated test database.
- Use synthetic customers and restaurant data.
- Use test payment credentials only.
- Never use real customer information.
- Never expose secrets in logs or reports.
- Stop load escalation if the environment becomes unstable.
- Never perform uncontrolled denial-of-service testing.

---

## 2. Test Objectives

Validate:

- Application stability
- API performance
- Database performance
- Concurrent users
- Concurrent restaurants
- Concurrent orders
- Order integrity
- Tenant isolation
- Customer session isolation
- Cart isolation
- Payment/subscription behavior if applicable
- Restaurant dashboard performance
- Customer ordering performance
- Race conditions
- Duplicate orders
- Failed requests
- Recovery after failures
- CPU/RAM/database resource usage

The key question is:

> Can Foodie-Tech continue operating correctly when many restaurants and thousands of customers use it simultaneously?

---

# 3. Progressive Load Levels

Do NOT start at maximum load.

## Level 1 — Baseline

```text
Restaurants: 1
Tables: 10
Customer sessions: 50
Concurrent customers: 20
Staff/admin users: 5
Orders: 100
Duration: 15 minutes
```

## Level 2 — Small

```text
Restaurants: 5
Tables: 50
Customer sessions: 250
Concurrent customers: 100
Staff/admin users: 15
Orders: 500
Duration: 20 minutes
```

## Level 3 — Medium

```text
Restaurants: 10
Tables: 100
Customer sessions: 1,000
Concurrent customers: 250
Staff/admin users: 30
Orders: 2,000
Duration: 30 minutes
```

## Level 4 — Heavy

```text
Restaurants: 25
Tables: 500
Customer sessions: 5,000
Concurrent customers: 500
Staff/admin users: 75
Orders: 5,000+
Duration: 45 minutes
```

## Level 5 — Extreme

```text
Restaurants: 50
Tables: 1,000+
Customer sessions: 10,000+
Peak concurrent users: 1,000+
Staff/admin users: 150+
Orders: 10,000+
Duration: 60 minutes
```

## Level 6 — Maximum Planned Load

Only run after Levels 1–5 pass.

```text
Restaurants: 100
Tables: 2,000+
Customer sessions: 20,000+
Peak concurrent users: 2,000+
Staff/admin users: 300+
Orders: 20,000+
Duration: 1–4 hours
```

The maximum level must be adjusted to the actual infrastructure and expected business scale.

---

# 4. Realistic User Distribution

Do not make every simulated user perform the same action.

Use realistic weighted behavior.

Example:

```text
30%  Browse restaurant/menu
15%  Search/filter menu
15%  Open item details
10%  Add items to cart
05%  Modify cart
15%  Place order
05%  Check order status
03%  Refresh/reopen
02%  Other supported actions
```

Adjust these percentages according to the actual Foodie-Tech product.

---

# 5. Restaurant Distribution

Create restaurants of different sizes.

### Small

```text
50 restaurants
10 tables each
30–50 menu items
```

### Medium

```text
30 restaurants
20–30 tables each
50–150 menu items
```

### Large

```text
15 restaurants
40–75 tables each
150–300 menu items
```

### Heavy

```text
5 restaurants
100+ tables
300+ menu items
```

This creates a more realistic workload than identical restaurants.

---

# 6. Test Data Generation

Generate synthetic:

### Restaurants

- Restaurant name
- Address
- Contact information
- Owner
- Admins
- Staff
- Categories
- Menu items
- Tables
- QR records
- Settings

### Menu

- Categories
- Items
- Prices
- Availability
- Descriptions
- Images where practical
- Variations/options where supported

### Customers

- Unique test IDs
- Unique sessions
- Cart state
- Order history
- Restaurant/table association where applicable

Never generate or use real sensitive personal information.

---

# 7. Restaurant Setup Flow

For every test restaurant:

```text
Create restaurant
      ↓
Create owner
      ↓
Create admin/staff
      ↓
Create categories
      ↓
Create menu
      ↓
Create tables
      ↓
Generate QR
      ↓
Verify customer menu
```

Verify the restaurant works independently before adding load.

---

# 8. Customer Journey Simulation

A simulated customer should perform realistic sequences:

```text
Open QR/menu
      ↓
Load restaurant
      ↓
Load categories
      ↓
Load menu
      ↓
Browse
      ↓
Open item
      ↓
Add item
      ↓
Change quantity
      ↓
Add another item
      ↓
Open cart
      ↓
Review total
      ↓
Place order
      ↓
Receive confirmation
      ↓
Check status
      ↓
Refresh
      ↓
Check final status
```

Not every user needs to complete every step.

Use weighted behavior.

---

# 9. QR and Table Isolation

Simulate:

```text
Customer A → Restaurant 1 → Table 1
Customer B → Restaurant 1 → Table 2
Customer C → Restaurant 2 → Table 1
Customer D → Restaurant 2 → Table 2
```

The same table number in different restaurants must never cause data mixing.

Verify:

- Correct restaurant
- Correct table
- Correct customer session
- Correct cart
- Correct order

---

# 10. Customer Session Isolation

Simulate thousands of customer sessions.

Verify:

- Customer A cannot see Customer B's cart.
- Customer A cannot see Customer B's order.
- Customer A cannot modify Customer B's order.
- Refresh does not switch sessions.
- Multiple tabs do not accidentally share unrelated sessions.
- Reconnecting does not restore the wrong session.

Test both frontend and backend/API behavior.

---

# 11. Menu Load Test

Simulate many customers opening menus simultaneously.

Measure:

- Response time
- Error rate
- Database latency
- CPU
- RAM
- Network usage

Verify every response belongs to the requested restaurant.

---

# 12. Cart Load Test

Simultaneously simulate:

- Add item
- Remove item
- Increase quantity
- Decrease quantity
- Open cart
- Refresh cart

Verify carts never cross-contaminate.

---

# 13. Massive Order Creation

Generate concurrent orders across many restaurants.

Every order must have:

- Correct restaurant
- Correct table
- Correct customer/session
- Correct items
- Correct quantities
- Correct server-calculated price
- Correct total
- Correct timestamp
- Correct status
- Unique order ID

---

# 14. Dinner Rush Simulation

Create traffic waves:

```text
00:00–05:00
Normal traffic

05:00–10:00
Traffic increases

10:00–20:00
Peak dinner rush

20:00–30:00
Peak continues

30:00–40:00
Traffic decreases

40:00–50:00
Normal traffic
```

During peak:

- Multiple restaurants
- Hundreds/thousands of customers
- Continuous orders
- Staff processing orders
- Admin dashboard usage

The system must remain stable.

---

# 15. Simultaneous Order Race Test

Create many customers submitting at approximately the same time:

```text
Customer 001 → Place Order
Customer 002 → Place Order
...
Customer 500 → Place Order
```

Verify:

```text
Orders attempted = Orders created
Duplicate orders = 0
Missing orders = 0
Corrupted orders = 0
```

---

# 16. Duplicate Submission Test

For a subset of users:

- Double-click Place Order
- Triple-click Place Order
- Submit from two tabs
- Retry after timeout
- Refresh immediately
- Replay the same request

Expected:

One intended action must not unintentionally create multiple orders.

---

# 17. Staff Workload

For busy restaurants simulate multiple staff users.

Actions:

```text
Receive order
      ↓
Open order
      ↓
Accept
      ↓
Preparing
      ↓
Ready
      ↓
Completed
```

Also test:

- Two staff opening the same order
- Two staff changing the same order
- Rapid status updates
- Refresh during update
- Network failure during update

Verify no invalid state is created.

---

# 18. Owner/Admin Workload

While customers are ordering, simulate:

- Dashboard loading
- Order filtering
- Order search
- Analytics
- Revenue views
- Menu management
- Item availability changes
- Table management
- Refreshes

Customer ordering must remain stable while admin traffic increases.

---

# 19. Menu Changes During Load

While customers are actively ordering:

### Test A
Make an item unavailable.

### Test B
Change an item's price.

### Test C
Delete an item.

### Test D
Change category.

Verify carts and existing orders follow the application's intended business rules.

Critical:

> Server-side order totals must be authoritative. Never trust prices supplied by the customer.

---

# 20. Multi-Tenant Stress Test

Run many restaurants simultaneously:

```text
Restaurant 001 → Customers
Restaurant 002 → Customers
Restaurant 003 → Customers
...
Restaurant 100 → Customers
```

At the same time perform:

- Menu reads
- Cart operations
- Orders
- Order updates
- Analytics
- Admin requests

Verify:

```text
Restaurant A data ≠ Restaurant B data
```

This must remain true under load.

---

# 21. Cross-Tenant Attack During Load

Using authorized test accounts, attempt to access another restaurant's resources while the system is busy.

Test changing:

- Restaurant ID
- Table ID
- Menu ID
- Category ID
- Order ID
- User ID
- Analytics resource ID
- Subscription ID

Expected:

Unauthorized access is rejected.

Load must never weaken authorization.

---

# 22. Order Status Load

Generate thousands of orders and continuously update their statuses.

Measure:

- Status update latency
- Database write latency
- API error rate
- UI synchronization
- Duplicate transitions
- Invalid transitions

Verify final database state.

---

# 23. Analytics Load

While orders are being generated, continuously request:

- Dashboard
- Revenue
- Order count
- Popular products
- Date filters
- Reports

Determine whether analytics queries degrade order creation.

Identify slow queries.

---

# 24. Database Monitoring

Monitor:

- Active connections
- Connection pool usage
- Slow queries
- Query latency
- CPU
- RAM
- Locks
- Disk usage

Look for:

- Connection exhaustion
- Missing indexes
- N+1 queries
- Large scans
- Lock contention
- Memory growth
- Connection leaks

Do not blindly change database indexes during the test.

---

# 25. API Load

Use the actual endpoints discovered from the repository.

Typical examples may include:

```text
GET restaurant
GET menu
GET categories
GET tables
GET order
POST order
PATCH order
GET dashboard
GET analytics
```

Do not invent endpoints.

Record:

```text
Requests/sec
Orders/sec
P50 latency
P95 latency
P99 latency
4xx rate
5xx rate
Timeout rate
```

---

# 26. Load Ramp

Increase load gradually:

```text
100 users
→ 250
→ 500
→ 1,000
→ 2,000
→ 5,000
→ 10,000
→ 20,000
```

At every level record:

- Concurrent users
- Requests/sec
- Orders/sec
- P50
- P95
- P99
- Error rate
- CPU
- RAM
- Database connections
- Database latency

Stop escalation if the environment becomes unstable.

---

# 27. Spike Test

Suddenly increase traffic:

```text
100 users
      ↓
2,000 users
```

Then:

```text
2,000 users
      ↓
10,000 users
```

Measure:

- Error rate
- Recovery time
- Queueing
- Database saturation
- Application stability

---

# 28. Soak Test

Run a sustainable workload for:

```text
2–4 hours
```

Look for:

- Memory leaks
- Connection leaks
- Increasing latency
- Increasing error rate
- Database connection growth
- Background job failures
- Cache problems
- Log growth

---

# 29. Recovery Test

In staging, during a controlled load test:

1. Stop/restart backend.
2. Restore service.
3. Continue traffic.
4. Verify safe retries.

Check:

- No duplicate orders
- No missing orders
- No corrupted records
- Database remains consistent
- Sessions recover safely

---

# 30. Network Failure Test

During load introduce controlled:

- Slow network
- High latency
- Request timeout
- Client disconnect
- Reconnect

Focus on:

- Order creation
- Order updates
- Cart
- Authentication
- Payment if applicable

Verify safe recovery.

---

# 31. Real Browser + Load Generator Strategy

Do NOT open thousands of Chrome windows.

Use:

```text
Real browser E2E users
+
API-level virtual users/load generator
```

Example real browser sessions:

```text
Browser A → Customer → Restaurant 1
Browser B → Customer → Restaurant 1
Browser C → Customer → Restaurant 2
Browser D → Staff → Restaurant 1
Browser E → Owner → Restaurant 1
```

At the same time, API-level virtual users generate the large backend workload.

This gives both:

- Real UI validation
- High backend load

---

# 32. Customer Behavior Distribution

Example:

```text
40% Browse only
20% Browse + cart
25% Complete order
10% Check order status
05% Refresh/reconnect
```

Adjust after real production usage data becomes available.

---

# 33. Order Size Distribution

Use realistic order sizes:

```text
20% → 1 item
30% → 2–3 items
30% → 4–6 items
15% → 7–10 items
05% → Large order
```

Use realistic quantities.

---

# 34. Failed User Simulation

A subset of users should intentionally encounter failures:

- Invalid session
- Expired session
- Invalid item
- Deleted item
- Unavailable item
- Network disconnect
- Timeout
- Refresh
- Duplicate request

Verify clean error handling and safe recovery.

---

# 35. Data Integrity Verification

After each load level compare:

```text
Orders attempted
Orders created
Orders completed
Orders cancelled
Duplicate orders
Missing orders
```

Inspect database records for:

- Restaurant ID
- Table ID
- Customer/session ID
- Items
- Quantity
- Price
- Total
- Status
- Timestamps

---

# 36. Automated Consistency Assertions

Create automated checks where possible:

```text
duplicate_order_ids == 0
cross_tenant_records == 0
invalid_order_totals == 0
orphan_orders == 0
negative_quantities == 0
invalid_restaurant_references == 0
missing_required_fields == 0
```

Adapt these checks to the actual database schema.

---

# 37. Performance Targets

Define targets before testing.

Example starting targets:

```text
P95 normal API latency < 500 ms
P99 normal API latency < 1.5 s
5xx error rate < 0.1%
Duplicate orders = 0
Missing orders = 0
Cross-tenant violations = 0
Data corruption = 0
```

These are starting targets, not universal guarantees.

Adjust them to your infrastructure and expected workload.

---

# 38. Resource Monitoring

Record during every serious test.

## Application

- CPU
- RAM
- Process restarts
- Runtime/event-loop metrics where available

## Database

- CPU
- RAM
- Connections
- Query latency
- Slow queries
- Locks

## Network

- Incoming traffic
- Outgoing traffic
- Errors
- Timeouts

## Application Metrics

- Requests/sec
- Orders/sec
- Errors/sec
- P50
- P95
- P99

---

# 39. Capacity Discovery

Find the actual breaking point.

Example:

```text
500 users    → PASS
1,000 users  → PASS
2,000 users  → PASS
5,000 users  → PASS
10,000 users → DEGRADED
```

Record:

> Maximum tested capacity under workload X: Y concurrent users.

Never claim capacity that has not been measured.

---

# 40. Final Full Workload Scenario

Run the maximum safe staging scenario:

```text
100 restaurants
2,000+ tables
20,000+ customer sessions
2,000+ peak concurrent users
300+ staff/admin sessions
20,000+ orders
High menu traffic
High dashboard traffic
Continuous order status updates
```

Duration:

```text
1–4 hours
```

During the test:

- Customers browse
- Customers order
- Customers refresh
- Customers disconnect
- Customers reconnect
- Customers double-submit
- Staff process orders
- Admins view analytics
- Menus change
- Items become unavailable
- Network becomes slow
- Some requests fail
- Controlled backend recovery is tested

---

# 41. Final Metrics

At the end calculate:

```text
Total restaurants:
Total tables:
Total customer sessions:
Peak concurrent customers:
Total staff/admin sessions:
Total requests:
Total orders attempted:
Total orders created:
Total orders completed:
Total duplicate orders:
Total missing orders:
Total corrupted orders:
Total cross-tenant violations:
Total 4xx:
Total 5xx:
Total timeouts:
P50 latency:
P95 latency:
P99 latency:
Peak CPU:
Peak RAM:
Peak DB connections:
```

---

# 42. Final PASS Criteria

The load test passes only if:

- [ ] No P0 data-integrity issue
- [ ] No cross-tenant data leakage
- [ ] No unauthorized resource access
- [ ] No duplicate financial transaction
- [ ] No unintended duplicate order
- [ ] No missing order
- [ ] No corrupted order
- [ ] Correct order totals
- [ ] Correct restaurant/table association
- [ ] Authentication remains functional
- [ ] Authorization remains functional
- [ ] Database remains consistent
- [ ] Backend remains stable
- [ ] Frontend remains usable
- [ ] Recovery works
- [ ] Error rate stays within defined threshold
- [ ] Latency stays within defined threshold
- [ ] No unexplained memory growth
- [ ] No connection leak
- [ ] No critical security issue

---

# 43. Per-Level Result Template

```text
## Load Level

Restaurants:
Customers:
Concurrent Users:
Staff:
Orders:
Duration:

### Performance

Requests/sec:
Orders/sec:
P50:
P95:
P99:
4xx:
5xx:
Timeouts:

### Infrastructure

Peak CPU:
Peak RAM:
Peak DB Connections:
Peak DB Latency:

### Data Integrity

Orders Attempted:
Orders Created:
Duplicate Orders:
Missing Orders:
Corrupted Orders:
Cross-Tenant Violations:

### Result

PASS / FAIL / DEGRADED / BLOCKED

### Findings

1.
2.
3.

### Evidence

1.
2.
3.
```

---

# 44. Final Report

Generate:

`FOODIE_TECH_USER_LOAD_TEST_REPORT.md`

Include:

```text
# Foodie-Tech User Load Test Report

## Executive Summary
## Test Environment
## Infrastructure
## Test Data
## Load Levels
## Baseline Results
## Small Load Results
## Medium Load Results
## Heavy Load Results
## Extreme Load Results
## Spike Test
## Soak Test
## Recovery Test
## Chaos Test
## Performance Results
## Database Results
## API Results
## Order Integrity
## Multi-Tenant Isolation
## Customer Session Isolation
## Security Findings
## Bottlenecks
## Breaking Point
## Recommendations
## Final Result
```

---

# 45. Antigravity Execution Instructions

When executing this document:

### Phase 1 — Inspect

Understand the actual Foodie-Tech architecture:

- API routes
- Database models
- Authentication
- Authorization
- Restaurant/tenant model
- Customer session model
- Cart model
- Order lifecycle
- Subscription/payment model

Do not invent endpoints.

### Phase 2 — Test Infrastructure

Inspect existing test tooling and package scripts.

Use existing tools where practical.

### Phase 3 — Generate Synthetic Data

Create only test restaurants, customers, menus, tables, and orders.

### Phase 4 — Baseline

Run Level 1.

### Phase 5 — Validate

Check performance AND correctness.

### Phase 6 — Increase Load

Move through the levels gradually.

### Phase 7 — Monitor

Record application, API, database, and infrastructure metrics.

### Phase 8 — Diagnose

When a failure appears:

```text
STOP escalation
      ↓
Capture evidence
      ↓
Identify root cause
      ↓
Determine severity
      ↓
Fix if authorized
      ↓
Rerun failing test
      ↓
Run regression
      ↓
Continue
```

### Phase 9 — Final Capacity Test

Find the maximum tested stable workload.

### Phase 10 — Report

Generate:

`FOODIE_TECH_USER_LOAD_TEST_REPORT.md`

---

# 46. Important Agent Behavior

The agent must:

- Think adversarially.
- Use reproducible tests.
- Verify backend state.
- Verify database state for critical transactions.
- Test abnormal behavior.
- Look for race conditions.
- Look for tenant isolation failures.
- Look for authorization bypasses.
- Look for duplicate transactions.
- Look for client/server trust issues.
- Look for error-handling failures.
- Look for performance bottlenecks.
- Look for memory/connection leaks.
- Record actual measurements.

The agent must NOT:

- Declare success without evidence.
- Skip failed tests silently.
- Mark blocked tests as passed.
- Hide failures.
- Suppress errors merely to make tests green.
- Use production secrets.
- Modify production data.
- Claim unlimited scalability.
- Claim security certification.

---

# 47. Important Distinction

Do not confuse:

```text
20,000 simulated users
```

with:

```text
20,000 real browsers
```

For high-volume testing use:

```text
API/load-testing virtual users
+
A small number of real browser E2E sessions
```

This is more practical and produces useful backend load without requiring thousands of browser instances.

---

# 48. Definition of Success

The purpose is NOT to prove that Foodie-Tech can handle unlimited traffic.

The purpose is to:

1. Determine tested capacity.
2. Find bottlenecks.
3. Find the breaking point.
4. Verify safe degradation.
5. Verify recovery.
6. Protect order integrity.
7. Protect tenant isolation.
8. Protect customer sessions.
9. Measure real performance.

A system that slows down safely is better than a system that remains fast while creating duplicate, missing, or incorrect orders.

---

# 49. Final Instruction to Antigravity

Execute this plan only against the authorized local/staging Foodie-Tech environment.

Do not use production.

Start with the smallest workload and progressively increase it.

Do not skip failed tests.

Do not mark blocked tests as passed.

Do not invent application endpoints.

Use the actual architecture discovered from the repository.

For every failure:

- Capture evidence.
- Identify root cause.
- Assign severity.
- Fix only when authorized.
- Rerun the failing test.
- Run regression testing.

At the end generate:

`FOODIE_TECH_USER_LOAD_TEST_REPORT.md`

The final report MUST include:

```text
Maximum tested concurrent users
Maximum tested restaurants
Maximum tested orders
Peak requests/sec
Peak orders/sec
P95 latency
P99 latency
Peak CPU
Peak RAM
Peak database connections
Error rate
Duplicate orders
Missing orders
Corrupted orders
Cross-tenant violations
Breaking point
Recommended safe operating range
```

Do not declare Foodie-Tech production-ready merely because API requests return successful responses.

**Correctness + isolation + integrity + stability + measurable performance are mandatory.**
