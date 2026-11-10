# Contributing to Brandex Workflow

Brandex Workflow is a Next.js application with a separate Google Apps Script backend. Keep the two deployment paths and their data boundaries clear when making changes.

## Data and deployment boundaries

- Client profiles and case edits use browser `localStorage`; they are not shared across browsers.
- Application submissions and Records sync go through authenticated Next.js API routes to Google Apps Script, Google Sheets, and Drive.
- `Code.gs` is deployed separately from the Next.js app. A Git push does not update the live Apps Script deployment.
- Supabase is not connected to app persistence. Do not apply `supabase_schema.sql` to production.

## Local setup

Use Node.js 20 or 22 and npm:

```bash
npm ci
npm run dev
```

Copy `.env.example` to `.env` only when local integration credentials are needed. Never commit `.env` or paste secrets into source files. A normal local UI run does not need production Apps Script credentials; the proxy will report that integration is not configured.

## Make changes

- Next.js pages and API routes live under `app/`; shared browser storage and server helpers live under `lib/`.
- Keep Apps Script access tokens server-only. Never use a `NEXT_PUBLIC_` prefix for `APPS_SCRIPT_RECORDS_TOKEN`.
- When changing `Code.gs`, update the Apps Script project, set Script Property `RECORDS_ACCESS_TOKEN`, authorize required Google scopes, and deploy a new web-app version. Verify the deployment URL remains the one configured for the app.
- When changing Sheet columns or dropdowns, update `STATUS_AND_COLUMNS.md` and keep `setupSpreadsheet()`, `setupDropdowns()`, and `getRecordsForView()` aligned.
- Avoid testing submissions against production Sheets or Drive. Use a staging Apps Script project and Sheet for integration checks.

## Checks

Run these before requesting review:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm audit
```

GitHub Actions runs lint and a production build on pushes and pull requests to `main`. There is no automated Apps Script runtime test suite; inspect backend changes carefully and verify them in staging before deploying.

## Security reports

Report suspected vulnerabilities privately to the repository owner. Do not include production credentials, client records, CNICs, or private documents in issues or pull requests.
