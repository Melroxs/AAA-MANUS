# AAA Home Rides MVP — outcomes

## Public entry and brand foundation

- [x] `/` is a responsive public landing page for AAA Home Rides Corporation with a clear non-emergency transportation message, Alexandria, Virginia context, rider support call-to-action, accessible navigation, and the persistent notice: “AAA Home Rides is a non-emergency transportation service. For medical emergencies, call 911 in the United States.”

## Demonstration access

- [x] `/sign-in` prominently displays “Demonstration Accounts” and all six fictional users: Maria Lopez (Rider), James Lopez (Caregiver), Andre Washington (Driver), Priya Raman (Driver), Denise Carter (Dispatcher), and Alina Petrova (Caregiver / Clinic Intake), with name, role, email and a selection button.
- [x] Selecting an account populates the email and shared password fields; the demo session is explicitly labeled as fictional demonstration mode and routes to the role destination: rider/caregiver `/rider`, driver `/driver`, dispatcher `/dispatch`, and admin `/dashboard`.
- [ ] Production database seeding through Better Auth/Neon must still be completed before the six accounts can be claimed as normal email/password accounts; the UI does not claim that this has happened.

## Rider and caregiver operations

- [x] Rider and caregiver consoles show the next ride, pickup and destination, status progression, upcoming/history context, assigned driver information, and location availability/stale indicators.
- [x] The rider trip view includes a prominent Call Driver action using the assigned driver’s authorized `tel:` contact and a fallback when a number is not available.
- [x] A rider/caregiver can open a booking form, enter passenger, pickup, destination, date, time and ride type, and see the new booking added in Requested state.

## Driver operations

- [x] Driver console shows onboarding status, vehicle and license plate details, assigned trips, trip acknowledgment/status actions, document readiness, and a clearly labeled simulated GPS fallback.
- [x] The driver can explicitly start GPS sharing; the browser Geolocation API is requested when available and the UI identifies whether the location is live or demo-simulated.
- [ ] Private R2 presigned upload/download and Neon document metadata persistence remain integration work requiring configured credentials and server routes.

## Dispatcher and administrator operations

- [x] Dispatcher console shows authorized bookings, status filters, passenger/pickup/destination details, approved driver availability, assignment/reassignment controls, active-trip monitoring, exceptions and booking event history.
- [x] Dispatcher assignment controls surface approval/conflict restrictions in the UI and update the demo booking state without presenting the action as a production database write.
- [x] Administrator console shows user/role counts, driver review queue, document/vehicle review context, booking/trip oversight, demo-account readiness and audit-log context.

## Platform and quality

- [x] `client/public/manus-routes.json` declares `/`, `/sign-in`, `/sign-up`, `/forgot-password`, `/rider`, `/driver`, `/dispatch`, `/dashboard`, and `/404`.
- [x] The project retains the managed Express health endpoint, Manus OAuth entry point and server runtime.
- [ ] Add persistent application tables, Better Auth-compatible account seeding, server-side role checks, rate limiting and append-only booking event writes before production use.
- [ ] Configure private Cloudflare R2 bucket `aaa-mvp`, notification providers, map provider and any external identity-verification service before activating those integrations.
