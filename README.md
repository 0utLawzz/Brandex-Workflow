# Brandex Workflow

Brandex Workflow is a Next.js app for preparing trademark applications, tracking cases, and maintaining client profiles.

## Current data flow

- Client profiles and case edits are stored in the browser's `localStorage`. They are separate per browser and device.
- New trademark applications are also sent to the Google Apps Script backend. That script writes application rows to Google Sheets and generates Google Drive documents.
- The Records page combines records returned by Apps Script with records in the current browser.
- Supabase is **not** used for application persistence. `supabase_schema.sql` is an incomplete schema draft; see the migration and security notes in [DEPLOY-GUIDE.md](./DEPLOY-GUIDE.md). Do not run it as a production migration.

This means browser-only changes are not shared with other users and are not written back to the Sheet. A successful application submission is written by Apps Script to the Sheet, while its local copy remains in that browser. New browser profiles start with empty records and clients; use **Import JSON Backup** to restore data.

## Pages

| Page | Route |
| --- | --- |
| CMS home | `/` |
| Trademark application generator | `/trademark-application` |
| Records and status dashboard | `/records` |
| Client directory | `/clients` |

## Run locally

Use Node.js 20 or 22 and npm. `package-lock.json` is the canonical dependency lockfile:

```text
npm ci
npm run dev
```

For a production build and local run:

```text
npm run build
npm start
```

The production start script uses the port supplied in `PORT`, which is needed by Node.js hosting platforms. The build does not require Supabase credentials. `NEXT_PUBLIC_APPS_SCRIPT_URL` can override the Apps Script endpoint at build time; otherwise the project uses its built-in endpoint.

## Deployment

See [DEPLOY-GUIDE.md](./DEPLOY-GUIDE.md) for Hostinger settings, environment-variable expectations, and the status of a possible Supabase migration.

## Security

This app handles client names, CNICs, addresses, and case details. In production, set `APP_ACCESS_USER` and `APP_ACCESS_PASSWORD` to enable the app's Basic Auth gate, and set `APPS_SCRIPT_RECORDS_TOKEN` as a server-only variable. Configure the matching Apps Script project property `RECORDS_ACCESS_TOKEN` and deploy the updated script. The app proxies record reads and form submissions server-side; direct Apps Script reads and writes are rejected without the token. Use HTTPS and do not expose the token through a `NEXT_PUBLIC_` variable.

The current browser-local store still has no per-user data isolation, and localStorage remains accessible to anyone using an authenticated browser session. Review Google Drive sharing settings for generated documents. Existing Apps Script deployments remain exposed until the updated `Code.gs` is deployed with the matching Script Property.

Never commit `.env` files, service-role keys, database passwords, or other secrets. The Supabase draft enables RLS without permissive policies in this branch; it does not implement application authentication or persistence.
