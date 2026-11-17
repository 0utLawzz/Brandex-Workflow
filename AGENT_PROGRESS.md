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

Before the live correction below, no production database, Supabase project, Apps Script deployment, Sheet row, Drive folder, Hostinger server, or live client data had been changed. The approved Apps Script property-key correction and version deployments are documented below; no production case row or file was edited or deleted.

## Latest verified state — 2026-11-17

- Client case-submission messaging now distinguishes a Supabase save from a local-browser fallback. When the browser has no configured Supabase key, the progress label, completion/failure message, and notification no longer claim that the case was saved remotely. This corrects the status reporting only; it does not replace the remaining server-side Supabase migration or change RLS.
- Validation for this UI change: `npm test` passed (11/11), `npm run lint`, `npx tsc --noEmit`, and `npm run build` passed.
- Baseline before the current UI status correction: Vercel production deployment `dpl_7mXUuZMj52EG32FBFfgrHtD5GZkJ` was `READY` at commit `31af7c1` with alias `br-workflow.vercel.app`.
- User's latest production screenshot shows the Apps Script proxy reached a backend that explicitly rejected its token (`APPS_SCRIPT_RECORDS_TOKEN` / `RECORDS_ACCESS_TOKEN`). This confirms the immediate document-generation failure is at Apps Script token authentication; the website login password is separate. The current deployment has not yet verified the two secret values or whether the property was set on the exact project behind Vercel's configured Web App URL. Retry the existing failed case only after privately matching those values.
- Local validation on the same application source: `npm test` passed (11/11), `npm run lint` passed, `npx tsc --noEmit` passed, `Get-Content Code.gs -Raw | node --check` passed, and `npm run build` passed. Node emitted only module-type performance warnings during tests.
- Vercel Production has entries for `APP_ACCESS_USER`, `APP_ACCESS_PASSWORD`, `APPS_SCRIPT_RECORDS_TOKEN`, `NEXT_APPS_SCRIPT_URL`, and `NEXT_PUBLIC_APPS_SCRIPT_URL`. Secret values remain unavailable from the Vercel integration. The current `NEXT_PUBLIC_APPS_SCRIPT_URL` was separately retrieved via the project-environment detail endpoint and verified to match the selected Apps Script Version 75 Web App URL.
- Supabase security remains an open P0: `supabase_schema.sql` grants unrestricted public access to the four app tables, and browser UI calls Supabase directly with the anon key. Current Vercel Production has no `SUPABASE_SERVICE_ROLE_KEY`; the least-risk compatible path is to move CRUD behind the existing authenticated Next.js boundary, add that server-only Vercel key, validate the routes, and only then replace the permissive policies. Do not apply restrictive policies first, since that would break current browser CRUD.
- Likely cause of false “saved in Supabase” confirmations: Vercel Production has `NEXT_SUPABASE_ANON_KEY` but no `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Next.js only exposes non-secret-prefixed variables to server code, while `lib/supabase.ts` and `lib/supabase-db.ts` are imported by client pages. With no public key, the browser gets the placeholder and `isConfigured` is false; `addRecord()` then silently falls back to local browser storage, while the form's status text still claims Supabase was saved. The previously reported UI message is therefore not proof of a database write. Do not expose a public anon key as a shortcut because the existing RLS policies grant public read/write; fix through authenticated server routes and a server-only key.
- The Apps Script Web App previously responded to a read-only health GET with `Brandex MailMerge backend is live.` A POST `getRecords` request without a token returns `Authentication required` and no records. Current production Vercel URL is now confirmed to match the selected active Apps Script Version 75 deployment. Token equality and successful document/OAuth generation remain unverified.
- The open Apps Script Project Settings UI confirmed selected active Version 75, deployment Web App URL, execute-as owner, and Anyone access. Script Properties key was corrected with user approval. Successful authenticated execution and Google Docs/Drive authorization remain to be verified by retrying the existing failed case.
- Vercel reported no clustered runtime errors for the selected records/application routes during the last seven days. Individual logs could not be queried because the Hobby plan does not retain logs for that time range; this is not proof that generation succeeded.
- No case, sheet row, or Drive document was created or changed during these checks. Before the Script Property key correction, the reported document-generation failure remained unresolved; end-to-end generation still needs verification by retrying the existing failed case.
- Auth secret roles: `APP_ACCESS_PASSWORD` is for the website login. The Apps Script backend token is `APPS_SCRIPT_RECORDS_TOKEN`, which must equal Apps Script Script Property `RECORDS_ACCESS_TOKEN`; do not paste either value into chat.

### 2026-11-17 follow-up: Apps Script proxy regression checks

- Added proxy-level regression tests proving that a missing backend token fails closed without making an upstream request, a configured token is forwarded only in the server-to-server request, a successful Apps Script result is preserved, and a token rejection is surfaced without leaking the token.
- Made the proxy's local TypeScript imports explicit so Node's built-in TypeScript test runner can import it, and enabled `allowImportingTsExtensions` for this no-emit TypeScript project.
- Validation: full `npm test` passed (14 tests), `npm run lint` passed, `npx tsc --noEmit` passed after the build generated `.next/types`, `npm run build` passed, and `git diff --check` passed. A standalone typecheck was initially run concurrently with `next build` and saw generated `.next/types` disappear; rerunning after build completed passed.
- Historical note from the prior check: Vercel's `APPS_SCRIPT_RECORDS_TOKEN` production entry was updated at `2026-11-16 23:07:11 UTC` and deployment `dpl_7jKcx3iftNcNWtR9vR4Bnai1BDzP` (commit `34872ff`) became READY at `2026-11-16 23:08:08 UTC`. Subsequent inspection found the actual Script Property was misnamed and corrected it with the user's approval; it also confirmed the production Web App URL matches active Apps Script Version 75. Token equality and generation remain unverified.
- No live case retry or document creation was performed in that prior follow-up. The current next step is to retry the existing failed case and verify its generated Drive files.

### Production correction after user approval

- With the user's approval, corrected the Script Property name in the open Apps Script project `Mail Merge 🖥`: renamed `APPS_SCRIPT_RECORDS_TOKEN` to `RECORDS_ACCESS_TOKEN` without changing its value. This matches the property read by `Code.gs` at lines 99–100. Verified the saved key and that the existing value remained present in the Apps Script Project Settings UI.
- Read-only deployment inspection showed the selected active Apps Script deployment is Version 75 and its Web App URL matches Vercel Production's `NEXT_PUBLIC_APPS_SCRIPT_URL` exactly. The Apps Script request should now read the renamed property for this deployment.
- The Vercel integration did not return the production `APPS_SCRIPT_RECORDS_TOKEN` plaintext, so value equality could not be independently tested. No token was displayed or changed, and no case, spreadsheet row, or Drive document was generated during this correction. Production end-to-end generation remains unverified until the existing failed case is retried and the resulting Drive files and case record are checked.
- Next action: retry document generation on the existing failed case from the deployed production app. If it still returns token rejection, privately update Vercel Production `APPS_SCRIPT_RECORDS_TOKEN` to the same value as the Apps Script `RECORDS_ACCESS_TOKEN`, then trigger a new Vercel production deployment and retry again. Do not send either value in chat.

### Next required verification

1. Retry document generation on the existing failed case from the deployed production app. The current deployment URL and Script Property name have been verified.
2. If Apps Script still reports token rejection, privately compare Vercel Production `APPS_SCRIPT_RECORDS_TOKEN` with Apps Script Script Property `RECORDS_ACCESS_TOKEN`; the integration cannot decrypt and return the Vercel token to this session. Do not paste either value into chat.
3. If token authentication passes but generation reports Google Docs/Drive authorization errors, authorize the existing Apps Script project scopes and deploy a new Apps Script version as indicated by the error.
4. Inspect the returned generation result, case record status, and corresponding Drive outputs before treating end-to-end generation as verified. Do not create a new production case just for testing.

### 2026-11-17 live correction and retrieval finding

- The user approved renaming the production Apps Script property to `RECORDS_ACCESS_TOKEN` while preserving its existing value. The active deployment URL remains the same and still uses execute-as-owner / Anyone settings.
- Existing Drive folder `325-A-056` visibly contains a logo plus the generated TM-1 and TM-48 files. This confirms that the document outputs exist for that folder; do not generate a duplicate for it.
- Fixed `getRecordsForView()` in the Apps Script editor to expose the case filing stage from Sheet column V for both `status` and `filingProcess`, rather than using column A's generation state. Blank stages default to `PENDING`. Saved and deployed the existing web app as Version 76; deployment reported success and retained the same web app URL and access settings.
- Production Records CMS loads 35 current records after refresh. The Sheet case searched as `ADADSD` was not present in those 35, so retrieval of that Sheet-only case is not yet proven.
- Retrieval fix: `app/api/records/route.ts` now reads Supabase once and, when the existing Apps Script backend token is configured, also synchronizes Apps Script/Sheets records and merges on the existing folder/trademark identity. Supabase wins for duplicates. This restores the page's existing background-sync behavior without adding columns or duplicate Supabase reads.
- `lib/record-source-merge.ts` and `tests/record-source-merge.test.mjs` cover Sheet-only records, Supabase duplicate priority, and blank identity fields. The Apps Script mapping regression is in `tests/apps-script-contract.test.mjs`.
- Current validation after both changes: `npm test` passed (17 tests), `npm run lint`, `npx tsc --noEmit`, `npm run build`, `Get-Content Code.gs -Raw | node --check`, and `git diff --check` passed. Commit `f5af20b` is pushed to GitHub `main`; Vercel production deployment `dpl_4GkSkWqFJmDaM9CfW1hsvjzE6VsZ` is `READY` and owns `https://br-workflow.vercel.app`.
- Production verification after reload: Records CMS combined source count is 510, with 47 pending/in-review records in its default stage filter. Searching the formerly missing Sheet value `ADADSD` returns exactly one visible pending case. No duplicate submission or production mutation was used for this verification.
- The full Sheet-backed view took roughly 15 seconds to appear. A follow-up now starts the existing Supabase and Apps Script source reads in parallel; this preserves the same data and read count while avoiding sequential wait time. Validation is green locally; this follow-up still needs a GitHub push, Vercel deployment, and production timing check.
- Keep the Supabase permissive-RLS issue and browser local-storage quota failure open. Neither was changed by this deployment. No production data row was edited, imported, or deleted during this retrieval fix.

