# AAA Home Rides MVP — outcomes

## Public entry and brand foundation

- [x] `/` is a responsive public landing page for AAA Home Rides Corporation with a clear non-emergency transportation message, Alexandria, Virginia context, rider support call-to-action, accessible navigation, and the persistent notice: “AAA Home Rides is a non-emergency transportation service. For medical emergencies, call 911 in the United States.”

## Demonstration access

- [x] `/sign-in` prominently displays “Demonstration Accounts” and all six fictional users: Maria Lopez (Rider), James Lopez (Caregiver), Andre Washington (Driver), Priya Raman (Driver), Denise Carter (Dispatcher), and Alina Petrova (Caregiver / Clinic Intake), with name, role, email and a selection button.
- [x] Selecting an account populates the email and shared password fields; the backend verifies `HomeRide2026!`, creates a persistent `aaa_app_session`, and routes to the role destination: rider/caregiver `/rider`, driver `/driver`, dispatcher `/dispatch`, and admin `/dashboard`.
- [ ] The current project resource is MySQL-compatible and does not have external Better Auth/Neon credentials; those specific providers remain unconfigured and are not claimed as active.

## Rider and caregiver operations

- [x] Rider and caregiver consoles show the next ride, pickup and destination, status progression, upcoming/history context, assigned driver information, and location availability/stale indicators.
- [x] The rider trip view includes a prominent Call Driver action using the assigned driver’s authorized `tel:` contact and a fallback when a number is not available.
- [x] A rider/caregiver can open a booking form, enter passenger, pickup, destination, date, time and ride type, and persist the new booking through the authenticated backend in Requested state.
- [x] Authenticated `/overview`, `/bookings`, `/drivers`, `/operations`, and `/account` pages now render through real role-aware navigation; booking management includes filters and authorized cancellation that releases assignments.
- [x] Caregiver and clinic-intake access uses explicit caregiver-to-passenger authorization records rather than a passenger-name shortcut; the verified smoke test showed James Lopez sees only authorized Maria Lopez bookings.

## Driver operations

- [x] Driver console shows onboarding status, vehicle and license plate details, assigned trips, trip acknowledgment/status actions, document readiness, and a clearly labeled simulated GPS fallback.
- [x] The driver can explicitly start GPS sharing; the browser Geolocation API is requested when available and the UI identifies whether the location is live or demo-simulated.
- [ ] Private R2 presigned upload/download endpoints and document metadata persistence are implemented, but the deployed environment still needs `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME` before uploads can succeed.
- [x] Driver verification submission reads and persists a non-verified provider state, and administrator review routes enforce the provider-credential boundary; no unverified driver is labeled verified.
- [x] Driver-owned vehicle records are persistent and visible only to the driver or authorized operations roles; assignment responses include the selected vehicle.

## Dispatcher and administrator operations

- [x] Dispatcher console shows authorized bookings, status filters, passenger/pickup/destination details, approved driver availability, assignment/reassignment controls, active-trip monitoring, exceptions and booking event history.
- [x] Dispatcher assignment controls enforce approved-driver and time-conflict checks server-side, persist assignment changes, and append booking events; the smoke test assigned AR-1056 to Priya Raman and the driver then advanced it to Driver en route.
- [x] Administrator console shows user/role counts, driver review queue, document/vehicle review context, booking/trip oversight, demo-account readiness and audit-log context.
- [x] Dispatcher event history reads are persisted and interactive; alert review filters exception records, and administrator controls surface their protected-API/provider prerequisites rather than silently doing nothing.
- [x] Dispatcher assignment selects an approved driver and active associated vehicle; server-side driver and vehicle overlap checks reject a simultaneous same-slot assignment with HTTP 409.
- [x] Cancellation is persisted as an auditable event, notifies participants, clears driver/vehicle assignment, and is permitted only to the booking owner or authorized operations roles.

## Platform and quality

- [x] `client/public/manus-routes.json` declares `/`, `/sign-in`, `/sign-up`, `/forgot-password`, `/rider`, `/driver`, `/dispatch`, `/dashboard`, and `/404`.
- [x] The project retains the managed Express health endpoint, Manus OAuth entry point and server runtime.
- [x] Persistent application tables, idempotent six-account seeding, password hashing, session lookup, server-side role checks, booking persistence, explicit status transitions and append-only booking event writes are implemented and exercised against the configured database.
- [ ] Add production rate limiting and migrate to Better Auth/Neon only if those external services are provisioned and required.
- [ ] Configure private Cloudflare R2 bucket `aaa-mvp`, notification providers, map provider and any external identity-verification service before activating those integrations.
- [x] Persisted in-app notifications are created for booking creation, assignment and trip-status changes, can be listed per recipient, and can be marked read; external email/SMS/WhatsApp delivery remains unconfigured.
- [x] Driver location writes are limited to assigned non-terminal trips; riders, caregivers and dispatchers can read authorized latest locations with stale flags, and terminal status blocks further tracking writes.
