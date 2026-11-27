# SERVORA — FINAL PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Version:** 3.0  
**Status:** Final Product Roadmap  
**Product:** Servora Restaurant SaaS

## 1. Product Vision

Servora should evolve from a QR ordering product into a modern restaurant operating system connecting:

- Tables
- Customers
- Menus
- Orders
- Inventory
- CRM
- Kitchen operations
- Online ordering
- Existing POS/billing systems
- Analytics
- Future AI intelligence

**Core positioning:**

> Keep your existing POS. Add Servora.

Servora should not initially try to replace Petpooja or other established POS systems. Instead, it should become the digital and operational layer around them.

---

## 2. Current Product Baseline

Servora already provides:

- Restaurant dashboard
- Dynamic QR for every table
- Dynamic restaurant menu
- Table sessions
- Order management
- Pickup/delivery workflows
- Inventory
- Analytics
- Customer management / CRM
- Marketing website

These capabilities remain the foundation.

---

## 3. Strategic Decision — Billing

### Decision

Do **not** build a full Petpooja-level POS/billing system immediately.

Instead:

1. Let restaurants keep their existing POS/billing.
2. Connect Servora to existing POS systems through official APIs and approved partner programs.
3. Keep Servora internally billing-aware so orders, payments and reconciliation can be represented correctly.
4. Build a full Servora POS later only if customer demand justifies it.

### Target workflow

```text
Customer
   ↓
Servora QR / Website
   ↓
Servora Order
   ↓
Existing POS / Petpooja
   ↓
Billing + Payment
   ↓
Status/Data
   ↓
Servora
   ↓
CRM + Analytics + Inventory + Table Session
```

---

## 4. Strategic Decision — Backend

### Decision

Introduce a dedicated **Node.js + Express backend** while keeping Supabase.

Do not replace Supabase.

### Architecture

```text
React Frontend
      ↓
Node.js + Express API
      ↓
Business Logic + Authorization
      ↓
Supabase PostgreSQL
      ↓
RLS
```

External integrations must communicate through Node.js:

```text
Node.js
 ├── Petpooja
 ├── Zomato
 ├── Swiggy
 ├── Payments
 ├── Notifications
 └── AI services
```

### Supabase remains responsible for

- PostgreSQL
- Authentication
- RLS
- Realtime
- Storage

### Node.js becomes responsible for

- Business logic
- API orchestration
- Validation
- Authorization
- Integration adapters
- Webhooks
- Order state machine
- Idempotency
- External API communication
- Background jobs
- Notifications
- Complex workflows

---

## 5. Security Architecture

RLS remains mandatory.

```text
Frontend
   ↓
Node.js Authentication
   ↓
Authorization
   ↓
Restaurant/Tenant Validation
   ↓
Supabase
   ↓
RLS
```

Never trust sensitive values directly from the frontend, including:

- restaurantId
- role
- price
- tax
- order total
- item availability

The server must validate and calculate sensitive values.

The Supabase service-role key must never reach the frontend. It may only be used in secure backend environments where required, with explicit tenant and authorization checks.

---

## 6. Multi-Tenant Architecture

Every restaurant is an isolated tenant.

```text
Organization
 ├── Outlet A
 │    ├── Users
 │    ├── Tables
 │    ├── Menu
 │    ├── Orders
 │    ├── Customers
 │    ├── Inventory
 │    └── Analytics
 │
 ├── Outlet B
 └── Outlet C
```

Restaurant A must never access Restaurant B's:

- Orders
- Customers
- Menu
- Inventory
- Analytics
- Staff
- Integrations
- Credentials

---

## 7. Roles & Permissions

Minimum roles:

- Super Admin
- Restaurant Owner
- Restaurant Admin
- Manager
- Kitchen Staff
- Waiter/Captain
- Billing/Counter Staff

Use permission-based authorization rather than screen-only access control.

---

# PHASE 1 — FOUNDATION

## 8. Node.js Backend

Recommended structure:

```text
server/
└── src/
    ├── config/
    ├── middleware/
    ├── routes/
    ├── modules/
    │   ├── auth/
    │   ├── restaurants/
    │   ├── outlets/
    │   ├── users/
    │   ├── tables/
    │   ├── menu/
    │   ├── orders/
    │   ├── inventory/
    │   ├── customers/
    │   ├── analytics/
    │   ├── notifications/
    │   └── integrations/
    │       ├── petpooja/
    │       ├── zomato/
    │       └── swiggy/
    ├── services/
    ├── jobs/
    ├── queues/
    ├── utils/
    └── app.js
```

Do not create one massive server file.

---

## 9. Reliability & Observability

Implement:

- Central error handling
- Structured logs
- Request IDs
- API latency monitoring
- Error tracking
- Integration health
- Queue monitoring
- Database monitoring
- Alerts
- Backups
- Recovery procedures

Critical operations must be retry-safe and auditable.

---

## 10. Audit Logs

Record:

- Menu changes
- Price changes
- Order status changes
- Inventory adjustments
- Staff changes
- Customer changes
- Integration changes
- Subscription changes
- Sensitive administrative actions

---

# PHASE 2 — UNIVERSAL ORDER ENGINE

## 11. Universal Order Architecture

Every order source enters the same internal order system.

Sources:

```text
SERVORA_QR
SERVORA_WEBSITE
PICKUP
DELIVERY
PETPOOJA
ZOMATO
SWIGGY
FUTURE_POS
FUTURE_CHANNEL
```

Flow:

```text
Source
  ↓
Provider Adapter
  ↓
Normalizer
  ↓
Universal Order Engine
  ↓
Order State Machine
  ↓
Servora Database
  ↓
KDS / Dashboard / CRM / Analytics
```

---

## 12. Universal Order Model

Conceptual model:

```js
{
  id,
  restaurantId,
  outletId,
  source,
  externalOrderId,
  customerId,
  tableId,
  sessionId,
  orderType,
  items: [],
  pricing: {
    subtotal,
    discount,
    tax,
    packaging,
    delivery,
    total
  },
  payment: {
    status,
    method,
    reference
  },
  delivery: {
    status,
    partner,
    tracking
  },
  status,
  timestamps: {
    createdAt,
    acceptedAt,
    preparingAt,
    readyAt,
    pickedUpAt,
    completedAt,
    cancelledAt
  }
}
```

Reuse/migrate existing Servora order structures rather than creating duplicate order models.

---

## 13. Order State Machine

Example:

```text
NEW
 ↓
ACCEPTED
 ↓
PREPARING
 ↓
READY
 ↓
PICKED_UP
 ↓
COMPLETED
```

Cancellation paths must be explicit.

Invalid transitions must be rejected.

---

## 14. Idempotency

Required for:

- Order creation
- External order ingestion
- Accept/reject
- Status updates
- Payment events
- Webhooks
- Menu synchronization
- Availability synchronization

If an external provider sends the same event three times, Servora must process it once.

---

# PHASE 3 — INTEGRATION LAYER

## 15. Provider Adapter Architecture

Never hard-code provider-specific logic into the core order system.

```text
IntegrationManager
       │
       ├── PetpoojaAdapter
       ├── ZomatoAdapter
       ├── SwiggyAdapter
       └── FuturePOSAdapter
```

Common capabilities:

```text
connect()
disconnect()
syncMenu()
syncAvailability()
pushOrder()
getOrderStatus()
handleWebhook()
healthCheck()
```

Provider-specific behavior stays inside its adapter.

---

# PHASE 4 — PETPOOJA

## 16. Petpooja Integration Objective

Allow restaurants to continue using Petpooja billing/POS while using Servora for:

- QR ordering
- Digital menu
- Table sessions
- CRM
- Inventory
- Analytics
- Customer experience
- Direct ordering

### Official-only requirement

Servora must use only:

- Official Petpooja API
- Official integration program
- Approved credentials
- Approved authentication
- Approved data access

Never:

- Scrape Petpooja
- Reverse-engineer private endpoints
- Use stolen/private tokens
- Use undocumented APIs
- Ask restaurants for their Petpooja password

---

## 17. Petpooja Onboarding

Before development:

1. Contact Petpooja.
2. Request third-party integration/partner access.
3. Request API documentation.
4. Request sandbox/test credentials.
5. Confirm commercial requirements.
6. Confirm endpoints.
7. Confirm webhook/event support.
8. Confirm menu/order/status/availability access.
9. Confirm restaurant/outlet mapping.
10. Confirm data/privacy limitations.

---

## 18. Petpooja MVP

Start with a tiny proof of concept:

```text
Servora Test Order
        ↓
Petpooja Adapter
        ↓
Petpooja API
        ↓
Test Restaurant / Sandbox
```

Verify:

- Order creation
- Correct restaurant/outlet
- Correct items
- Quantities
- Prices
- Taxes/charges where supported
- Order source
- Status

Then add:

- Status synchronization
- Menu mapping
- Availability
- Retry
- Webhook processing
- Integration health

---

## 19. Menu Mapping

Never assume Servora and external POS IDs match.

Mapping table:

```text
restaurantId
servoraItemId
externalProvider
externalItemId
status
lastSyncedAt
```

Example:

```text
SERVORA_123 → PETPOOJA_98231
```

Support mapping for:

- Categories
- Items
- Variants
- Add-ons
- Modifiers

---

## 20. Integration Event Store

Store:

```text
provider
eventId
restaurantId
outletId
externalOrderId
eventType
payloadHash
receivedAt
processedAt
status
retryCount
error
```

Purpose:

- Deduplication
- Debugging
- Audit
- Replay
- Recovery

---

## 21. Integration Failure Handling

External integrations must never bring down Servora.

```text
Petpooja unavailable
       ↓
Servora receives order
       ↓
Queue
       ↓
Retry
       ↓
Success
```

Dashboard:

```text
Petpooja Connection
⚠ DEGRADED

Orders queued: 3
Last successful sync: 10:42 AM
```

Implement:

- Exponential retry
- Maximum retry count
- Dead-letter queue
- Integration health
- Alerts

---

# PHASE 5 — OMNICHANNEL ORDERS

## 22. Order Center

Single dashboard for:

```text
Servora QR
Website
Petpooja
Zomato
Swiggy
Pickup
Delivery
```

Filters:

- All
- New
- Preparing
- Ready
- Completed
- Cancelled
- Source

Order card:

```text
Order ID
Source
Customer
Table
Items
Amount
Payment
Status
Time
```

Real-time updates are required.

---

# PHASE 6 — KITCHEN

## 23. Kitchen Display System

Views:

```text
NEW
PREPARING
READY
COMPLETED
```

Features:

- Kitchen timer
- Priority
- Source
- Modifiers
- Notes
- Alerts
- Station filtering
- Order history

Future stations:

- Grill
- Main Kitchen
- Bar
- Dessert
- Packing

---

# PHASE 7 — MENU

## 24. Central Menu Engine

```text
Restaurant
 └── Menu
      ├── Categories
      ├── Items
      ├── Variants
      ├── Add-ons
      ├── Combos
      └── Availability
```

Menu item:

- Name
- Description
- Image
- Price
- Tax
- Category
- SKU
- Availability
- Preparation time
- Inventory mapping

Availability:

```text
IN_STOCK
LOW_STOCK
OUT_OF_STOCK
SCHEDULED
```

Support breakfast/lunch/dinner scheduled menus.

---

# PHASE 8 — TABLES

## 25. Table & Session Management

States:

```text
AVAILABLE
OCCUPIED
ORDERING
PREPARING
BILL_REQUESTED
COMPLETED
```

Session tracks:

- Start time
- Customers
- Orders
- Items
- Amount
- Duration
- Payment
- End time

Analytics:

- Table turnover
- Average table value
- Session duration
- Peak occupancy

---

# PHASE 9 — INVENTORY

## 26. Inventory 2.0

Inventory:

- Raw material
- Unit
- Quantity
- Minimum stock
- Maximum stock
- Cost
- Supplier

Purchasing:

- Purchase orders
- Suppliers
- Purchase invoices
- Received quantity
- Damaged stock
- Returns

---

## 27. Recipe Mapping

Example:

```text
Paneer Tikka
=
Paneer 200g
+
Spices 20g
+
Oil 10ml
```

Order:

```text
Paneer Tikka ×2
```

automatically consumes mapped ingredients.

---

## 28. Inventory → Menu Automation

```text
Inventory
    ↓
Recipe
    ↓
Menu Item
```

Example:

```text
Paneer = 0
     ↓
Paneer Tikka unavailable
     ↓
Menu becomes unavailable
```

Where external APIs officially support it, propagate availability externally.

---

# PHASE 10 — CRM

## 29. Advanced CRM

Customer profile:

- Name
- Contact information where lawfully collected
- Total orders
- Total spend
- Average order value
- Last order
- Favorite items
- Segment

Segments:

```text
NEW
RETURNING
VIP
HIGH_VALUE
INACTIVE
FREQUENT
WEEKEND
```

Customer timeline:

```text
Order
Feedback
Order
Coupon
Order
```

Respect consent and third-party data restrictions.

---

# PHASE 11 — DIRECT ONLINE ORDERING

## 30. Restaurant Online Ordering

Features:

- Restaurant branding
- Menu
- Search
- Cart
- Checkout
- Pickup
- Delivery
- Order tracking
- Offers
- CRM integration

Future:

```text
restaurant.servora.app
```

Custom domains later.

---

# PHASE 12 — TRACKING & NOTIFICATIONS

## 31. Customer Order Tracking

```text
ORDER CONFIRMED
       ↓
PREPARING
       ↓
READY
       ↓
OUT FOR DELIVERY
       ↓
DELIVERED
```

Only display ETA when reliable data is available.

---

## 32. Notification Engine

Channels:

- In-app
- Push
- Email
- SMS
- WhatsApp through approved providers

Events:

- Order confirmed
- Preparing
- Ready
- Out for delivery
- Delivered
- Cancelled
- Payment success/failure

Central notification service must support templates, retries and delivery status.

---

# PHASE 13 — ANALYTICS

## 33. Omnichannel Analytics

Metrics:

- Gross sales
- Net sales where supported
- Orders
- Average order value
- Cancellation rate
- Item popularity
- Peak hours
- Repeat customer rate
- Channel mix

Channels:

```text
Servora QR
Website
Petpooja-connected orders
Zomato
Swiggy
Pickup
Delivery
```

---

## 34. Profit & Commission Intelligence

Where reliable fee data exists:

```text
Channel
Gross Sales
Discount
Commission
Fees
Net Revenue
```

Never invent external platform commissions.

---

# PHASE 14 — LOYALTY

## 35. Loyalty & Retention

Features:

- Points
- Rewards
- Tiers
- Coupons
- Referral program
- Reorder
- Campaigns

Example:

```text
Customer inactive 30 days
        ↓
Eligible campaign
        ↓
Offer
```

Use compliant messaging and consent.

---

# PHASE 15 — AI

## 36. AI Restaurant Intelligence

Add after data quality and core workflows are reliable.

Example:

> Why was revenue lower today?

Servora should explain using actual restaurant data:

```text
Revenue decreased versus the comparable period.

Main contributors:
- Lower dinner order volume
- High-selling items unavailable
- Lower online channel volume

Suggested actions:
- Restore item availability
- Review dinner promotion
```

Features:

- Sales explanation
- Demand forecasting
- Inventory prediction
- Slow-moving item detection
- Customer segmentation
- Menu recommendations
- Stockout prediction

AI output must be based on supporting business data.

---

# PHASE 16 — MULTI-OUTLET

## 37. Multi-Outlet Management

```text
Organization
 ├── Outlet A
 ├── Outlet B
 ├── Outlet C
 └── Central Kitchen
```

Features:

- Central dashboard
- Outlet comparison
- Central menu
- Inventory
- Staff
- Permissions
- Consolidated analytics

---

# PHASE 17 — SUPER ADMIN

## 38. Super Admin

Show:

```text
Restaurant
Plan
Status
Orders Today
Revenue
Last Active
Integration Health
Inventory Alerts
Errors
```

Restaurant health:

```text
HEALTHY
ATTENTION
CRITICAL
```

---

# PHASE 18 — SUPPORT

## 39. Support System

Build:

- Support tickets
- FAQ
- In-app help
- Incident history
- Integration diagnostics

Support should diagnose issues without manually editing production records.

---

# PHASE 19 — SUBSCRIPTIONS

## 40. Proposed Plans

### Starter — ₹999/month

- Dynamic QR
- Digital menu
- Table sessions
- Basic orders
- Basic analytics

### Growth — ₹2,499/month

Everything in Starter +

- Inventory
- CRM
- Advanced analytics
- Pickup/delivery
- Staff management
- Advanced order center

### Pro — ₹5,000/month

Everything in Growth +

- Approved POS integrations
- Advanced inventory
- Advanced CRM
- AI insights
- Multi-outlet
- Advanced analytics
- Priority support

Pricing should be validated with actual restaurant sales feedback.

---

# PHASE 20 — ONBOARDING

## 41. Restaurant Onboarding

```text
Create Account
     ↓
Restaurant Profile
     ↓
Import Menu
     ↓
Create Tables
     ↓
Generate QR
     ↓
Configure Orders
     ↓
Connect Existing POS
     ↓
Add Staff
     ↓
Test Order
     ↓
GO LIVE
```

Support:

- CSV import
- Bulk menu import
- Bulk tables
- Bulk inventory
- Bulk images

---

# PHASE 21 — TESTING

## 42. Testing Strategy

Every major feature requires:

### Unit Tests
Business logic.

### Integration Tests
API + database + adapters.

### E2E Tests
Complete customer and restaurant workflows.

### Load Tests
Concurrent restaurants, customers and orders.

### Security Tests
RLS, authorization, tenant isolation, API abuse and validation.

### Failure Tests
Timeouts, retries, duplicate webhooks, provider outages, database failures and queue failures.

### Regression Tests
Existing Servora functionality after every major release.

---

## 43. High-Pressure Workload Test

Simulate:

```text
100+ restaurants
1,000+ tables
10,000+ customers
Thousands of menu items
Thousands of concurrent sessions
Hundreds/thousands of simultaneous orders
Multiple order sources
Webhook bursts
Inventory updates
CRM updates
Realtime dashboard updates
```

Test:

- QR ordering
- Table sessions
- Order creation
- Kitchen processing
- Status changes
- Inventory deduction
- CRM updates
- Analytics
- External integration events
- Duplicate events
- Retries
- Provider failures
- Recovery

Success criteria:

- No data corruption
- No cross-tenant leakage
- No duplicate critical orders
- No lost critical events
- Acceptable API latency
- Stable database
- Recoverable failed integrations

---

# PHASE 22 — DEFINITION OF DONE

## 44. Feature Completion Standard

A feature is NOT complete because the UI works.

It is complete only when:

```text
UI
+
API
+
Database
+
Validation
+
Authorization
+
RLS
+
Error Handling
+
Loading States
+
Empty States
+
Logging
+
Monitoring
+
Tests
+
Documentation
```

are complete.

---

# PHASE 23 — PRIORITY

## 45. P0 — Foundation

```text
Dedicated Node.js backend
Multi-tenant security
RBAC
RLS hardening
Universal Order Engine
Order state machine
Idempotency
Audit logs
Observability
Integration architecture
```

## 46. P1 — Core Operations

```text
Omnichannel Order Center
KDS
Central Menu
Inventory 2.0
Inventory → Menu Availability
Advanced CRM
Direct Online Ordering
Order Tracking
Notifications
```

## 47. P2 — Integrations & Growth

```text
Petpooja official integration
Zomato official integration
Swiggy official integration
Loyalty
Campaigns
Advanced Analytics
Multi-outlet
```

## 48. P3 — Intelligence

```text
AI insights
Demand forecasting
Advanced recommendations
Central kitchen
Enterprise workflows
```

---

# PHASE 24 — DEVELOPMENT ROADMAP

## 49. Recommended Sequence

```text
1. Audit existing Servora
        ↓
2. Introduce Node.js backend
        ↓
3. Secure Supabase + RLS
        ↓
4. Build Universal Order Engine
        ↓
5. Build Order State Machine
        ↓
6. Build Integration Framework
        ↓
7. Petpooja official POC
        ↓
8. Omnichannel Order Center
        ↓
9. KDS
        ↓
10. Central Menu
        ↓
11. Inventory 2.0
        ↓
12. CRM 2.0
        ↓
13. Direct Online Ordering
        ↓
14. Tracking + Notifications
        ↓
15. Official Zomato/Swiggy integrations
        ↓
16. Advanced Analytics
        ↓
17. Multi-outlet
        ↓
18. AI Intelligence
```

---

# PHASE 25 — 90-DAY PLAN

## Days 1–15 — Architecture & Security

- Audit existing code
- Identify duplicate logic
- Create Node.js backend
- Establish API structure
- Harden RLS
- Implement RBAC
- Implement tenant isolation
- Add logging
- Add error handling
- Add monitoring

## Days 16–30 — Universal Order Engine

- Universal order model
- Order state machine
- Idempotency
- Event store
- Order service
- Webhook foundation
- Queue foundation

## Days 31–45 — Operations

- Omnichannel Order Center
- KDS
- Advanced table sessions
- Central menu
- Availability system

## Days 46–60 — Inventory + CRM

- Recipe inventory
- Stock alerts
- Inventory/menu mapping
- Customer profiles
- Segmentation
- Customer timeline

## Days 61–75 — Direct Ordering

- Restaurant online ordering
- Pickup
- Delivery
- Customer tracking
- Notifications

## Days 76–90 — Integrations

- Integration gateway
- Petpooja POC
- Provider adapter
- Webhook verification
- Retry system
- Integration health
- Load testing
- Security testing

External partner approval timelines are outside engineering control.

---

# PHASE 26 — 6–12 MONTH ROADMAP

```text
MONTH 1  — Foundation + Security
MONTH 2  — Universal Order Engine + Order Center
MONTH 3  — KDS + Central Menu + Inventory
MONTH 4  — CRM + Direct Ordering
MONTH 5  — Petpooja Integration Pilot
MONTH 6  — Zomato/Swiggy Integration Readiness
MONTH 7  — Omnichannel Analytics
MONTH 8  — Loyalty + Campaigns
MONTH 9  — Multi-outlet
MONTH 10 — Advanced Inventory
MONTH 11 — AI Intelligence
MONTH 12 — Enterprise + Partner Ecosystem
```

Timeline must be adjusted based on engineering capacity, customer feedback and external integration approvals.

---

# PHASE 27 — NORTH STAR

## 50. North Star Metric

> **Successful restaurant orders processed through Servora per month.**

Supporting metrics:

### Restaurants
- Active restaurants
- Weekly active restaurants
- Monthly active restaurants
- Retention
- Churn

### Customers
- Monthly active customers
- Repeat order rate
- Conversion rate

### Orders
- Orders/day
- Orders/month
- Order success rate
- Cancellation rate
- Average order value

### Operations
- Average preparation time
- Table turnover
- Stockout rate

### Platform
- API P95
- Error rate
- Integration success rate
- Webhook success rate

---

# 51. Competitive Strategy

Do NOT sell:

> Servora has more features than Petpooja.

Sell:

> **Keep your existing POS. Servora gives your restaurant a modern digital operating layer.**

Core differentiation:

### Customer Experience
- QR ordering
- Fast menu
- Direct ordering
- Order tracking

### Restaurant Operations
- Tables
- Orders
- KDS
- Inventory

### Customer Ownership
- CRM
- Loyalty
- Direct ordering

### Business Intelligence
- Analytics
- Channel performance
- AI insights

### Integration
- Existing POS
- Aggregators
- Future ecosystem

---

# 52. Final Product Architecture

```text
                         SERVORA
                            │
        ┌───────────────────┼────────────────────┐
        │                   │                    │
        ▼                   ▼                    ▼
Customer Experience   Restaurant Operations   Integrations
        │                   │                    │
        ├── QR              ├── Orders           ├── Petpooja
        ├── Website         ├── Tables           ├── Zomato
        ├── Ordering        ├── KDS              ├── Swiggy
        ├── Tracking        ├── Inventory        ├── Payments
        └── Loyalty         ├── CRM              └── Future POS
                            ├── Staff
                            └── Analytics
                                     │
                                     ▼
                           Universal Order Engine
                                     │
                         ┌───────────┼───────────┐
                         ▼           ▼           ▼
                      Orders     Customers    Inventory
                         │           │           │
                         └───────────┼───────────┘
                                     ▼
                              AI Intelligence
```

---

# 53. Final Engineering Directive

Before implementing any feature:

1. Inspect the existing repository.
2. Reuse existing functionality where appropriate.
3. Remove unnecessary duplicate logic.
4. Do not create duplicate models for the same entity.
5. Keep business logic in reusable services.
6. Keep external integrations behind adapters.
7. Keep tenant isolation mandatory.
8. Keep RLS enabled.
9. Never expose service credentials to the frontend.
10. Make critical operations idempotent.
11. Use queues for retryable external operations.
12. Add tests before declaring features complete.
13. Run regression tests after major changes.
14. Never use production customer data for testing.
15. Never use private/undocumented third-party APIs.
16. Use official integration programs.
17. Document every external integration.
18. Monitor production-critical workflows.
19. Build for failure, not only the happy path.
20. Prefer simple, maintainable architecture over unnecessary microservices.

---

# 54. Final Product Goal

The complete Servora workflow should become:

```text
CUSTOMER
   ↓
Scan QR / Visit Website
   ↓
Browse Dynamic Menu
   ↓
Order
   ↓
Servora Universal Order Engine
   ↓
Kitchen
   ↓
Existing POS / Billing
   ↓
Payment
   ↓
Order Completed
   ↓
Inventory Updated
   ↓
CRM Updated
   ↓
Analytics Updated
   ↓
Customer Retention
```

External channels:

```text
Petpooja
Zomato
Swiggy
Website
QR
Pickup
Delivery
   ↓
Integration Layer
   ↓
Universal Order Engine
   ↓
Servora
```

---

# 55. Final Strategic Statement

Servora should NOT try to win by rebuilding everything established POS companies already do.

Servora should win by becoming the **modern digital layer that restaurants want to add to their existing systems.**

The strongest initial proposition is:

> **Don't replace your POS. Connect Servora to it.**

Then expand:

```text
POS Integration
      ↓
Digital Ordering
      ↓
Customer Ownership
      ↓
Inventory Intelligence
      ↓
Omnichannel Operations
      ↓
Analytics
      ↓
AI
```

### Immediate engineering priority

> **Node.js Backend + Secure Supabase/RLS + Universal Order Engine + Integration Layer + Petpooja Proof of Concept.**

Everything else should build on this foundation.
