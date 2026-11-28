# Brandex Workflow

Brandex Workflow is a staff-facing case management and trademark document-generation app. Supabase PostgreSQL stores operational client and case data. The Next.js server mediates authenticated reads and writes; Google Apps Script and Drive generate and store documents. Google Sheets is not the operational source of truth.

## Local development

Requirements: Node.js `>=22.13.0 <25` and npm `>=10 <12`.

```bash
git clone https://github.com/0utLawzz/Brandex-Workflow.git
cd Brandex-Workflow
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Configure only the integrations needed for the workflow being exercised. `.env.example` lists variable names without values. Keep service-role keys and Apps Script tokens server-only; never commit `.env.local`.

## Checks

```bash
npm test
npm run lint
npx tsc --noEmit
node scripts/sync-merge-contract.mjs --check
node --check < Code.gs
npm audit
npm run build
```

The PostgreSQL 17 migration and rollback-fixture check uses a disposable database. See the CI workflow and [ADR 0008](audit/0008-consolidated-2026-11-24-audit-and-fixes.md) for the current audit and acceptance evidence.

## Main areas

- `app/`: Next.js pages and authenticated API routes
- `lib/`: database, workflow, validation, recovery, and canonical mail-merge contracts
- `Code.gs`: Google Apps Script document-generation backend
- `supabase/migrations/`: ordered additive database migrations
- `tests/` and `scripts/`: unit/integration fixtures and PostgreSQL 17 verification
- `audit/`: durable decisions and the consolidated audit/task log

## Operational safeguards

Never test against production or apply a production migration, merge, or deploy without explicit confirmation. Preview must use its separately reviewed test database and Apps Script project. A green build or Ready deployment alone does not verify authentication, database behavior, Picker permissions, or Drive output. See [DEPLOY-GUIDE.md](DEPLOY-GUIDE.md), [SECURITY.md](SECURITY.md), and the single authoritative [AGENT.md](AGENT.md).
