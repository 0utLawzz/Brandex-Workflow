# Contributing

Read [AGENT.md](AGENT.md) for the single authoritative engineering and security rules. Read [ADR 0008](audit/0008-consolidated-2026-11-24-audit-and-fixes.md) for current audit status, evidence, and open acceptance gates; earlier ADRs preserve historical decisions.

## Local workflow

Use Node.js `>=22.13.0 <25` and npm `>=10 <12`. Install with `npm ci`. Keep environment files local and use only disposable database, Apps Script, and Drive targets for integration work.

Before requesting review, run the checks relevant to the change. The full CI set is documented in the repository workflow and README. Database migrations must also pass the disposable PostgreSQL 17 migration and rollback-fixture check.

## Integration boundaries

`Code.gs` is deployed independently of Vercel. Keep it synchronized with `lib/merge-contract.ts` using `node scripts/sync-merge-contract.mjs --check`. Supabase stores operational cases and clients; do not introduce Google Sheets as a second source of truth.

Never include secrets or client data in commits, screenshots, logs, issues, or pull requests. Do not merge or deploy production or apply a production migration without separate explicit user approval.
