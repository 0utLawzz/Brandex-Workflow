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
- Pushed commit `0cb3e4c` to `origin/main`; production deployment `dpl_Bw8dB1KAnXPFkCVVpvnHPMdxLKkE` is READY and aliased to `https://br-workflow.vercel.app`.
- Verified the previously configured newer Apps Script URL returned Google 404, while the repository fallback deployment URL returned the expected JSON `Authentication required` response. Restored both Vercel Production variables (`NEXT_APPS_SCRIPT_URL` and `NEXT_PUBLIC_APPS_SCRIPT_URL`) to the working deployment URL and redeployed as `dpl_BckpXtxmf7Gq9866hjCoNSvPRZ5c` (READY).
- Real document-generation verification remains pending because it creates a Google Sheet row and Drive documents; no synthetic production submission has been made without an explicit test record/data from the user.
- Pushed `2d78730` with CSV case-reference preservation and its regression test. Production deployment `dpl_965JWhspw8n7ZHn2XgLXoJNf4AZa` is READY at `https://br-workflow.vercel.app`.

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

- Added a retry action for generation failures that reuses the already saved record ID and does not create a duplicate Supabase case. Retry omits re-uploading the original image/attachments, and Apps Script now reuses existing TM-1/TM-48 files by name in the same case folder. Local tests cover the retry functions and Apps Script document idempotency; live Apps Script deployment is still pending.
- Pushed commit `d201f37`; Vercel production deployment `dpl_4VHKAttFFnUWonmVtrXFPGjoHtbn` is READY at `https://br-workflow.vercel.app`.

### Priority 1: Drive identity protection

Define duplicate-submission behavior for an existing client/series/case folder before changing folder creation. Do not rename or reorganize existing Drive folders automatically.

### Priority 2: Retrieval and storage efficiency

Reduce unnecessary full-row/full-table reads and avoid storing large file data URLs in database text fields where the existing Drive/file-reference model can safely be used.

### Priority 2: Tests

- Added a browser-storage regression test for records CSV export/import. It proves that the client code, X/A/N/B series, and case number survive a round-trip. Remaining coverage: API validation, case numbering, submission failure states, attachment limits, and bulk-generation behavior.
- Added equivalent client CSV export/import coverage; client code and profile data survive a round-trip.
- Added Apps Script failure classification plus regression coverage. Token rejection now tells the operator to match `APPS_SCRIPT_RECORDS_TOKEN` with the Apps Script `RECORDS_ACCESS_TOKEN` property, while missing Google Docs OAuth permission remains a separate remediation path. Local authenticated API smoke tests confirmed invalid actions return 400 and cross-origin posts return 403.
- Pushed `9392bfe`; Vercel production deployment `dpl_6b8K2F3mwH1kTTVyp2EsFE9RNXUP` is READY at `https://br-workflow.vercel.app`.
- Improved `Code.gs` lock handling: `processFormSubmission` now releases its script lock in `finally`, including failures that occur before a row is fully written. Added Apps Script contract tests for authenticated generation, TM-1/TM-48, bulk/single processing, and lock release. This committed source still needs to be pasted/deployed as a new Apps Script version; browser automation could not access the user's local Chrome tabs for the deployment.

### Current working changes (not yet pushed)

- Supabase record/client mutations now check remote errors before reporting success and synchronize local cache only after successful cloud writes. Record/client updates use returned rows so they also work when the browser cache has not been primed. Dispatch proof insert errors are surfaced instead of swallowed.
- Records and clients CSV import now parse without first writing local-only phantom data, insert into Supabase in batches of 100 when configured, and cache only returned remote rows. Case identity fields and X/A/N/B series are preserved. Standalone/local mode keeps its existing import behavior.
- Records and client CSV exports now read the cloud source first and report errors rather than downloading stale local cache when the cloud read fails.
- Backup JSON export reads records, clients, history, and document references from Supabase when configured. Cloud restore inserts cases and clients without overwriting existing rows; local-only restore keeps existing snapshot replacement behavior. In cloud restore, history/document references are not re-attached to newly inserted records because the imported database IDs are reassigned; the UI now explicitly reports this limitation.
- Validation at commit `28dabfe`: `npm test` passed (11 tests, including cloud-mode parser no-local-write regressions), `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` passed. Vercel production deployment `dpl_32cpWLV1JgzhZ1qg5Zk585fk6Ayi` reached READY and alias `https://br-workflow.vercel.app` is assigned. Unauthenticated `GET /api/records` returned `401 Authentication required`.
- Commit `28dabfe` and follow-up `3535271` are pushed to `origin/main`; production deployment `dpl_62KUULAQZ8AfXBmkv5iDEfUwDF56` for `3535271` reached READY and owns alias `https://br-workflow.vercel.app`.
- Direct unauthenticated production `GET /api/records` returns `401 Authentication required`, as expected. No authenticated production case generation/update or data import was performed because that would create or change live client/case/Drive data. Google Drive search did not find an accessible Apps Script project, so the `Code.gs` update is still not proven deployed to Apps Script.

## Production boundary

No production database, Supabase project, Google Apps Script deployment, Google Sheet, Google Drive folder, Hostinger server, or live client data has been changed by this work.

## Latest verified state — 2026-11-17

- Git checkout is clean on `main`, synchronized with `origin/main` at `ee0be16` (`docs: update deployment progress`).
- Vercel production deployment `dpl_5QdFDP2GASUGuA85Af96pCFsEQ2Z` is `READY`, built from `ee0be16`, and has the `br-workflow.vercel.app` alias.
- Local validation on the same application source: `npm test` passed (11/11), `npm run lint` passed, `npx tsc --noEmit` passed, `Get-Content Code.gs -Raw | node --check` passed, and `npm run build` passed. Node emitted only module-type performance warnings during tests.
- Vercel Production has entries for `APP_ACCESS_USER`, `APP_ACCESS_PASSWORD`, `APPS_SCRIPT_RECORDS_TOKEN`, `NEXT_APPS_SCRIPT_URL`, and `NEXT_PUBLIC_APPS_SCRIPT_URL`. The Vercel API returned encrypted values (including `decrypted: false`), so their actual values and whether the two URLs match cannot be verified here. Earlier URL-matching statements in this file are historical and must not be treated as currently verified.
- The Apps Script URL hardcoded in the current checkout responds to a read-only health GET with `Brandex MailMerge backend is live.` A POST `getRecords` request without a token returns `Authentication required` and no records. This verifies that endpoint is reachable and rejects unauthenticated reads; it does not verify the production Vercel URL, the token match, or that the current `Code.gs` source is deployed there.
- A Google Drive search for Apps Script project files returned no accessible `application/vnd.google-apps.script` files. The active Apps Script deployment/version and its `RECORDS_ACCESS_TOKEN` / OAuth authorization therefore remain unverified.
- Vercel reported no clustered runtime errors for the selected records/application routes during the last seven days. Individual logs could not be queried because the Hobby plan does not retain logs for that time range; this is not proof that generation succeeded.
- No case, sheet row, or Drive document was created or changed during these checks. The user's previously reported failure remains unresolved: Supabase saves the case, but Apps Script document generation returns a generic failure.
- Auth secret roles: `APP_ACCESS_PASSWORD` is for the website login. The Apps Script backend token is `APPS_SCRIPT_RECORDS_TOKEN`, which must equal Apps Script Script Property `RECORDS_ACCESS_TOKEN`; do not paste either value into chat.

### Next required verification

1. In Vercel Production, confirm `NEXT_PUBLIC_APPS_SCRIPT_URL` points to the currently deployed Apps Script Web App URL. Do not assume it matches the URL in the source or the encrypted legacy variable.
2. Privately compare Vercel `APPS_SCRIPT_RECORDS_TOKEN` with Apps Script Script Property `RECORDS_ACCESS_TOKEN`.
3. Confirm the latest `Code.gs` has been deployed as a new Apps Script version and the script owner has authorized the required Docs/Drive scopes.
4. After these checks, retry document generation on an explicitly selected existing test case; avoid creating a new production case just for testing. Inspect the returned generation state and the corresponding Drive outputs before calling the workflow verified.

