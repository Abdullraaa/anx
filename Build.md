# Logistics App — Complete Build Plan

## Decisions Locked
- Riders get fixed pay from employer — app does not calculate rider earnings
- A single rider can have multiple active jobs simultaneously
- Only admin can cancel a job
- Admin dashboard must be fully mobile responsive
- Customer-facing app is v2 — not in this build
- Customer intake: phone call or WhatsApp → admin creates job manually
- Pricing: zone-based using Abuja districts
- Payments: cash collection by rider + bank transfer (manual admin confirmation)

## Stack
| Layer | Tech |
|---|---|
| Admin dashboard | React + Vite (mobile responsive) |
| Rider app | Expo React Native (Android) |
| Backend | Node.js + Express |
| Database + Auth | Supabase (Postgres + Realtime) |
| Maps | Google Maps API or Mapbox |
| Push notifications | Expo Push Notifications |
| Hosting | Railway (backend), Vercel (dashboard) |

## Project Structure
```
logistics-app/
├── admin-dashboard/
├── rider-app/
└── backend/
```

---

## PHASE 0 — Project Scaffolding
**Goal:** Empty but correctly structured projects. Nothing functional yet.

### Prompt for Claude Code:
```
Set up a monorepo with three sub-projects for a logistics management app.

1. admin-dashboard/ — React app using Vite
   - Install: react, react-router-dom, @supabase/supabase-js, axios
   - Install for styling: tailwindcss (configure it)
   - Create folder structure: src/pages, src/components, src/lib, src/hooks
   - Set up .env with: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
   - Important: all screens must be fully mobile responsive using Tailwind

2. rider-app/ — Expo React Native app
   - Use: npx create-expo-app rider-app
   - Install: @supabase/supabase-js, expo-location, axios, @react-native-async-storage/async-storage, @react-native-community/netinfo, expo-notifications, expo-image-picker
   - Create folder structure: app/screens, app/components, app/lib, app/hooks
   - Set up .env with: SUPABASE_URL, SUPABASE_ANON_KEY, API_URL

3. backend/ — Node.js + Express API
   - Install: express, @supabase/supabase-js, dotenv, cors, helmet, express-validator
   - Install dev: nodemon
   - Create folder structure: src/routes, src/controllers, src/middleware, src/lib
   - Set up .env with: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORT
   - Create a basic Express server in src/index.js with a GET /health endpoint returning { status: 'ok' }

Do not build any features. Scaffold only.
```

### Done when:
- All three projects start without errors
- Backend /health returns 200

---

## PHASE 1 — Database Schema + Seed Data
**Goal:** Full schema, RLS policies, and Abuja zone data in Supabase.

### Prompt for Claude Code:
```
Generate two Supabase SQL files for a logistics app.

Save as:
- backend/supabase/migrations/001_initial_schema.sql
- backend/supabase/migrations/002_seed_data.sql

--- FILE 1: 001_initial_schema.sql ---

Create these tables:

1. users
   - id: uuid, primary key, default gen_random_uuid()
   - name: text, not null
   - phone: text, unique, not null
   - role: text, check ('admin' or 'rider'), not null
   - expo_push_token: text, nullable (for push notifications)
   - created_at: timestamp, default now()

2. zones
   - id: uuid, primary key, default gen_random_uuid()
   - name: text, not null
   - description: text

3. zone_pricing
   - id: uuid, primary key, default gen_random_uuid()
   - from_zone_id: uuid, references zones(id)
   - to_zone_id: uuid, references zones(id)
   - base_price: numeric, not null
   - price_per_extra_kg: numeric, default 0

4. jobs
   - id: uuid, primary key, default gen_random_uuid()
   - created_by: uuid, references users(id)
   - assigned_rider_id: uuid, references users(id), nullable
   - pickup_address: text, not null
   - pickup_lat: numeric, nullable
   - pickup_lng: numeric, nullable
   - pickup_zone_id: uuid, references zones(id)
   - dropoff_address: text, not null
   - dropoff_lat: numeric, nullable
   - dropoff_lng: numeric, nullable
   - dropoff_zone_id: uuid, references zones(id)
   - customer_name: text, not null
   - customer_phone: text, not null
   - package_description: text, nullable
   - delivery_fee: numeric, nullable
   - payment_method: text, check ('cash' or 'transfer'), nullable
   - payment_status: text, default 'pending', check ('pending' or 'confirmed')
   - cash_remitted: boolean, default false
   - status: text, default 'pending', check in ('pending', 'assigned', 'picked_up', 'delivered', 'failed', 'cancelled')
   - failure_reason: text, nullable
   - cancellation_reason: text, nullable
   - delivery_photo_url: text, nullable
   - created_at: timestamp, default now()
   - updated_at: timestamp, default now()

5. rider_locations
   - id: uuid, primary key, default gen_random_uuid()
   - rider_id: uuid, references users(id), unique
   - lat: numeric
   - lng: numeric
   - updated_at: timestamp, default now()

6. payouts
   - id: uuid, primary key, default gen_random_uuid()
   - rider_id: uuid, references users(id)
   - amount: numeric, not null
   - period_start: date
   - period_end: date
   - notes: text, nullable
   - status: text, default 'pending', check ('pending' or 'paid')
   - created_at: timestamp, default now()

Add a trigger that automatically updates jobs.updated_at on every row update.

Enable Row Level Security on all tables.

Add these RLS policies:

users table:
  - Anyone authenticated can read their own row
  - Only service role can insert or update

zones table:
  - Anyone authenticated can read
  - Only service role can insert or update

zone_pricing table:
  - Anyone authenticated can read
  - Only service role can insert or update

jobs table:
  - Admins can read all jobs
  - Riders can read jobs where assigned_rider_id = auth.uid()
  - Admins can insert jobs
  - Riders can update status, payment_status, delivery_photo_url on their own assigned jobs
  - Only admins can update assigned_rider_id or cancel a job

rider_locations table:
  - Admins can read all rows
  - Riders can only read and update their own row

payouts table:
  - Admins can read, insert, update all rows
  - Riders can read their own payout rows

--- FILE 2: 002_seed_data.sql ---

Insert these zones (Abuja districts):
Maitama, Asokoro, Garki, Wuse, Wuse 2, Utako, Jabi, Gwarinpa,
Kubwa, Lugbe, Lokogoma, Apo, Nyanya, Central Area

Insert placeholder zone pricing for all zone combinations:
  - Same zone to same zone: 1000
  - All other combinations: 2000
(These will be updated later with real competitive pricing)
```

### Done when:
- Both SQL files run in Supabase without errors
- All 14 zones visible in zones table
- Zone pricing rows exist for all combinations
- RLS enabled on all tables

### First admin account setup:
After running migrations, manually create the first admin:
1. Go to Supabase → Authentication → Users → Add user
2. Use phone as email format: e.g. 08012345678@logistics.app, set password
3. Go to Table Editor → users → Insert row: same id as auth user, name, phone, role='admin'

---

## PHASE 2 — Authentication
**Goal:** Admin and rider can log in. Sessions persist correctly. Tokens refresh automatically.

### Prompt for Claude Code:
```
Build authentication for the backend, admin dashboard, and rider app.

Context:
- Backend: Node.js + Express
- Database/Auth: Supabase
- Admin dashboard: React + Vite + Tailwind (mobile responsive)
- Rider app: Expo React Native

Important: Use Supabase session management (not raw JWT storage).
Supabase handles token refresh automatically when you use the session object.
Never store just the access token — always store and restore the full session.

BACKEND:

Create backend/src/lib/supabase.js:
  - Admin Supabase client using SUPABASE_SERVICE_ROLE_KEY

Create backend/src/middleware/auth.js:
  - Extract Bearer token from Authorization header
  - Verify with supabase.auth.getUser(token)
  - Fetch user record from public.users table using the auth uid
  - Attach full user object to req.user (id, name, phone, role)
  - Return 401 if token missing, invalid, or user not found

Create backend/src/routes/auth.js with:

POST /api/auth/login
  - Accepts: { phone, password }
  - Phone is stored as email format in Supabase Auth: phone@logistics.app
  - Use supabase.auth.signInWithPassword
  - Fetch user profile from public.users table
  - Returns: { session, user: { id, name, phone, role } }
  - Returns 401 on failure

POST /api/auth/register
  - Accepts: { name, phone, password, role }
  - Creates Supabase Auth user with phone@logistics.app format
  - Inserts into public.users table
  - Returns: { user: { id, name, phone, role } }
  - This endpoint is for admin use only (no public access — protect with admin role check)

ADMIN DASHBOARD:

Create src/lib/supabase.js — Supabase client initialization

Create src/lib/api.js:
  - Axios instance with base URL from VITE_API_URL
  - Request interceptor: attach session access_token from supabase.auth.getSession()
  - Response interceptor: on 401, redirect to /login

Create src/hooks/useAuth.js:
  - Use supabase.auth.onAuthStateChange to track session
  - Expose: user, session, login(phone, password), logout()
  - On mount: call supabase.auth.getSession() to restore existing session

Create src/pages/LoginPage.jsx (mobile responsive):
  - Phone number input and password input
  - Submit calls login() from useAuth
  - On success redirect to /dashboard
  - Show error message on failure

Create src/components/ProtectedRoute.jsx:
  - Wraps routes that require auth
  - Redirects to /login if no session

RIDER APP:

Create app/lib/supabase.js:
  - Supabase client using AsyncStorage for session persistence:
    import AsyncStorage from '@react-native-async-storage/async-storage'
    const supabase = createClient(url, key, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true }
    })
  - This handles token refresh automatically

Create app/lib/api.js:
  - Axios instance
  - Request interceptor: get current session from supabase.auth.getSession() and attach access_token

Create app/hooks/useAuth.js:
  - Same onAuthStateChange pattern as admin dashboard
  - login(phone, password) and logout()

Create app/screens/LoginScreen.js:
  - Phone and password inputs
  - On success navigate to JobsScreen
  - Show error on failure
```

### Done when:
- Admin can log in on the web dashboard
- Rider can log in on the mobile app
- Refreshing the page does not log the user out
- Invalid credentials shows a clear error message
- Protected dashboard routes redirect to login if not authenticated

---

## PHASE 3 — Job Creation (Admin)
**Goal:** Admin can create delivery jobs. Delivery fee auto-calculates from zones.

### Prompt for Claude Code:
```
Build job creation and job listing on the admin dashboard.

Context:
- React + Vite + Tailwind admin dashboard — ALL screens must be mobile responsive
- Backend: Node.js + Express
- Auth middleware already exists
- Zones and zone_pricing tables already have seed data

BACKEND — create backend/src/routes/jobs.js:

GET /api/zones
  - Returns all zones ordered by name
  - Protected

GET /api/zones/pricing?from_zone_id=X&to_zone_id=Y
  - Returns base_price for the zone combination
  - Protected

POST /api/jobs
  - Accepts: { pickup_address, pickup_zone_id, dropoff_address, dropoff_zone_id, customer_name, customer_phone, package_description, payment_method }
  - Sets created_by from req.user.id
  - Looks up and sets delivery_fee from zone_pricing
  - Sets status to 'pending'
  - Returns created job
  - Protected

GET /api/jobs
  - Returns all jobs ordered by created_at descending
  - Join to include rider name and phone if assigned
  - Accept optional query params: status, date (YYYY-MM-DD)
  - Protected

ADMIN DASHBOARD:

Create src/components/Layout.jsx (mobile responsive):
  - Desktop: sidebar with navigation links
  - Mobile: bottom navigation bar or hamburger menu
  - Links: Jobs, Create Job, Riders, Map, Payouts, Reconciliation
  - Top bar: admin name + logout button

Create src/pages/CreateJobPage.jsx (mobile responsive):
  - Fields: pickup address (text), pickup zone (dropdown), dropoff address (text), dropoff zone (dropdown), customer name, customer phone, package description (optional), payment method (cash/transfer toggle)
  - When both zones selected: auto-fetch and display delivery fee
  - Disable submit button while submitting
  - On success: show success message, clear form or redirect to jobs list
  - Validation: all required fields must be filled

Create src/pages/JobsListPage.jsx (mobile responsive):
  - On desktop: table view with columns: customer, pickup zone, dropoff zone, status, fee, payment method, rider, time
  - On mobile: card view with the same information
  - Status badges color-coded: pending=yellow, assigned=blue, picked_up=orange, delivered=green, failed=red, cancelled=grey
  - Filter tabs: All | Pending | Active | Completed
  - Link to Create Job page
```

### Done when:
- Admin can create a job and see it in the list
- Delivery fee populates automatically when zones are selected
- Status badges show correct colors
- Layout works on both desktop and mobile screen sizes

---

## PHASE 4 — Rider Management + Job Assignment + Cancellation
**Goal:** Admin can manage riders, assign jobs, and cancel jobs.

### Prompt for Claude Code:
```
Build rider management, job assignment, and job cancellation.

Context:
- React + Vite + Tailwind admin dashboard (mobile responsive)
- Backend: Node.js + Express
- A rider can have multiple active jobs simultaneously — do not restrict this
- Only admin can cancel a job

BACKEND — add to backend/src/routes/jobs.js and create backend/src/routes/riders.js:

GET /api/riders
  - Returns all users where role = 'rider'
  - Include count of their currently active jobs (status in 'assigned', 'picked_up')
  - Protected (admin only)

PATCH /api/jobs/:id/assign
  - Accepts: { rider_id }
  - Updates: assigned_rider_id = rider_id, status = 'assigned'
  - Only works if current status is 'pending'
  - After updating: send push notification to the rider (see notification instructions below)
  - Returns updated job
  - Protected (admin only)

PATCH /api/jobs/:id/cancel
  - Accepts: { cancellation_reason }
  - Updates: status = 'cancelled', cancellation_reason
  - Only works if status is NOT 'delivered' or 'failed'
  - Protected (admin only)

Push notification on job assignment:
  - Fetch rider's expo_push_token from users table
  - If token exists, send a push notification:
    Title: "New Job Assigned"
    Body: "Pickup from [pickup_address] — deliver to [customer_name]"
  - Use Expo Push API: POST https://exp.host/--/api/v2/push/send
  - Do not block the response if notification fails — send it in the background

ADMIN DASHBOARD:

Update src/pages/JobsListPage.jsx:
  - On each 'pending' job: add "Assign Rider" button
  - Clicking opens a modal:
    - Dropdown of all riders showing name + active job count
    - Confirm button
    - PATCH /api/jobs/:id/assign on confirm
    - Update job row immediately without page reload
  - On each job that is not 'delivered' or 'failed': add "Cancel" button
    - Clicking opens a confirmation modal with a text input for cancellation reason
    - PATCH /api/jobs/:id/cancel on confirm

Create src/pages/RidersPage.jsx (mobile responsive):
  - List of riders: name, phone, active jobs count
  - Add Rider button — opens a form: name, phone, password
  - POST to /api/auth/register with role='rider'
  - Rider appears in list immediately after creation
```

### Done when:
- Admin can add a new rider
- Admin can assign a rider to a pending job
- Rider receives a push notification when assigned
- Admin can cancel any non-completed job with a reason
- Rider card shows active job count

---

## PHASE 5 — Rider App (Job View + Status Updates)
**Goal:** Rider sees assigned jobs and updates status through delivery lifecycle.

### Prompt for Claude Code:
```
Build the rider app core flow.

Context:
- Expo React Native (Android)
- Backend: Node.js + Express
- Auth and Supabase client already set up
- A rider can have multiple active jobs

BACKEND — add to backend/src/routes/jobs.js:

GET /api/rider/jobs
  - Returns all jobs for req.user.id where status IN ('assigned', 'picked_up')
  - Ordered by created_at ascending (oldest first)
  - Protected

PATCH /api/jobs/:id/status
  - Accepts: { status, failure_reason? }
  - Validates legal transitions only:
    assigned → picked_up
    picked_up → delivered (delivery_photo_url required)
    picked_up → failed (failure_reason required)
  - Returns updated job
  - Protected (rider must own this job)

PATCH /api/jobs/:id/payment
  - Accepts: { payment_status }
  - Only for cash jobs: rider confirms cash collected
  - Protected (rider must own this job)

RIDER APP:

Update app/screens/LoginScreen.js:
  After successful login:
  - Register for push notifications using expo-notifications
  - Get Expo push token
  - PATCH /api/rider/push-token with the token (create this endpoint in backend)
  - Then navigate to JobsScreen

Create backend route PATCH /api/rider/push-token:
  - Accepts: { expo_push_token }
  - Updates users table for req.user.id
  - Protected

Create app/screens/JobsScreen.js:
  - List of active jobs for the logged in rider
  - Each job card shows: customer name, pickup address, dropoff address, package description, delivery fee, payment method, current status
  - Pull to refresh
  - Empty state: "No active jobs" message
  - Tap a job to go to JobDetailScreen

Create app/screens/JobDetailScreen.js:
  - Full job information
  - "Open Pickup in Maps" button — opens Google Maps with pickup address
  - "Open Dropoff in Maps" button — opens Google Maps with dropoff address
  - Status action buttons:
    If status is 'assigned':
      - "Mark as Picked Up" button → PATCH status to picked_up
    If status is 'picked_up':
      - "Mark as Delivered" button → opens camera to take delivery photo first → upload photo to Supabase Storage bucket 'delivery-photos' → then PATCH status to delivered with photo URL
      - "Failed Delivery" button → opens modal asking for failure reason → PATCH status to failed
    If status is 'delivered' and payment_method is 'cash' and payment_status is 'pending':
      - Show "Confirm Cash Collected" button → PATCH /api/jobs/:id/payment
  - All buttons disabled while action is in progress
```

### Done when:
- Rider sees their active jobs on login
- Rider can progress a job through all status stages
- Delivery requires a photo
- Failed delivery requires a reason
- Rider can confirm cash collection

---

## PHASE 6 — Real-Time Location Tracking
**Goal:** Rider sends location while on a job. Admin sees live positions on map.

### Prompt for Claude Code:
```
Build real-time rider location tracking.

Context:
- Rider app: Expo React Native
- Admin dashboard: React + Vite + Tailwind (mobile responsive)
- Supabase Realtime must be enabled on rider_locations table (do this manually in Supabase dashboard before running)

BACKEND — add to backend/src/routes/riders.js:

POST /api/rider/location
  - Accepts: { lat, lng }
  - Upserts rider_locations for req.user.id using INSERT ... ON CONFLICT (rider_id) DO UPDATE
  - Sets updated_at to now()
  - Protected

GET /api/riders/locations
  - Returns all rider_locations joined with users (name, phone)
  - Only returns locations updated in the last 30 minutes
  - Protected (admin only)

RIDER APP — update app/screens/JobsScreen.js:

On mount:
  - Check if rider has any active jobs (status 'assigned' or 'picked_up')
  - If yes:
    - Request foreground location permission using expo-location
    - If permission denied: show banner "Location access needed for active deliveries"
    - If permission granted: start interval every 30 seconds
      - Get current position using Location.getCurrentPositionAsync
      - POST to /api/rider/location
      - If POST fails due to network: skip silently (stale location is not useful)
  - If no active jobs: do not start location tracking
On unmount: clear the interval

ADMIN DASHBOARD — create src/pages/MapPage.jsx (mobile responsive):

  - Display Google Maps (or Mapbox) centered on Abuja (lat: 9.0579, lng: 7.4951, zoom: 12)
  - On mount: fetch /api/riders/locations and place a marker for each rider
  - Subscribe to Supabase Realtime channel on rider_locations table
  - On INSERT or UPDATE event: update the corresponding marker position without page reload
  - Each marker popup shows: rider name, last updated time, active job count
  - Add MapPage to navigation
```

### Done when:
- Rider app sends location while active job exists
- Admin map shows all rider positions
- Positions update live without page refresh
- Markers show rider name and last update time

---

## PHASE 7 — Payment Confirmation + Reconciliation
**Goal:** Admin confirms transfers. Daily cash reconciliation view.

### Prompt for Claude Code:
```
Build payment confirmation and daily reconciliation for the admin dashboard.

Context:
- React + Vite + Tailwind (mobile responsive)
- Backend: Node.js + Express
- Supabase Storage bucket 'delivery-photos' must exist and be set to public before running

BACKEND — add to backend/src/routes/jobs.js:

PATCH /api/jobs/:id/confirm-payment
  - Admin confirms a transfer payment
  - Sets payment_status = 'confirmed'
  - Protected (admin only)

PATCH /api/jobs/:id/remit-cash
  - Marks cash as remitted by rider to admin
  - Sets cash_remitted = true
  - Protected (admin only)

GET /api/reconciliation?date=YYYY-MM-DD
  - Returns for the given date:
    - total_deliveries: count of delivered jobs
    - total_revenue: sum of delivery fees for delivered jobs
    - cash_jobs: count of cash delivered jobs
    - cash_collected: sum of delivery fees for cash delivered jobs
    - cash_remitted: sum of delivery fees for cash jobs where cash_remitted = true
    - cash_pending_remittance: cash_collected minus cash_remitted
    - transfer_jobs: count of transfer delivered jobs
    - transfers_confirmed: count where payment_status = 'confirmed'
    - transfers_pending: count where payment_status = 'pending'
  - Protected (admin only)

ADMIN DASHBOARD:

Update src/pages/JobsListPage.jsx:
  - For delivered jobs: if delivery_photo_url exists show a thumbnail (clicking opens full image)
  - For transfer jobs with payment_status 'pending': show "Confirm Transfer" button
    → PATCH /api/jobs/:id/confirm-payment
  - For cash jobs with cash_remitted = false and status 'delivered': show "Mark Cash Remitted" button
    → PATCH /api/jobs/:id/remit-cash

Create src/pages/ReconciliationPage.jsx (mobile responsive):
  - Date picker defaulting to today
  - Summary cards: Total Deliveries, Total Revenue, Cash Collected, Cash Remitted, Transfers Confirmed
  - Highlight cash_pending_remittance in red if greater than zero
  - Table of today's cash delivered jobs: customer name, zone, fee, cash remitted toggle
  - Add to navigation
```

### Done when:
- Admin can confirm transfer payments
- Admin can mark cash as remitted
- Reconciliation page shows accurate daily totals
- Delivery photos visible on job list

---

## PHASE 8 — Payout Tracker
**Goal:** Admin records fixed salary payments to riders.

### Prompt for Claude Code:
```
Build the rider payout tracker.

Context:
- React + Vite + Tailwind (mobile responsive)
- Backend: Node.js + Express
- Riders receive a fixed salary from the employer — the app does not calculate earnings
- The payout tracker records that a salary payment was made for a period

BACKEND — create backend/src/routes/payouts.js:

GET /api/payouts/rider-summary?rider_id=X&from=YYYY-MM-DD&to=YYYY-MM-DD
  - Returns for the rider in the date range:
    - rider: { name, phone }
    - jobs_completed: count of delivered jobs
    - jobs_failed: count of failed jobs
  - This is performance data only — not used to calculate pay
  - Protected (admin only)

POST /api/payouts
  - Accepts: { rider_id, amount, period_start, period_end, notes }
  - Creates payout record with status 'pending'
  - Protected (admin only)

PATCH /api/payouts/:id/mark-paid
  - Sets status to 'paid'
  - Protected (admin only)

GET /api/payouts?rider_id=X
  - Returns all payouts for the rider ordered by created_at desc
  - Protected (admin only)

ADMIN DASHBOARD — create src/pages/PayoutsPage.jsx (mobile responsive):

  - Rider selector dropdown
  - Date range picker (from / to)
  - "View Performance" button:
    → GET /api/payouts/rider-summary
    → Shows: jobs completed, jobs failed for the period
    → This is informational only — admin enters salary amount manually
  - Amount input field (admin enters the fixed salary amount)
  - Notes input (optional)
  - "Create Payout Record" button → POST /api/payouts
  - Payout history table: period, amount, notes, status, date created
  - "Mark as Paid" button on pending payouts
  - Add PayoutsPage to navigation
```

### Done when:
- Admin can view rider delivery performance for any date range
- Admin can create a payout record with a custom amount
- Admin can mark a payout as paid
- Payout history visible per rider

---

## PHASE 9 — Offline Handling + Polish
**Goal:** Rider app handles poor connectivity. UI is production-ready.

### Prompt for Claude Code:
```
Add offline resilience and UI polish to the rider app.

Context:
- Expo React Native (Android)
- NetInfo and AsyncStorage already installed

OFFLINE QUEUE — create app/lib/offlineQueue.js:
  - addToQueue({ endpoint, method, body }): saves pending API call to AsyncStorage
  - processQueue(): iterates queue, retries each call, removes successful ones
  - clearQueue(): empties the queue

Update app/screens/JobsScreen.js:
  - Subscribe to NetInfo on mount
  - Show a red banner at top when offline: "No internet — updates will sync when reconnected"
  - When offline and rider taps a status update button:
    - Update the UI immediately (optimistic update)
    - Add the API call to offlineQueue
    - Show a small indicator on the job card: "Pending sync"
  - When connection is restored: call processQueue() automatically
  - Location posting failures: skip silently, do not queue

POLISH — apply across all rider app screens:
  - Loading spinner on every async action
  - All action buttons disabled while in progress (prevent double taps)
  - Toast notifications for errors: "Failed to update — will retry when online"
  - Empty state on JobsScreen: icon + "No active jobs right now"
  - High contrast text — readable in direct sunlight
  - Minimum touch target size 48x48px on all interactive elements

POLISH — apply across all admin dashboard screens:
  - Loading skeletons on all list/table views while data is fetching
  - Error states: if API call fails show inline error with a retry button
  - Confirm modals on all destructive actions (cancel job, mark paid)
  - All forms validate on submit and show inline field errors
  - Consistent color scheme and spacing throughout
```

### Done when:
- Status updates work offline and sync on reconnect
- No UI element is left in a loading state after an action completes
- Empty states render correctly
- Admin dashboard looks consistent and polished on both desktop and mobile

---

## PHASE 10 — Deployment
**Goal:** Backend live, dashboard accessible, APK installable.

### Prompt for Claude Code:
```
Prepare all three components for deployment.

BACKEND — for Railway:
  - Ensure all config comes from process.env — no hardcoded values anywhere
  - Set CORS to accept requests from the Vercel dashboard domain
  - Add a Procfile: web: node src/index.js
  - Add a railway.json:
    { "build": { "builder": "NIXPACKS" }, "deploy": { "startCommand": "node src/index.js" } }
  - Verify /health endpoint exists and returns { status: 'ok' }

ADMIN DASHBOARD — for Vercel:
  - Ensure all env vars use VITE_ prefix
  - Create vercel.json for SPA routing:
    { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  - Run npm run build and verify no build errors

RIDER APP — APK build using EAS:
  - Update app.json:
    - name: set to the app name your friend wants
    - slug: lowercase-hyphenated version
    - version: "1.0.0"
    - android.package: com.[friendsname].logistics
    - android.permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "CAMERA", "READ_EXTERNAL_STORAGE", "RECEIVE_BOOT_COMPLETED", "VIBRATE"]
  - Create eas.json:
    {
      "build": {
        "preview": {
          "android": { "buildType": "apk" }
        }
      }
    }
  - Install EAS CLI: npm install -g eas-cli
  - Run: eas build --platform android --profile preview
  - This produces a downloadable APK — no Play Store needed for v1

Create README.md at project root documenting:
  - All environment variables for all three components
  - How to create the first admin account
  - How to run each component locally
  - How to install the APK on Android
```

### Done when:
- Backend deployed, /health returns 200
- Admin dashboard live and accessible via URL
- APK downloaded and installs cleanly on an Android device

---

## Complete Build Summary

| Phase | What Gets Built | Gate Before Moving On |
|---|---|---|
| 0 | Project scaffolding | All three projects start without errors |
| 1 | Schema + RLS + Abuja zones seed data | All tables visible, RLS active |
| 2 | Authentication | Login works, session persists across refresh |
| 3 | Job creation + job list | Admin creates job, fee auto-populates |
| 4 | Rider management + assignment + cancellation | Admin assigns rider, rider gets push notification |
| 5 | Rider app core | Rider sees jobs, updates status, photo on delivery |
| 6 | Live location tracking | Admin map shows live rider positions |
| 7 | Payment confirmation + reconciliation | Admin confirms transfers, daily totals accurate |
| 8 | Payout tracker | Admin records salary payments per rider |
| 9 | Offline handling + polish | App works offline, UI consistent and clean |
| 10 | Deployment | Live backend, live dashboard, installable APK |