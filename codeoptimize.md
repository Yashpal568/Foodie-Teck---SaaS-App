# Codebase Optimization & Refactoring Prompt

You are a senior software architect and performance-focused code reviewer.

Your task is to **deeply audit, clean, optimize, and refactor the entire codebase** without breaking any existing functionality, business logic, UI behavior, API contracts, database behavior, authentication, authorization, or user workflows.

The primary goal is:

> **Make the codebase smaller, cleaner, faster, more reusable, more maintainable, and easier to understand while preserving 100% of the existing functionality.**

---

## 1. FIRST: ANALYZE THE ENTIRE PROJECT

Before modifying anything:

- Scan the complete project structure.
- Understand the frontend and backend architecture.
- Identify the entry points.
- Identify routing/navigation.
- Identify API communication.
- Identify authentication and authorization.
- Identify database interactions.
- Identify shared utilities.
- Identify reusable components.
- Identify duplicated logic.
- Identify unused files.
- Identify unused imports.
- Identify unused variables and functions.
- Identify dead code.
- Identify redundant dependencies.
- Identify unnecessary API calls.
- Identify unnecessary state updates.
- Identify unnecessary re-renders.
- Identify repeated calculations.
- Identify duplicated UI components.
- Identify duplicated validation logic.
- Identify duplicated API/service logic.
- Identify overly large components/files.
- Identify functions that are doing too many things.
- Identify unnecessary abstraction.
- Identify performance bottlenecks.

**Do not start deleting or rewriting files before understanding how they are connected.**

---

# 2. REMOVE DUPLICATE CODE

Find and consolidate duplicated code throughout the project.

Look for:

- Duplicate functions
- Duplicate API calls
- Duplicate validation
- Duplicate formatting logic
- Duplicate error handling
- Duplicate authentication checks
- Duplicate loading states
- Duplicate constants
- Duplicate utility functions
- Duplicate React components
- Duplicate CSS/Tailwind classes
- Duplicate database queries
- Duplicate controller logic
- Duplicate service logic
- Duplicate types/interfaces
- Duplicate configuration
- Duplicate business rules

If the same logic exists in multiple places, create a **single reusable function/module/component** where appropriate.

Example:

Instead of:

```js
function formatUserName(user) {
  return user.firstName + " " + user.lastName;
}
```

in multiple files, create one reusable utility:

```js
export const formatUserName = (user) => `${user.firstName} ${user.lastName}`;
```

Then use the reusable function everywhere.

---

# 3. REMOVE UNNECESSARY FILES

Identify files that are genuinely unused or obsolete.

Potential examples:

- Old components
- Old pages
- Old API files
- Duplicate components
- Test/demo files no longer required
- Unused hooks
- Unused utilities
- Old controllers
- Old models
- Temporary files
- Backup files
- Duplicate configuration
- Unused assets

### IMPORTANT

Do NOT delete a file simply because it appears unused.

Before deleting:

1. Search the entire codebase for references.
2. Check dynamic imports.
3. Check route configuration.
4. Check lazy loading.
5. Check configuration references.
6. Check build scripts.
7. Check environment configuration.
8. Check backend/frontend integration.
9. Confirm that deleting it cannot affect functionality.

Only delete files when you are confident they are unnecessary.

---

# 4. REMOVE UNUSED CODE

Clean:

- Unused imports
- Unused variables
- Unused functions
- Unused states
- Unused props
- Unused hooks
- Unused constants
- Unused dependencies
- Unreachable code
- Dead conditions
- Redundant calculations
- Commented-out obsolete code

Do not remove code that may be intentionally used through dynamic behavior unless you verify it is safe.

---

# 5. CREATE REUSABLE FUNCTIONS

Whenever the same operation appears multiple times, consider extracting it into a reusable function.

Create appropriate shared utilities for things such as:

- API requests
- Error handling
- Response formatting
- Date formatting
- Currency formatting
- Validation
- Authentication checks
- Permission checks
- File handling
- Image handling
- Pagination
- Search/filter logic
- Debouncing
- Data transformation
- Notifications
- Local storage
- Session handling

Do not create unnecessary abstractions.

### Rule:

> Extract repeated or complex logic only when doing so actually improves maintainability.

Avoid creating dozens of tiny utility files for trivial one-line operations.

---

# 6. COMPONENT REFACTORING

For React/frontend code:

Identify components that are:

- Too large
- Repeating UI
- Repeating business logic
- Doing API calls directly when a service layer would be better
- Managing too much state
- Containing complex calculations
- Containing duplicated event handlers

Break large components into logical reusable components when appropriate.

For example:

```text
LargeDashboard.jsx
        ↓
DashboardHeader.jsx
StatsCards.jsx
RevenueChart.jsx
RecentOrders.jsx
DashboardFilters.jsx
```

However, do NOT split components unnecessarily.

The goal is:

> **Logical separation, not fragmentation.**

---

# 7. PERFORMANCE OPTIMIZATION

Improve application performance without changing behavior.

Look for:

### Frontend

- Unnecessary React re-renders
- Unnecessary API calls
- Duplicate API requests
- Expensive calculations
- Missing memoization where genuinely useful
- Incorrect useEffect dependencies
- Unnecessary useEffect calls
- Large components rendering unnecessarily
- Unoptimized lists
- Repeated filtering/sorting
- Large unnecessary state objects
- Unnecessary state updates
- Unnecessary network requests
- Large assets
- Unnecessary JavaScript
- Poor lazy loading

Use techniques such as:

- `useMemo`
- `useCallback`
- `React.memo`
- Lazy loading
- Code splitting
- Debouncing
- Caching
- Request deduplication

**Only use optimization techniques when they provide an actual benefit.**

Do NOT blindly add `useMemo`, `useCallback`, or `React.memo` everywhere.

---

# 8. BACKEND PERFORMANCE

For Node.js/Express/backend code:

Look for:

- Duplicate database queries
- N+1 queries
- Unnecessary database calls
- Repeated calculations
- Inefficient loops
- Large unnecessary responses
- Missing pagination
- Repeated validation
- Duplicate controller logic
- Duplicate service logic
- Inefficient MongoDB/SQL queries
- Unnecessary middleware
- Repeated authentication checks
- Poor error handling

Improve database queries where possible.

Avoid fetching data that the frontend does not need.

Do not change API response structures unless absolutely necessary.

---

# 9. KEEP BUSINESS LOGIC INTACT

This is extremely important.

**DO NOT change:**

- Business rules
- Authentication behavior
- Authorization rules
- User permissions
- Database relationships
- API contracts
- Existing routes
- Existing endpoints
- Form behavior
- Validation requirements
- Payment logic
- Subscription logic
- Order logic
- User workflows
- Navigation behavior
- Existing UI functionality

Unless a change is explicitly required to fix a verified bug.

The refactoring should be **behavior-preserving**.

---

# 10. SHORTEN LONG CODE

When you find unnecessarily long code, simplify it.

Example:

Instead of:

```js
if (user) {
  if (user.isActive) {
    if (user.role === "admin") {
      return true;
    }
  }
}

return false;
```

Prefer:

```js
return user?.isActive && user.role === "admin";
```

But NEVER shorten code if doing so makes the logic harder to understand.

### Priority:

**Correctness > Readability > Maintainability > Performance > Code length**

Do not optimize for fewer lines at the expense of readability.

---

# 11. IMPROVE ARCHITECTURE

Where appropriate, establish clear separation between:

```text
Components
Pages
Hooks
Services
Utilities
Constants
API
Controllers
Models
Middleware
Configuration
```

Avoid mixing:

- UI logic
- API logic
- Database logic
- Business logic
- Validation

inside one huge file.

Use the existing architecture when it is already good.

Do not completely restructure the project just for the sake of restructuring.

---

# 12. COMMENTS AND CODE READABILITY

Add **useful comments**, not unnecessary comments.

Comments should explain:

- Why something complicated exists
- Important business rules
- Non-obvious decisions
- Complex algorithms
- Important performance optimizations
- External API limitations
- Security-related decisions

Do NOT add comments like:

```js
// Set loading to true
setLoading(true);
```

That adds no value.

Prefer:

```js
// Prevent duplicate submissions while the payment request is processing.
setLoading(true);
```

Use clear naming so simple code explains itself.

---

# 13. NAMING

Improve unclear names.

Bad:

```js
const d = getData();
const x = processData(d);
const a = true;
```

Better:

```js
const userData = getUserData();
const processedUsers = processUsers(userData);
const isAuthenticated = true;
```

Use consistent naming throughout the project.

---

# 14. DEPENDENCY CLEANUP

Check `package.json` and identify:

- Unused dependencies
- Duplicate libraries doing the same thing
- Unnecessary packages
- Packages that are no longer referenced

Before removing a dependency:

- Search the entire project.
- Check imports.
- Check configuration.
- Check build scripts.
- Check runtime usage.

Do not remove dependencies blindly.

---

# 15. PRESERVE UI/UX

The application's existing UI and UX should remain functionally identical unless an improvement is required for performance or usability.

Do NOT randomly:

- Redesign pages
- Change colors
- Change layouts
- Change spacing
- Change navigation
- Change button behavior
- Change form behavior
- Change animations

The goal is **code optimization**, not a redesign.

---

# 16. ERROR HANDLING

Improve error handling where necessary.

Avoid duplicated patterns such as:

```js
try {
   ...
} catch (error) {
   console.log(error);
}
```

throughout the application.

Use reusable error-handling patterns where appropriate.

Do not hide errors silently.

Do not expose sensitive information to users.

---

# 17. SECURITY

During refactoring, check for obvious issues such as:

- Exposed secrets
- Hardcoded API keys
- Unsafe environment handling
- Sensitive data in logs
- Missing input validation
- Unsafe database queries
- Improper authorization checks

Do not weaken existing security controls.

Never move secrets into frontend code.

---

# 18. BEFORE/AFTER VALIDATION

After refactoring:

1. Run the project.
2. Run the existing tests if available.
3. Run linting.
4. Run type checking if applicable.
5. Build the project.
6. Check for compilation errors.
7. Check for runtime errors.
8. Check API endpoints.
9. Check authentication.
10. Check important user flows.
11. Check database operations.
12. Check frontend navigation.
13. Check console errors.
14. Check network errors.

If your changes introduce an error, fix it before finishing.

---

# 19. DO NOT MAKE DANGEROUS CHANGES

Never:

- Delete files without verification.
- Rewrite the entire application unnecessarily.
- Change database schemas unnecessarily.
- Change API contracts unnecessarily.
- Change environment variable names.
- Remove functionality.
- Remove features.
- Replace working libraries without a strong reason.
- Introduce unnecessary dependencies.
- Over-engineer simple code.
- Optimize prematurely.
- Change behavior just to reduce line count.

---

# 20. REFACTORING PRINCIPLE

Follow this priority:

```text
1. Preserve functionality
2. Preserve business logic
3. Preserve API/database behavior
4. Improve correctness
5. Remove duplication
6. Remove dead code
7. Improve reusability
8. Improve performance
9. Improve readability
10. Reduce unnecessary code
```

The final code should feel like:

> **The same application, but written by a much more experienced engineering team.**

---

# 21. FINAL PROJECT QUALITY TARGET

After completing the refactoring, the project should have:

- Less duplicate code
- Fewer unnecessary files
- Fewer unnecessary dependencies
- Smaller components
- Smaller functions
- Reusable utilities
- Reusable components
- Cleaner architecture
- Better naming
- Better comments
- Better error handling
- Fewer unnecessary API requests
- Better rendering performance
- Better database efficiency
- Better maintainability
- Better readability
- No broken functionality

---

# 22. FINAL REPORT

After completing the work, provide a concise report containing:

### Files Removed

List deleted files and why they were safe to remove.

### Files Modified

List important files that were refactored.

### Reusable Functions Created

List newly extracted utilities/hooks/services/components.

### Duplicate Code Removed

Explain the major duplication that was consolidated.

### Performance Improvements

Explain measurable or meaningful performance improvements.

### Dependencies Removed

List removed packages and why.

### Potential Future Improvements

Mention improvements that were intentionally NOT implemented because they could introduce risk.

### Validation

Report:

```text
Build: PASS/FAIL
Lint: PASS/FAIL
Tests: PASS/FAIL/NOT AVAILABLE
Runtime: PASS/FAIL
```

---

## MOST IMPORTANT RULE

**Do not blindly rewrite code just to make it shorter.**

A 50-line function that is clear and maintainable is better than a 15-line function that is difficult to understand.

Your objective is:

> **Remove unnecessary complexity, not necessary functionality.**

Make the codebase **smaller where possible, reusable where appropriate, faster where it matters, and readable everywhere.**

Before making major structural changes, verify dependencies and usage across the entire codebase.

**Do not stop after finding the first few issues. Perform a complete codebase audit and optimize systematically.**
