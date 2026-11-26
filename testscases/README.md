# Medicine Inventory Test Cases

All executable backend and frontend test cases for this repository live in `testscases/`.

## Structure

- `testscases/backend/` — Backend unit, API integration (Express + MongoDB), notification utility, and live `server.js` E2E tests (`node:test` + `supertest`).
- `testscases/frontend/` — Frontend component, routing, RBAC/API integration, and user-flow tests (`vitest` + `@testing-library/react` + `jsdom`).
- `testscases/run-all.mjs` — Cross-platform runner executing both suites sequentially.

## How to Execute

### Prerequisites
1. Install dependencies once in both packages:
   ```bash
   cd backend && npm ci
   cd ../frontend && npm ci
   ```
2. Ensure MongoDB is running locally on `127.0.0.1:27017` (or set `TEST_MONGO_URI` / `MONGO_URI`). Backend tests create isolated temporary `medicine_inventory_test_*` databases and drop them automatically.

### Run Commands
- **Run everything from repository root:**
  ```bash
  node testscases/run-all.mjs
  ```
- **Backend only:**
  ```bash
  cd backend && npm test
  # or directly from repo root:
  node --test testscases/backend/*.test.js
  ```
- **Frontend only:**
  ```bash
  cd frontend && npm test
  ```

## Test Case Coverage Summary

| Area | File | Covered Scenarios |
| --- | --- | --- |
| Auth Middleware | `testscases/backend/auth.middleware.test.js` | Missing/malformed Bearer token (`401`), invalid/expired/wrong-secret JWT (`403`), fallback & env `JWT_SECRET`, `authorizeRoles` (`owner`/`staff` RBAC) |
| DB Models | `testscases/backend/models.test.js` | Collection resolution for `users`, `medicines`, `sales` |
| Auth API & Health | `testscases/backend/auth.routes.test.js` | `GET /`, `POST /api/auth/register` (bcrypt hashing, `400` validation, `409` duplicate email), `POST /api/auth/login` (JWT payload, password stripped, `400`/`401` errors) |
| Medicines API | `testscases/backend/medicine.routes.test.js` | Auth enforcement, `GET`/`POST`/`PUT` for owner & staff (including zero price/qty & partial updates), `404`/`500` ObjectId handling, owner-only `DELETE` (`403` for staff) |
| Sales & Reports API | `testscases/backend/sales.routes.test.js` | Single sale & stock decrement, exact-stock boundary, bulk multi-item sales (`pricePerItem`, `totalPrice`, error paths), owner-only `403` RBAC, `/report/custom` inclusive UTC range, `daily`/`weekly`/`monthly` aggregations |
| Alerts & Email | `testscases/backend/notify.utils.test.js` | `EMAIL_USER`/`EMAIL_PASS` skip guard, mail delivery/error propagation, no-owner exit, healthy-stock skip, out-of-stock & 30-day near-expiry alerts |
| Live Server E2E | `testscases/backend/server.e2e.test.js` | Spawns `backend/server.js` on a free port against a temp DB and executes full register -> login -> inventory -> bulk sale -> report flow |
| Shared UI | `testscases/frontend/components.test.jsx` | `LoadingSpinner`, `Modal` close button toggle, `Navbar` active links, mobile menu toggle, logout callback & navigation |
| Home Page | `testscases/frontend/HomePage.test.jsx` | Marketing content, `/login` & `/register` links, `IntersectionObserver` animation trigger and unmount cleanup |
| Auth Pages | `testscases/frontend/AuthPages.test.jsx` | `LoginPage` & `RegisterPage` loading state, role selection (`staff`/`owner`), error/success alerts, dashboard redirect |
| App Routing | `testscases/frontend/App.test.jsx` | Unauthenticated `PrivateRoute` redirects, catch-all fallback, `localStorage` `authToken` restore, login/logout lifecycle |
| Dashboard Page | `testscases/frontend/DashboardPage.test.jsx` | Loading spinner, low-stock (`<= 10`) red styling, live search filtering, Add/Edit medicine forms, Delete confirmation modal, `403` error modal |
| Sell Medicine Page | `testscases/frontend/SellMedicinePage.test.jsx` | Dropdown search, out-of-stock disabled option, cart item merging, client-side stock limit validation, item removal, running total, `POST /sales/bulk` success & error states |
| Reports Page | `testscases/frontend/ReportsPage.test.jsx` | `Daily`/`Weekly`/`Monthly` reports, empty report message, `Custom` date-range validation & sales table, `403` error display |
