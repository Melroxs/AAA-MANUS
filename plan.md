# AAA Home Rides MVP — implementation plan

## Scope and implementation approach

AAA Home Rides is a role-aware non-emergency medical transportation MVP. The current managed starter is React + Vite + Express + tRPC + Drizzle; the implementation reuses that stack rather than introducing a second application runtime. The first delivered slice prioritizes an immediately demonstrable product surface: public landing, real Manus OAuth entry point, explicit fictional demo-persona mode, responsive role consoles, booking creation, driver assignment, trip progress, driver GPS permission flow, document status, and operational/audit context.

The interface uses local state and localStorage for the six fictional demo personas so the experience is fully navigable in the Preview without pretending that demo credentials are already provisioned in a Better Auth/Neon environment. The server starter’s real Manus OAuth routes remain intact. The database schema and migration surfaces are documented for the next persistence pass; no production medical, payment, notification, or identity-verification claim is made by the UI.

## Project structure

- `client/src/App.tsx` — route-aware public pages, demo sign-in, application shell, role dashboards, booking form, and workflow state.
- `client/src/index.css` — AAA brand tokens, responsive layout, accessible controls, dashboard cards, status and map treatments.
- `client/public/manus-routes.json` — page route manifest for public and app routes.
- `server/_core/` — retained managed authentication/OAuth, platform health and tRPC runtime.
- `drizzle/` — retained base users migration; future migrations should add application profiles, passengers, bookings, events, driver applications, vehicles, locations, documents, notifications, audit logs and reconciliation records.
- `docs/` — operational notes for the demo boundary and required production integrations.

## Design

### Distinct style options considered

- **Quiet clinical utility** (0.06): restrained blue-gray system with a calm, healthcare-first tone.
- **Civic routebook** (0.07): warm paper surface, ink/navy typography and teal operational accents inspired by a dispatch log.
- **Soft mobility tech** (0.05): pale mint surfaces, bright coral actions and rounded mobile-first cards.

### Chosen direction: Civic routebook

- **Design movement:** contemporary civic wayfinding mixed with a printed routebook; the app feels dependable, legible and human without becoming sterile.
- **Core principles:** every screen shows the next action; status is conveyed with words and color; operational details live in calm cards; large type and generous touch targets support older adults and caregivers.
- **Color philosophy:** warm paper (`#f7f4ee`) makes the product feel approachable, deep ink (`#14334a`) creates trustworthy contrast, teal (`#0b7d77`) signals motion and care, and coral (`#ee8a67`) draws attention only to primary actions.
- **Layout paradigm:** a fixed route rail on desktop paired with a staggered, editorial content column; mobile collapses into a top bar without losing context.
- **Signature elements:** route-line dividers, small indexed labels such as `01 / NEXT RIDE`, and map-like dotted surfaces that visually connect pickup, driver and destination.
- **Interaction philosophy:** controls are explicit and plain-language. Demo persona switching is obvious, booking creation is staged, and every simulated capability is labeled rather than presented as live.
- **Animation:** only short fades and route-line shimmer on loading; no distracting continuous motion. Status changes use a quick color/position transition.
- **Typography system:** system sans stack for legibility with high-contrast uppercase eyebrow labels; oversized display headlines use tight tracking and short line lengths.
- **Brand essence:** dependable local transportation for the journeys that matter — calm, practical, considerate. Personality: grounded, attentive, clear.
- **Brand voice:** headlines speak plainly (“A ride plan you can see.”); microcopy reassures without overpromising (“Location sharing is available during an active trip.”).
- **Wordmark & logo:** a circular route-marker monogram with three connected dots, paired with a compact two-line wordmark.
- **Signature brand color:** AAA teal `#0b7d77`.

## Delivery and constraints

Use the existing runtime port and Express health endpoint. Keep public pages usable without login. Keep role-specific views behind a clearly indicated demo session in this first slice and preserve the server-side OAuth starter for production authentication. Do not claim HIPAA compliance, live GPS, payment processing, successful delivery, identity verification or regulatory approval. Before checkpointing, validate TypeScript, build output, route manifest, health endpoint and the main mobile/desktop flows.
