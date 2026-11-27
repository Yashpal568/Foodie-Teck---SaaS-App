# Foodie-Tech SaaS — Pre-Launch High-Pressure Test Script

**Document type:** Production Readiness / QA / Security / E2E Test Plan  
**Product:** Foodie-Tech SaaS  
**Purpose:** Break the application before real restaurants and customers do.  
**Primary operator:** Antigravity AI coding/testing agent  
**Release rule:** Do not recommend production launch while any P0/Critical issue remains unresolved.

---

## 1. Mission

Act as a senior QA engineer, SDET, application security tester, reliability engineer, and production-readiness reviewer.

Your objective is **not** to prove that Foodie-Tech works.

Your objective is to **find ways to make Foodie-Tech fail**.

Test the application from the perspective of:

- Restaurant owner
- Restaurant admin
- Restaurant staff
- Customer
- Unauthenticated visitor
- Malicious authenticated user
- Competing tenant trying to access another tenant
- User on a slow/unreliable network
- Multiple simultaneous users
- Payment provider callback/retry
- Browser refresh/reload/back-button behavior
- Mobile devices
- Large datasets
- Concurrent requests
- Invalid/malformed API requests

Do not modify production data.

Use a dedicated local/staging test environment, test database, test payment credentials, and test accounts.

---

# 2. Non-Negotiable Rules

1. Never run destructive tests against production.
2. Never expose, print, commit, or modify real secrets.
3. Do not delete real customer/business data.
4. Do not disable security controls merely to make tests pass.
5. Do not mark a test as passed because the UI looks correct; verify backend/database behavior where applicable.
6. Never trust frontend validation as a security boundary.
7. Verify authorization on the backend/API.
8. Never change business logic merely to make a test pass without understanding the root cause.
9. Every discovered defect must have reproduction steps.
10. After every fix, rerun the failing test and related regression tests.
11. Do not invent commands. Inspect `package.json`, project configuration, and existing test infrastructure first.
12. Do not install unnecessary dependencies without documenting why.
13. Preserve existing functionality.
14. Do not silently rewrite large parts of the application.
15. If a test cannot be executed, mark it `BLOCKED`, explain why, and do not mark it `PASS`.
16. Separate environment/configuration failures from application defects.
17. Never claim a security test passed if it was not actually executed.
18. Never claim load capacity without measuring it.
19. Keep all test artifacts reproducible.
20. Final launch recommendation must be based on evidence.

---

# 3. Test Environment

Create or verify:

- [ ] Dedicated test/staging environment
- [ ] Dedicated test database
- [ ] Test restaurant accounts
- [ ] Test customer accounts if applicable
- [ ] Test admin/owner/staff accounts
- [ ] Test payment credentials
- [ ] Test email/OTP credentials if applicable
- [ ] Test Cloudinary/storage configuration if applicable
- [ ] Test environment variables
- [ ] Browser automation capability
- [ ] API testing capability
- [ ] Database inspection capability
- [ ] Network throttling capability
- [ ] Logs accessible
- [ ] Error monitoring accessible

Never use production credentials in automated tests.

---

# 4. First: Understand the Codebase

Before testing, inspect the project.

Identify:

- Frontend framework
- Backend framework
- Database
- ORM/ODM
- Authentication mechanism
- Authorization middleware
- API routes
- Controllers/services
- Models/schemas
- File upload/storage system
- Payment provider
- Email/OTP provider
- QR implementation
- Session/cart implementation
- Subscription/billing implementation
- Analytics implementation
- Deployment configuration
- Existing unit tests
- Existing integration tests
- Existing E2E tests
- Existing lint/type-check/build commands

Inspect:

- `package.json`
- lockfiles
- environment examples
- frontend entry points
- backend entry points
- routes
- controllers
- middleware
- models
- services
- utilities
- test directories
- deployment configuration

Do not assume the project uses a specific folder structure.

Record the discovered architecture in the final report.

---

# 5. Application Health Baseline

Before functional testing:

- [ ] Install dependencies successfully
- [ ] Start frontend
- [ ] Start backend
- [ ] Connect database
- [ ] Verify health endpoint if available
- [ ] Verify frontend loads
- [ ] Verify backend responds
- [ ] Verify database connectivity
- [ ] Verify static assets
- [ ] Verify image/storage service
- [ ] Verify authentication
- [ ] Verify required third-party integrations

Run only commands that actually exist in the project.

Typical candidates, only if present:

```bash
npm test
npm run test
npm run lint
npm run typecheck
npm run build
```

Record:

- command
- result
- duration
- errors
- warnings

---

# 6. Test Account Matrix

Create at least:

### Restaurant A

- Owner A
- Admin A
- Staff A
- Customer A

### Restaurant B

- Owner B
- Admin B
- Staff B
- Customer B

### Restaurant C

- Owner C

Create:

- 10+ tables per restaurant
- 10+ categories
- 100+ menu items where practical
- Active items
- Inactive items
- Out-of-stock items
- Items with images
- Items without images
- Items with short names
- Items with very long names
- Items with long descriptions
- Different prices
- Special characters
- Unicode/emoji where supported

---

# 7. Authentication Testing

## Registration

Test:

- [ ] Valid registration
- [ ] Duplicate email
- [ ] Duplicate phone
- [ ] Duplicate username if applicable
- [ ] Invalid email
- [ ] Invalid phone
- [ ] Empty required fields
- [ ] Missing fields
- [ ] Extra fields
- [ ] Whitespace
- [ ] Leading/trailing spaces
- [ ] Very long input
- [ ] Special characters
- [ ] Unicode
- [ ] Password too short
- [ ] Password mismatch
- [ ] Weak password
- [ ] Repeated registration requests
- [ ] Double-click submit
- [ ] Refresh during submission
- [ ] Close browser during submission

Expected:

- Correct validation
- No duplicate accounts
- No sensitive data leakage
- No duplicate backend operations

## Login

Test:

- [ ] Correct credentials
- [ ] Wrong password
- [ ] Wrong email
- [ ] Empty credentials
- [ ] Case sensitivity
- [ ] Multiple rapid attempts
- [ ] Login from multiple devices
- [ ] Login after logout
- [ ] Expired session
- [ ] Invalid token
- [ ] Modified token
- [ ] Missing token
- [ ] Direct access to protected route without login

## Logout

Test:

- [ ] Logout
- [ ] Browser back after logout
- [ ] Refresh after logout
- [ ] Open protected URL after logout
- [ ] Reuse previous API token if applicable

Expected:

Protected resources remain protected.

---

# 8. Password / OTP / Reset Flow

If implemented:

- [ ] Forgot password
- [ ] Valid reset
- [ ] Invalid reset token
- [ ] Expired reset token
- [ ] Reuse reset token
- [ ] Multiple reset requests
- [ ] OTP generation
- [ ] Correct OTP
- [ ] Incorrect OTP
- [ ] Expired OTP
- [ ] Reuse OTP
- [ ] Excessive OTP attempts
- [ ] Resend OTP
- [ ] Rapid resend requests
- [ ] Password reset after logout

Check that secrets/OTP/passwords are not exposed in responses or logs.

---

# 9. Authorization / Role Testing

For every protected action, test every role.

Examples:

- View dashboard
- View orders
- Modify orders
- Create menu item
- Edit menu item
- Delete menu item
- Create table
- Delete table
- Generate QR
- Manage staff
- View analytics
- Manage subscription
- Manage billing
- Delete restaurant
- Change restaurant settings

Verify both:

1. UI behavior
2. Direct API behavior

A hidden frontend button is not sufficient.

---

# 10. Multi-Tenant Isolation — CRITICAL

This is a launch-blocking test.

Restaurant A must never access Restaurant B data.

Test:

- [ ] B menu from A account
- [ ] B categories
- [ ] B tables
- [ ] B QR records
- [ ] B orders
- [ ] B customers
- [ ] B staff
- [ ] B analytics
- [ ] B revenue
- [ ] B subscription
- [ ] B settings
- [ ] B uploaded files
- [ ] B exported reports

Attempt:

- Changing IDs in URLs
- Changing IDs in API bodies
- Changing query parameters
- Changing route parameters
- Replaying requests
- Using guessed database IDs
- Using another tenant's resource IDs
- Calling APIs directly instead of through UI

Expected:

`401` or `403`, or equivalent secure rejection.

No unauthorized data should be returned.

---

# 11. Restaurant Onboarding

Test complete onboarding:

```text
Signup
→ Login
→ Create restaurant
→ Configure restaurant
→ Add categories
→ Add menu
→ Add tables
→ Generate QR
→ Scan QR
→ Customer orders
→ Restaurant receives order
→ Order processed
→ Order completed
```

Test:

- [ ] Refresh each step
- [ ] Leave and return
- [ ] Invalid data
- [ ] Missing required data
- [ ] Duplicate submission
- [ ] Network interruption
- [ ] Browser close/reopen
- [ ] Mobile device

---

# 12. Restaurant Profile / Settings

Test:

- [ ] Create
- [ ] View
- [ ] Edit
- [ ] Save
- [ ] Cancel
- [ ] Refresh
- [ ] Upload logo
- [ ] Replace logo
- [ ] Remove logo
- [ ] Long restaurant name
- [ ] Special characters
- [ ] Address
- [ ] Phone
- [ ] Business hours
- [ ] Currency
- [ ] Tax settings if applicable
- [ ] Invalid values

Verify changes persist after logout/login.

---

# 13. Menu Management

Test:

- [ ] Create category
- [ ] Edit category
- [ ] Delete category
- [ ] Duplicate category
- [ ] Create item
- [ ] Edit item
- [ ] Delete item
- [ ] Toggle availability
- [ ] Toggle active/inactive
- [ ] Change price
- [ ] Change category
- [ ] Search
- [ ] Filter
- [ ] Sort
- [ ] Pagination if available

Input tests:

- Empty name
- Empty price
- Negative price
- Zero price
- Decimal price
- Extremely large price
- Very long name
- Very long description
- HTML
- Script-like input
- Special characters
- Unicode
- Emoji

---

# 14. Image / File Upload Testing

If implemented:

- [ ] Valid image
- [ ] Large image
- [ ] Very large image
- [ ] Unsupported extension
- [ ] Wrong MIME type
- [ ] Corrupted file
- [ ] Empty file
- [ ] Filename with special characters
- [ ] Filename with path traversal-like strings
- [ ] Repeated upload
- [ ] Replace image
- [ ] Delete image

Verify:

- File type validation
- File size limits
- Secure storage
- No executable file upload
- No unauthorized file access
- No broken references

---

# 15. Table Management

Test:

- [ ] Create table
- [ ] Edit table
- [ ] Delete table
- [ ] Duplicate table number/name
- [ ] Large table number
- [ ] Special characters
- [ ] Generate QR
- [ ] Regenerate QR
- [ ] Download QR
- [ ] Print QR
- [ ] Delete table with active session/order
- [ ] Rename table with active session/order

Verify table/order relationships remain correct.

---

# 16. QR Code Testing

For every important table flow:

- [ ] Scan Android
- [ ] Scan iPhone
- [ ] Open in Chrome
- [ ] Open in Safari
- [ ] Open incognito
- [ ] Open multiple times
- [ ] Open from multiple devices
- [ ] Refresh
- [ ] Back/forward
- [ ] Share QR
- [ ] Print QR
- [ ] Scan after table changes
- [ ] Scan old QR after regeneration if applicable
- [ ] Test invalid QR
- [ ] Test expired/deleted QR

Critical:

Ensure the correct restaurant and correct table are associated with the customer session.

---

# 17. Customer Menu Testing

Test:

- [ ] Landing
- [ ] Restaurant branding
- [ ] Categories
- [ ] Items
- [ ] Images
- [ ] Search
- [ ] Filters
- [ ] Item details
- [ ] Availability
- [ ] Out-of-stock behavior
- [ ] Mobile layout
- [ ] Desktop layout
- [ ] Slow network
- [ ] Empty menu
- [ ] Large menu

---

# 18. Cart Testing

Test:

- [ ] Add item
- [ ] Remove item
- [ ] Increase quantity
- [ ] Decrease quantity
- [ ] Same item multiple times
- [ ] Multiple different items
- [ ] Empty cart
- [ ] Refresh
- [ ] Browser close/reopen
- [ ] Multiple tabs
- [ ] Multiple devices
- [ ] Item becomes unavailable
- [ ] Item price changes
- [ ] Invalid quantity
- [ ] Negative quantity
- [ ] Extremely large quantity

Critical:

The server must calculate authoritative price/total values.

Do not trust client-provided prices.

---

# 19. Order Creation

Test:

- [ ] Valid order
- [ ] Empty cart
- [ ] One item
- [ ] Many items
- [ ] Maximum reasonable quantity
- [ ] Invalid item ID
- [ ] Invalid restaurant ID
- [ ] Invalid table ID
- [ ] Item from another restaurant
- [ ] Modified price
- [ ] Modified total
- [ ] Negative quantity
- [ ] Huge quantity
- [ ] Duplicate request
- [ ] Rapid repeated submission

Critical:

Manipulating frontend payloads must not allow:

- Incorrect price
- Cross-tenant ordering
- Invalid item
- Unauthorized order
- Negative/invalid quantities

---

# 20. Duplicate Order / Race Condition Testing

Rapidly perform:

- [ ] Double-click Place Order
- [ ] Triple-click Place Order
- [ ] Submit from two tabs
- [ ] Submit from two devices
- [ ] Replay same request
- [ ] Retry after timeout
- [ ] Refresh immediately after submission
- [ ] Disconnect network immediately after submission
- [ ] Reconnect and retry

Expected:

One customer action must not unintentionally create multiple orders.

Verify database records, not just UI.

---

# 21. Order Lifecycle

Test every valid status transition.

Example:

```text
NEW
→ ACCEPTED
→ PREPARING
→ READY
→ COMPLETED
```

Also test:

- Cancellation
- Rejection
- Invalid transitions
- Repeated transitions
- Concurrent transitions
- Refresh during transition
- Two staff members changing same order

Verify status history if implemented.

---

# 22. Simultaneous Restaurant Rush Test

Use at least:

- 10 customer devices/browsers
- 10 tables
- 2 staff/admin users

Generate simultaneous orders.

Then increase where the environment permits:

- 20 concurrent users
- 50 concurrent orders
- 100 concurrent orders

Verify:

- Correct order IDs
- Correct table
- Correct items
- Correct quantities
- Correct totals
- Correct timestamps
- Correct status
- Correct restaurant
- No duplicates
- No missing orders
- No cross-user contamination

---

# 23. Payment / Subscription Testing

If Foodie-Tech has subscription billing:

Test:

- [ ] Successful payment
- [ ] Failed payment
- [ ] Cancelled payment
- [ ] Timeout
- [ ] Browser closed
- [ ] Network disconnected
- [ ] Duplicate payment attempt
- [ ] Duplicate webhook
- [ ] Delayed webhook
- [ ] Invalid webhook
- [ ] Modified amount
- [ ] Modified user/account ID
- [ ] Expired subscription
- [ ] Renewal
- [ ] Upgrade
- [ ] Downgrade
- [ ] Cancellation
- [ ] Grace period if applicable

Critical:

Never activate a paid plan solely because the frontend reports success.

Verify payment server-side using the provider's trusted mechanism.

---

# 24. Subscription Limit Testing

For each plan:

- [ ] Maximum restaurants
- [ ] Maximum tables
- [ ] Maximum menu items
- [ ] Maximum staff
- [ ] Maximum orders
- [ ] Analytics limits
- [ ] Feature restrictions

Attempt to bypass limits through:

- API calls
- Direct URLs
- Modified request payloads
- Multiple browser tabs
- Repeated requests

---

# 25. Analytics Testing

Create known test data.

Example:

```text
Order 1 = ₹100
Order 2 = ₹200
Order 3 = ₹300
Total expected = ₹600
```

Verify:

- [ ] Daily revenue
- [ ] Weekly revenue
- [ ] Monthly revenue
- [ ] Total orders
- [ ] Completed orders
- [ ] Cancelled orders
- [ ] Average order value
- [ ] Top products
- [ ] Order counts
- [ ] Date filtering
- [ ] Restaurant filtering if applicable

Compare dashboard results against database truth.

---

# 26. Search / Filter / Pagination

Test:

- Empty search
- Exact search
- Partial search
- Uppercase
- Lowercase
- Unicode
- Special characters
- No results
- Many results
- Page changes
- First page
- Last page
- Invalid page
- Large page number
- Multiple filters
- Rapid filter changes

Verify backend pagination where applicable.

---

# 27. API Testing

Discover all API endpoints.

For every protected endpoint test:

- [ ] No authentication
- [ ] Invalid authentication
- [ ] Expired authentication
- [ ] Wrong role
- [ ] Wrong tenant
- [ ] Missing required fields
- [ ] Extra fields
- [ ] Wrong data type
- [ ] Null values
- [ ] Empty body
- [ ] Malformed JSON
- [ ] Invalid IDs
- [ ] Duplicate requests
- [ ] Extremely large inputs

Check:

- Correct status code
- Safe error message
- No stack trace
- No secrets
- No internal database details
- No unauthorized data

---

# 28. NoSQL / Injection / XSS Testing

Use safe test payloads in the staging environment.

Test input fields for:

- Script-like HTML
- HTML tags
- Quote characters
- NoSQL operator-like objects
- Unexpected arrays
- Unexpected objects
- Special characters

Expected:

- Input safely handled
- No code execution
- No query manipulation
- No authorization bypass
- No database corruption

Do not test against systems you do not own or have authorization to test.

---

# 29. IDOR / Broken Access Control

For every resource with an ID:

1. Authenticate as Restaurant A.
2. Obtain Restaurant A resource ID.
3. Replace it with Restaurant B resource ID.
4. Send request.
5. Verify access is denied.

Repeat for:

- User
- Restaurant
- Menu
- Category
- Table
- QR
- Order
- Customer
- Analytics
- Subscription
- Uploaded asset

---

# 30. Rate-Limit / Abuse Testing

Test reasonable controlled bursts against your own staging system:

- Login
- OTP
- Registration
- Password reset
- Search
- Order creation
- File upload
- Payment initiation
- Public APIs

Verify the application does not become unstable.

If rate limiting exists:

- Confirm it triggers correctly.
- Confirm legitimate users recover normally.
- Confirm sensitive endpoints are protected.

Do not perform uncontrolled denial-of-service testing.

---

# 31. Network Failure Testing

During important operations:

Disconnect the network during:

- [ ] Login
- [ ] Registration
- [ ] Menu save
- [ ] Image upload
- [ ] Cart update
- [ ] Order placement
- [ ] Order status update
- [ ] Payment
- [ ] Logout

Reconnect.

Verify:

- No duplicate data
- No false success
- No corrupted state
- No infinite spinner
- User can recover

---

# 32. Slow Network Testing

Test under:

- Slow 3G
- High latency
- Intermittent network
- Wi-Fi → mobile switch
- Mobile → Wi-Fi switch

Observe:

- Initial load
- Menu loading
- Images
- Cart
- Order submission
- Admin dashboard
- Analytics

---

# 33. Browser Compatibility

Test where available:

### Chromium/Chrome

- [ ] Desktop
- [ ] Android

### Safari

- [ ] iPhone
- [ ] macOS if available

### Firefox

- [ ] Desktop

### Edge

- [ ] Desktop

Check:

- Layout
- Forms
- QR flow
- Authentication
- Cart
- Ordering
- Dashboard
- File uploads
- Payment

---

# 34. Mobile Responsiveness

Test:

- Small Android
- Large Android
- Small iPhone
- Large iPhone
- Tablet if applicable

Check:

- [ ] Navigation
- [ ] Menus
- [ ] Tables
- [ ] Forms
- [ ] Modals
- [ ] Dropdowns
- [ ] Keyboard behavior
- [ ] Buttons
- [ ] QR scanning
- [ ] Image uploads
- [ ] Long text
- [ ] Landscape
- [ ] Portrait

No horizontal overflow.

No inaccessible buttons.

No clipped content.

---

# 35. Refresh / Back Button Torture Test

Refresh during:

- Login
- Registration
- Dashboard
- Menu edit
- Cart
- Checkout
- Order submission
- Payment
- Status update

Then:

- [ ] Browser back
- [ ] Browser forward
- [ ] Open duplicate tab
- [ ] Close/reopen tab

Verify state remains safe and consistent.

---

# 36. Database Integrity

After heavy testing inspect the database.

Check:

- [ ] Duplicate records
- [ ] Orphan records
- [ ] Invalid references
- [ ] Invalid statuses
- [ ] Negative quantities
- [ ] Incorrect totals
- [ ] Incorrect restaurant IDs
- [ ] Incorrect table IDs
- [ ] Incorrect user IDs
- [ ] Missing timestamps
- [ ] Duplicate payments
- [ ] Missing orders
- [ ] Broken image references

Verify important invariants.

Examples:

```text
Order.restaurantId must match its restaurant.
Order.tableId must belong to that restaurant.
Order.item references must belong to that restaurant.
Order total must equal server-calculated line items.
```

---

# 37. Large Dataset Test

Populate staging with:

- 10+ restaurants
- 100+ categories
- 1,000+ menu items
- 10,000+ orders where practical
- Large analytics dataset

Measure:

- Dashboard load time
- Orders page load time
- Menu load time
- Search time
- API latency
- Database query time
- Memory usage
- CPU usage

Do not claim scalability from a small manual test.

---

# 38. Performance Testing

Measure:

- First page load
- API response time
- Database queries
- Large image loading
- Dashboard rendering
- Order submission
- Search
- Analytics

Look for:

- N+1 queries
- Unnecessary API calls
- Duplicate API calls
- Large payloads
- Unoptimized images
- Memory leaks
- Excessive rerenders
- Blocking operations

Record actual measurements where possible.

---

# 39. Frontend Error Handling

Force:

- 400
- 401
- 403
- 404
- 409
- 429 if applicable
- 500
- Network timeout

Verify:

- User sees understandable message.
- No raw stack trace.
- No blank page.
- No infinite loading.
- Retry option where appropriate.
- Application remains usable.

---

# 40. Backend Error Handling

Trigger:

- Invalid request
- Database unavailable
- Missing data
- Invalid ID
- Duplicate record
- Third-party service failure
- Storage failure
- Payment failure

Verify:

- Safe status code
- Safe response
- Structured error
- Useful server logs
- No secret leakage
- No process crash

---

# 41. Logging

Inspect logs.

Ensure logs do not contain:

- Passwords
- OTPs
- API secrets
- Payment secrets
- Authorization tokens
- Sensitive customer information unnecessarily

Logs should help diagnose failures without exposing secrets.

---

# 42. Environment / Configuration Testing

Verify:

- Production secrets are not hardcoded.
- `.env` is not committed.
- Test credentials are separated.
- Development URLs are not accidentally used in production.
- CORS is configured correctly.
- Cookie security is appropriate.
- HTTPS is used in production.
- Debug mode is disabled in production.
- Error verbosity is appropriate for production.

---

# 43. CORS / Security Headers

Verify production configuration for:

- CORS
- HTTPS
- Secure cookies where applicable
- HttpOnly cookies where applicable
- SameSite settings where applicable
- Content Security Policy where appropriate
- X-Content-Type-Options
- Referrer-Policy
- Frame protections
- Other relevant security headers

Do not blindly add headers that break legitimate functionality; verify behavior.

---

# 44. Secrets Scan

Search the repository for accidentally committed:

- API keys
- Database URLs
- JWT secrets
- Cloudinary credentials
- Payment credentials
- SMTP passwords
- Private keys
- Tokens

Never print actual secret values in the report.

Report only file/location and secret type.

---

# 45. Dependency / Build Check

Inspect:

- Outdated critical dependencies
- Known vulnerable dependencies where tooling is available
- Duplicate packages
- Unused packages
- Build warnings
- Runtime warnings

Do not upgrade major dependencies automatically during this QA pass.

If an upgrade is needed, report it separately unless explicitly authorized.

---

# 46. Marketing Website Testing

Test:

- [ ] Homepage
- [ ] Hero CTA
- [ ] Features
- [ ] Pricing
- [ ] FAQ
- [ ] Contact
- [ ] Login
- [ ] Signup
- [ ] Demo
- [ ] Footer
- [ ] Every navigation link
- [ ] Every CTA
- [ ] External links
- [ ] Mobile
- [ ] Tablet
- [ ] Desktop
- [ ] 404
- [ ] Metadata
- [ ] Favicon
- [ ] Social preview
- [ ] Images
- [ ] Forms

Click every important link manually/through browser automation.

---

# 47. SEO / Discoverability

Verify where applicable:

- Page title
- Meta description
- Canonical URL
- Robots configuration
- Sitemap
- Open Graph metadata
- Twitter/social metadata
- Proper heading hierarchy
- Image alt text
- No accidental `noindex`
- Production URLs

---

# 48. Accessibility

Check:

- Keyboard navigation
- Focus states
- Form labels
- Button labels
- Color contrast
- Screen-reader-friendly names
- Alt text
- Modal focus
- Error messages
- Form validation
- Touch target size
- Logical tab order

Do not rely exclusively on automated accessibility checks.

---

# 49. Session / Concurrency Testing

Test:

### Customer A

Table 1

### Customer B

Table 2

### Customer C

Table 3

Operate simultaneously.

Then test:

- Same account in multiple tabs
- Same account on multiple devices
- Two staff members modifying same order
- Owner and staff modifying same resource

Look for race conditions and stale state.

---

# 50. Real Restaurant Dinner-Rush Simulation

This is the final manual/E2E stress scenario.

Use:

- 10 tables
- 10+ customer sessions
- 2 staff sessions
- 1 owner/admin session

For at least 30–60 minutes:

Customers:

- Scan QR
- Browse
- Add items
- Remove items
- Place orders
- Refresh
- Close/reopen
- Change networks

Staff:

- Receive orders
- Accept
- Prepare
- Mark ready
- Complete
- Reject/cancel where supported

Admin:

- Open dashboard
- Inspect analytics
- Modify menu
- Change availability
- Refresh
- Navigate between pages

Introduce controlled failures:

- Slow network
- Network disconnect
- Browser refresh
- Duplicate clicks
- Multiple simultaneous requests

At the end compare database records with expected actions.

---

# 51. Disaster Recovery Test

Only in a safe staging environment.

Verify:

- [ ] Database backup exists
- [ ] Backup can be restored
- [ ] Restore procedure is documented
- [ ] Application can reconnect after restore
- [ ] Critical data remains intact

Do not destroy production data.

---

# 52. Test Case Result Format

Every executed test should be recorded as:

```text
Test ID:
Category:
Scenario:
Preconditions:
Steps:
Expected Result:
Actual Result:
Status: PASS / FAIL / BLOCKED
Severity:
Evidence:
Root Cause:
Fix:
Regression Test:
```

---

# 53. Severity Rules

## P0 — Critical / Launch Blocker

Examples:

- Cross-tenant data access
- Authentication bypass
- Payment corruption
- Duplicate financial transaction
- Data loss
- Orders assigned to wrong restaurant/table
- Server crashes under normal expected usage
- Secret exposure
- Remote code execution
- Critical authorization failure

**Action: STOP RELEASE.**

## P1 — High

Examples:

- Major production feature broken
- Ordering fails for a valid scenario
- Subscription activation incorrect
- Important dashboard calculations wrong
- QR flow unreliable
- Significant mobile failure

**Action: Fix before launch unless explicitly accepted by product owner.**

## P2 — Medium

Examples:

- Non-critical feature failure
- Recoverable UI bug
- Moderate performance issue
- Minor data presentation issue

## P3 — Low

Examples:

- Cosmetic issues
- Small spacing issues
- Minor copy problems
- Non-critical polish

---

# 54. Evidence Requirements

For every failure capture where possible:

- Screenshot
- Screen recording
- Browser console error
- Network request/response
- API endpoint
- HTTP status
- Relevant server log
- Database state
- Reproduction steps
- Timestamp
- Test account/role
- Environment

Never include real passwords or secrets in evidence.

---

# 55. Bug Deduplication

Before creating a new bug:

1. Search existing findings.
2. Determine whether it is the same root cause.
3. Link related tests.
4. Avoid duplicate bug reports.

One root cause may affect multiple features.

---

# 56. Fix Verification

For every fixed issue:

```text
Original failure
      ↓
Root cause identified
      ↓
Fix implemented
      ↓
Original test rerun
      ↓
Related tests rerun
      ↓
Regression verified
      ↓
PASS
```

Never mark a bug fixed solely because code changed.

---

# 57. Release Gate

Foodie-Tech must NOT be recommended for launch if:

- [ ] Any P0 exists
- [ ] Authentication bypass exists
- [ ] Cross-tenant data leak exists
- [ ] Payment integrity issue exists
- [ ] Duplicate order/payment issue exists
- [ ] Critical data integrity issue exists
- [ ] Production secrets are exposed
- [ ] Critical backup/recovery requirement is missing
- [ ] Core customer ordering flow is broken
- [ ] Core restaurant order-management flow is broken

---

# 58. Final Regression Suite

After all fixes, rerun at minimum:

1. Registration
2. Login
3. Logout
4. Restaurant onboarding
5. Restaurant settings
6. Menu creation
7. Menu editing
8. Menu deletion
9. Table creation
10. QR generation
11. QR scanning
12. Customer menu
13. Cart
14. Order creation
15. Duplicate-order protection
16. Restaurant order reception
17. Order status lifecycle
18. Analytics
19. Role permissions
20. Multi-tenant isolation
21. Payment/subscription
22. Mobile ordering
23. Network failure
24. API authorization
25. Production build
26. Marketing website
27. Critical security checks

---

# 59. Final Report

Generate:

`FOODIE_TECH_PRE_LAUNCH_TEST_REPORT.md`

Use:

```text
# Foodie-Tech Pre-Launch Test Report

## Executive Summary

## Environment

## Architecture Discovered

## Test Statistics

Total Tests:
Passed:
Failed:
Blocked:
Skipped:

## Severity Summary

P0:
P1:
P2:
P3:

## Security Result

Authentication:
Authorization:
Multi-Tenant Isolation:
IDOR:
Input Validation:
File Upload:
Rate Limiting:
Secrets:
Security Headers:

## Functional Result

Authentication:
Restaurant Management:
Menu:
Tables:
QR:
Customer Ordering:
Cart:
Orders:
Analytics:
Payments:
Subscriptions:

## Performance

Frontend:
Backend:
Database:
API:
Large Dataset:

## Mobile

Android:
iOS:
Responsive:

## Critical Findings

### P0

### P1

### P2

### P3

## Fixed Issues

## Remaining Issues

## Blocked Tests

## Regression Result

## Production Readiness

PASS / CONDITIONAL / FAIL

## Launch Recommendation

GO / NO-GO

## Evidence

List evidence locations without exposing secrets.
```

---

# 60. Antigravity Execution Instructions

When this file is given to the Antigravity agent:

### Phase A — Inspect

Understand the repository and architecture before modifying anything.

### Phase B — Baseline

Run existing tests, lint, type checks, and production build where available.

### Phase C — Functional

Execute the full customer and restaurant journeys.

### Phase D — API

Discover and test API authorization, validation, tenant isolation, and error handling.

### Phase E — Security

Perform authorized security tests against the staging/local environment.

### Phase F — Stress

Perform concurrency, duplicate-request, network-failure, large-data, and race-condition tests.

### Phase G — Browser

Execute real browser/mobile-oriented E2E flows.

### Phase H — Diagnose

For every failure, identify the root cause.

### Phase I — Fix

Fix only verified defects while preserving existing behavior.

### Phase J — Regression

Rerun the failed test and related tests after every fix.

### Phase K — Final Audit

Perform the complete release-gate regression suite.

### Phase L — Report

Generate the final test report with evidence and an explicit GO/NO-GO recommendation.

---

# 61. Important Agent Behavior

The agent must:

- Think adversarially.
- Prefer reproducible tests.
- Verify backend state.
- Verify database state for critical transactions.
- Test abnormal behavior, not just happy paths.
- Look for race conditions.
- Look for tenant isolation failures.
- Look for authorization bypasses.
- Look for duplicate transactions.
- Look for incorrect client/server trust boundaries.
- Look for error handling failures.
- Look for mobile failures.
- Look for performance bottlenecks.
- Look for production configuration mistakes.

The agent must NOT:

- Declare success without evidence.
- Skip difficult tests silently.
- Mark blocked tests as passed.
- Hide failures.
- Suppress errors merely to make the test green.
- Delete test evidence.
- Use production secrets.
- Modify production data.
- Claim security certification.

---

# 62. Definition of Done

Foodie-Tech is considered **pre-launch ready** only when:

- All P0 issues = 0
- All critical P1 issues = 0 or explicitly accepted
- Core customer journey passes
- Core restaurant journey passes
- Multi-tenant isolation passes
- Authentication passes
- Authorization passes
- Order integrity passes
- Duplicate-order protection passes
- Payment integrity passes where applicable
- Database integrity passes
- Mobile flow passes
- Network-failure behavior is acceptable
- Production build passes
- Critical security checks pass
- Backup/recovery is verified
- Final regression passes
- Final report is generated

---

# 63. Final Instruction

**Do not optimize for a high pass percentage.**

A test suite with 98% PASS and two hidden critical security bugs is a failure.

A test suite that finds serious problems before launch is doing its job.

Your success metric is:

> **Find the bugs before customers find them.**

Do not recommend launch until the evidence supports it.
