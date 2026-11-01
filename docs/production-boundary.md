# Production boundary

The Preview build includes a fully navigable product demonstration with six fictional personas, but demo persona mode is not a substitute for production authentication. The managed starter keeps Manus OAuth active. Before commercial use, provision the requested Better Auth/Neon-compatible application schema and seed accounts through a protected administrator workflow, then replace the local demo state with server-backed sessions and role checks.

Required external setup still includes a private Cloudflare R2 bucket named `aaa-mvp`, a Worker that signs short-lived authorized URLs, notification provider credentials, a map provider, rate limiting, append-only booking event persistence, and a review process for driver identity documents. Do not represent simulated GPS, development notifications, basic document review, or demo identities as verified operational facts.
