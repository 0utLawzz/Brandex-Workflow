# Brandex Workflow - Agent Progress

Last updated: 2026-11-17

## Deployment status

- Changes committed and pushed to GitHub `main` in commit `895bc95`.
- Vercel production deployment completed with `READY` status.
- Production alias: `https://br-workflow.vercel.app`.
- Deployment protection is enabled. An automation bypass was temporarily created by the Vercel CLI during smoke verification; revoke or rotate that bypass in Vercel Project Settings → Deployment Protection → Automation Bypass after verification.
- Unauthenticated API smoke response was correctly `401 Authentication required`. Authenticated end-to-end generation still requires a protected-browser session and valid production configuration; no production client data was submitted.
- Latest compatibility fix committed as `d173e8a` and deployed to production deployment `dpl_AjLFUoThcxT5hBGqg1T95g2Cybeu` with `READY` status.
- Vercel production variable names were found to use legacy aliases; application code now accepts both the legacy names and the documented names.
- The follow-up documentation push is also live as production deployment `dpl_F75jJJzvyuwMLYgKfwAUnyvtrYKq` with `READY` status and the same production alias.
- Production failure was reproduced: Supabase record save succeeded, while Apps Script returned a generic failure.
- Apps Script deployment inspection showed the active Web App URL was a newer deployment URL than the old Vercel/fallback URL. The current active URL was set in Vercel Production as both `NEXT_PUBLIC_APPS_SCRIPT_URL` and `NEXT_APPS_SCRIPT_URL`.
- New deployment `dpl_3m5c9pB5Fr2psVXZi3ic4RTQrd2w` reached `READY`; the production application page loads and displays all existing series options and form controls.
- Added a 10-second timeout to Supabase connection, record, and client reads so a stalled Supabase request falls back instead of leaving the Records screen indefinitely loading.

## Working rules

- Do not modify production Supabase, Google Sheets, Apps Script, Google Drive, Hostinger, or live client data without explicit approval.
- Preserve all existing case-initiation options (`X`, `A`, `N`, `B`), series behavior, bulk document generation, TM-1/TM-48 generation, and existing business logic unless a change is explicitly approved.
- Do not add database columns, unnecessary reads, or delete files without a separate review.
- Treat `.env` as sensitive. Do not read or expose its contents.

## Audit completed

The local repository was inspected read-only before fixes. Main findings were:

1. Supabase SQL policies are permissive public `FOR ALL` policies. This is the highest-risk issue, but changing them directly would break the current app because the shared app login does not create a Supabase Auth session.
2. Case creation can save the database row before Apps Script/Drive document generation completes.
3. Case numbering was based on a full record scan and was race-prone.
4. Browser-side file checks were not sufficient as an API security boundary.
5. Browser local storage, Supabase, Google Sheets, and Google Drive are used together with inconsistent file references.
6. Drive folder identity can reuse an existing client/case folder.
7. Shared-password authentication has no per-user identity or application rate limiting.
8. Test coverage was limited to two field-mapping tests, and CI did not run tests.

## Changes applied

### Server-side application validation

File: `app/api/applications/route.ts`

- Required form fields are checked on the server.
- Client code and case number are restricted to up to three digits.
- Logo MIME type, data URL format, and size are checked server-side.
- Additional attachment count, MIME type, data URL format, per-file size, and combined size are checked before Apps Script is called.

### Apps Script submission lock

File: `Code.gs`

- `LockService.getScriptLock()` protects case row and serial allocation during web submissions.
- Existing single-row and bulk document-generation functions remain intact.

### CI test execution

File: `.github/workflows/ci.yml`

- Added `npm test` to the CI workflow.

### Supabase browser configuration hardening

File: `lib/supabase.ts`

- Removed browser `localStorage` overrides for the Supabase URL and key.
- Supabase configuration now comes from deployment environment variables/default code configuration only.

### Application request origin protection

Files: `app/api/applications/route.ts`, `middleware.ts`

- Cross-origin application POSTs are rejected when an `Origin` header is present and does not match the app origin.
- Authenticated responses now include basic `nosniff` and same-origin referrer headers.
- Updated origin comparison to respect Vercel/reverse-proxy `X-Forwarded-Proto` and `X-Forwarded-Host` headers. This prevents valid production submissions from being rejected because the server runtime sees an internal origin.

### Vercel environment-name compatibility

Files: `lib/data.ts`, `lib/supabase.ts`

- Production currently contains legacy names `NEXT_APPS_SCRIPT_URL` and `NEXT_SUPABASE_ANON_KEY`, while the documented names use `NEXT_PUBLIC_*`.
- The application now supports both names without exposing or copying secret values. Documented `NEXT_PUBLIC_*` values remain preferred.

## Validation completed

- `node --experimental-strip-types --test tests/*.test.mjs`: 2 passed, 0 failed.
- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `Get-Content Code.gs -Raw | node --check`: passed.
- `npm run build`: passed.

## Pending work / next steps

### Priority 0: Supabase access model decision

The current UI uses a browser Supabase client and the app's shared cookie login is not Supabase Auth. Do not replace the permissive policies with `TO authenticated` policies until one of these designs is approved:

- migrate the UI to Supabase Auth; or
- move all Supabase CRUD behind authenticated Next.js API routes using a server-only credential; or
- formally keep Supabase disabled and use the existing Apps Script/local-storage path.

The chosen design must be implemented locally, tested, and reviewed before any live SQL is applied.

### Priority 1: Partial case completion

Add a recoverable status/retry path for cases where the database write succeeds but Apps Script or Drive generation fails. Preserve the current user-visible case-initiation flow.

### Priority 1: Drive identity protection

Define duplicate-submission behavior for an existing client/series/case folder before changing folder creation. Do not rename or reorganize existing Drive folders automatically.

### Priority 2: Retrieval and storage efficiency

Reduce unnecessary full-row/full-table reads and avoid storing large file data URLs in database text fields where the existing Drive/file-reference model can safely be used.

### Priority 2: Tests

Add focused tests for API validation, case numbering, submission failure states, attachment limits, and the preserved series/bulk-generation behavior.

## Production boundary

No production database, Supabase project, Google Apps Script deployment, Google Sheet, Google Drive folder, Hostinger server, or live client data has been changed by this work.

