# Security notes

This application processes client names, CNICs, addresses, case records, and private document assets. Treat all application data and generated Drive files as confidential.

## Current controls in source

- `middleware.ts` protects application and API routes with configured shared access credentials and signed sessions. This is shared staff access, not per-user identity or a per-user audit trail.
- Supabase service-role operations are server-side. RLS remains enabled; migrations grant sensitive functions narrowly rather than adding public table policies.
- API write routes check request origin, bound and validate JSON input, and keep Apps Script credentials on the server. Preview writes require the configured isolated test project and Apps Script target.
- Dispatch proof and delivery receipts are optional/required according to their workflow policy: dispatch proof is optional; supplied dispatch proof is validated. Delivery requires a receipt. File and URL handlers apply bounded type/size and destination checks.
- Recovery and CSV import paths validate identities and relationships, preflight conflicts, and use transactional database functions. Never run them against production during development or review.
- Canonical mail-merge mappings and Apps Script access tokens are kept separate from browser payloads. Picker configuration values exposed to the browser must be restricted public identifiers only.

These are source-level controls; they do not prove the current hosted configuration or deployed Apps Script version. Check ADR 0008 for time-stamped evidence and open gates.

## Operational risks and required handling

- Shared access provides no individual attribution. On Vercel, every login POST and protected Basic Auth request requires the configured distributed Firewall rate-limit rule; a missing rule or failed check rejects the request. Configure and verify the rule in each deployment environment as described in [DEPLOY-GUIDE.md](DEPLOY-GUIDE.md). Keep credentials strong, rotate them when exposed, and use HTTPS.
- Vercel Preview, Production, Supabase projects, Apps Script deployments, and Drive destinations must be verified independently. A successful build or Ready deployment is not proof of safe isolation.
- Never paste credentials, private client data, CNICs, production row values, or private document URLs into issues, logs, pull requests, or screenshots.
- Never introduce permissive RLS policies, client-side service keys, unbounded uploads, arbitrary URL fetches, or cross-case document references.
- Production schema migrations, data writes, merges, and deployments require explicit user approval. Follow the preflight, backup, postflight, and rollback record in ADR 0008.

## Reporting

Report suspected vulnerabilities privately to the repository owner. Include the affected component, impact, and reproducible steps without sharing client data or secrets.
