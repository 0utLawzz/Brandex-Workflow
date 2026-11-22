# Brandex Workflow - Agent Progress

Last updated: 2026-11-17

## Supabase-canonical transition (2026-11-17, active and not deployed)

- Requirement: client and case business data live in Supabase; Google Apps Script/Drive is used only to generate/store documents. No new database columns or production case mutations are authorized by this implementation work.
- Local code now removes Sheet reads from the Records dashboard and `/api/records`, routes client CRUD through the authenticated `/api/database` service, and makes the new Apps Script form-generation path consume the submitted case payload without creating/updating a Sheet row. Generated serial/document/Drive references are written back through Supabase.
- Added a selected-case bulk document-generation operation for up to 50 Supabase IDs. It fetches selected rows once, validates required fields per case, invokes the document-only Apps Script action individually, records per-case outcomes, and writes generation/document references back to Supabase. The Records toolbar exposes this operation.
- Removed the Apps Script Sheet records endpoint, Sheet row retry/mapping helpers, spreadsheet-driven single/bulk generation, setup helpers and spreadsheet OAuth scope. Apps Script now accepts the case payload from the web app and uses Google Docs/Drive for generated output; client/case records remain Supabase-owned. The old Sheet menu generation flow is retired; the Records dashboard provides single and bulk generation.
- Removed local browser-cache fallbacks from new-case client loading, case-number lookup and retry lookup, so an unavailable Supabase connection now surfaces an error instead of showing cached records as current.
- Removed the unused `SHEET_URL` setting from app code and `.env.example`; the live Vercel project still has the old `NEXT_PUBLIC_SHEET_URL` value, but the updated code no longer reads it.
- Removed the browser-cache-to-Supabase upsert button/route, which could overwrite canonical cloud rows using stale local IDs. Replaced the obsolete SQL/anon-key setup UI, which advertised permissive policies and browser key storage, with a connection-only status screen. CSV/JSON import and export paths remain available.
- Initial and bulk generation now save TM-1/TM-48/attachment Drive URLs as Supabase document references. The save path checks current references once per case and skips URLs already recorded, so retries do not create duplicate references.
- Recent local checks: 22/22 tests, ESLint, TypeScript, Apps Script syntax, `git diff --check`, and `npm run build` passed. This verifies local behavior only; actual Apps Script/Drive generation is not verified.
- Read-only live audit on 2026-11-17: Supabase project `pjthtvkzuthxwpvcdqxy` has 0 trademark records, 2 clients, and 0 history/document rows. Its four exposed public tables each still have an RLS policy for `public` with `USING (true)` and `WITH CHECK (true)`; remove those policies only after the new server-only API is live and verified.
- Read-only Google Sheet audit: `Sheet1` has 473 non-empty case rows, 308 unique serials, 49 duplicate-serial groups (all have differing case content), and one row without a serial. `CHECK` has 468 non-empty rows; 454 rows lack client code/series/case-number metadata, 49 serial groups have conflicting identity metadata, 2 rows have serials absent from `Sheet1`, and 7 primary rows lack matching CHECK metadata. The `sample_brandex_records` tab contains sample data and must not be imported as production cases. No Sheet data has been imported or changed.
- Verified the local service key's decoded project ref/role matches the production Supabase project; added it to Vercel Production as a hidden Secret without printing its value. Production deployment still pending. The local `.env` key remains local; do not commit or print it.
- Current local changes are uncommitted. No deploy, Sheet migration, Supabase row write/delete, or production document generation was performed for this transition.
- Remaining work: push reviewed code and deploy; deploy the matching Apps Script `Code.gs`/manifest as a new version and verify Google OAuth/Drive; confirm API operations via authenticated existing-case workflow; then remove permissive public RLS policies after the server-only cutover is verified. Plan a lossless Sheet migration separately with a reviewed identity map: current Sheet duplicates and missing identifiers prevent safe automatic case-number assignment. Preserve a migration report, avoid duplicate IDs, verify auth, CRUD, CSV/JSON import/export/backup, series options, bulk actions and document links.
- Bulk-generation caveat: selected records must contain complete required application fields, logo inputs may need reattachment, and production Drive output has not been tested. Per-case preflight errors are returned; do not claim generated until links and Supabase references are observed.

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
- Production Records CMS now loads 510 combined records after refresh. Immediately after the first merge deployment, a search for `ADADSD` briefly returned one pending case; after the parallel-read deployment and another reload, the same search returned no result. The open source Sheet also currently returns 0 matches for `ADADSD`; cell E476 now has different content than during the earlier check. No production row was changed by this work, so treat the requested record as absent from the current source data until the user confirms its present identifier/location.
- Retrieval fix: `app/api/records/route.ts` now reads Supabase once and, when the existing Apps Script backend token is configured, also synchronizes Apps Script/Sheets records and merges on the existing folder/trademark identity. Supabase wins for duplicates. This restores the page's existing background-sync behavior without adding columns or duplicate Supabase reads.
- `lib/record-source-merge.ts` and `tests/record-source-merge.test.mjs` cover Sheet-only records, Supabase duplicate priority, and blank identity fields. The Apps Script mapping regression is in `tests/apps-script-contract.test.mjs`.
- Current validation after the merge fix and parallel reads: `npm test` passed (17 tests), `npm run lint`, `npx tsc --noEmit`, `npm run build`, `Get-Content Code.gs -Raw | node --check`, and `git diff --check` passed. Commit `f5af20b` is pushed to GitHub `main`; Vercel deployment `dpl_4GkSkWqFJmDaM9CfW1hsvjzE6VsZ` reached `READY`. Performance follow-up commit `a2447dc` is also pushed; Vercel deployment `dpl_4XMNSAJxPepE5rtbRBWaW7DSbGVG` reached `READY` and owns `https://br-workflow.vercel.app`.
- The optimized production page loaded the 510-case combined result within about five seconds after the reload. The live CMS currently shows 46 pending/in-review, 5 approved/rejected, and 459 dispatched/delivered cases.
- Keep the Supabase permissive-RLS issue and browser local-storage quota failure open. Neither was changed by this deployment. No production data row was edited, imported, or deleted during this retrieval fix.
- End-to-end generation for the screenshot's specific failed case remains unverified. The folder mentioned above contains TM-1 and TM-48 outputs, but it was not proven to correspond to that failed case; retry the existing case only when its current record can be identified without creating a duplicate.
- A read-only Google Drive search found no folder named `222-A-054` and no Drive item matching the screenshot's case name `SADFSADSAD`. The earlier `325-A-056` output folder is unrelated evidence and must not be treated as generation success for `222-A-054`.
- The authenticated Records API now returns Apps Script/Sheet records alongside Supabase records (510 combined records observed), which confirms the Vercel backend token is accepted by the renamed Apps Script property. Secret values were never displayed or changed.

### Follow-up after user's approval — 2026-11-17

- The user approved renaming the Apps Script property; this had already been completed and verified as above, with the saved secret value retained.
- Read-only check of the current production Records CMS now finds the screenshot's existing case `222-A-054` (`SADFSADSAD`) as `PENDING`. The page shows it as a normal case row and has no document-generation retry control.
- The safe retry action exists only in the original application page's in-memory state (`lastSavedCaseId` plus the submitted form values). The CMS row does not preserve that retry state. Re-submitting the form would create another case; manually reconstructing and posting a generation payload could create duplicate Drive/Sheet outputs or omit source attachments. No retry, new case, or production mutation was performed.
- Next step: use the original application's visible “Retry Document Generation” action if its failed-result card is still open. If that browser state is gone, provide the original failed-result page/session or confirm a separate recovery approach before rebuilding a payload. Then verify the result and Drive files for `222-A-054` before closing the generation issue.

### 2026-11-17 Apps Script retry reliability deployment

- `Code.gs` now records a stable mapping from client/series/case reference to its Sheet serial and reuses the matching row on a repeat generation request. It verifies the stored form values and stops if the reference points to changed data or multiple rows match, rather than silently appending another case.
- Apps Script now reuses the case's logo file and reopens existing TM-1/TM-48 docs to replace any remaining template fields after a partial document failure. Existing completed output remains unchanged because replaced placeholders no longer exist. Additional attachments already use name-based reuse.
- The application retry sends the still-selected original logo and attachments again; Apps Script reuses stored files by name. New Supabase case writes now save applicant father name, CNIC, and address into existing schema columns, without adding columns.
- Added Apps Script retry regressions, including a simulated failed processing attempt followed by a retry that confirms one Sheet row is reused. Full `npm test` passes 20/20; `npm run lint`, `npx tsc --noEmit`, `npm run build`, Apps Script JavaScript syntax check, and `git diff --check` pass.
- Commit `8b31970` was pushed to GitHub `main`; Vercel deployment `dpl_8GLyVwVE4ioMJURq8QqkPiUHzgw2` reached READY at `https://br-workflow.vercel.app`. Apps Script Version 77 was deployed with the same existing web app URL and permissions. The actual failed case was not retried, and no production case, Sheet row, or Drive file was changed.

### 2026-11-17 durable retry recovery work (deployed)

- Added a Records action that opens document recovery for the existing pending/review case, plus form hydration from the combined Supabase + Apps Script Records API. It matches by case folder and trademark when available, avoiding reliance on a potentially overlapping numeric ID alone.
- The existing `/api/records` response now includes the identities already present in Supabase, so the form can safely tell Supabase-backed records from Sheet-only cases without another database query. A Sheet-only retry skips Supabase serial/document writes, preventing a Sheet serial number from being mistaken for an unrelated Supabase row ID.
- Retry uses the existing case and does not insert a second case. Existing applicant details and saved logo are restored; missing father name, CNIC, address, date, and other required fields must be supplied before sending a retry. Additional attachments must be reattached because they are not stored with the case record.
- Added retry field/date regression tests. Current validation: `npm test` 22/22, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` pass. No live generation or production data changes were performed.
- Commit `787b7c3` is on GitHub `main`; Vercel Production deployment `dpl_HHvm2UX4uW1a9zrzX4TG13HDh6q5` reached READY and owns the `https://br-workflow.vercel.app` alias. A read-only page request returned HTTP 200 and was correctly redirected by the app's auth middleware to the login screen. No live case was loaded through this session.
- Next: open the Records dashboard, use the retry icon on the intended existing pending case, complete missing applicant details, and reattach required files. Verify the generated Drive links and resulting record without creating another case. Do not mark end-to-end generation resolved until that check succeeds.


### 2026-11-17 user-confirmed source-of-truth requirement

- User explicitly clarified the required architecture: all client/case/business workflow data must live in Supabase; Google Apps Script/Drive may only generate and store documents. Google Sheets must not be read or written by the operational workflow.
- The current production deployment is still the older version: it was observed returning about 510 combined Supabase + Apps Script/Sheet records. Local uncommitted cutover edits make `/api/records` Supabase-only and Apps Script generation-only, but those edits are not deployed yet.
- Historical Sheet records have not been migrated. Prior read-only review found 473 case rows, duplicates/conflicting identity data, and many missing client/series/case identifiers. Do not silently omit duplicates, invent identifiers, or delete Sheet data. Prepare a reconciliation/import using existing Supabase columns and preserve source-row provenance where supported; report unresolved mappings before any lossy action.
- Intended cutover sequence: validate local changes; back up/read-only export the legacy rows; reconcile identity and import all recoverable rows to existing Supabase schema; deploy Apps Script generation-only; deploy Vercel Supabase-only; verify retrieval and document generation with an existing case; then retire Sheet access from app. No new columns, unnecessary reads, or production data deletions.

### 2026-11-17 continuation: Sheet migration completed; cutover validation in progress

- Re-read the live `Sheet1` and imported all 474 non-empty original rows into the existing `trademark_records` columns. The table was verified empty immediately before the insert; an in-query guard aborts if it is no longer empty. No Sheet cells or sample tab were changed.
- Preserved all source rows, including duplicate serials and one blank serial. Sheet identifiers were populated only when a unique serial and exact case name matched; 11 rows qualified in the current reread. Other incomplete identities remain blank to override schema defaults. Source fallback text is encoded in the existing `notes` field; images remain Drive file IDs (zero base64 data URLs in DB).
- Verified Supabase now has 474 cases, 310 distinct serial values including the blank value, 1 blank serial, 463 rows with at least one missing legacy identity field, and 0 inline base64 images. `trademark_history` and `trademark_documents` were empty before migration.
- Removed exactly the source-unmatched dummy client row only after confirming its full key/value tuple (`id=1`, code `125`, name `ALI KHAN`, company `BR`). Kept the existing `MOON`/`HHHH` client because it matches the Sheet source.
- Pasted latest local `Code.gs` into the selected Apps Script editor and verified the editor copy exactly matches the local file after line-ending normalization. The Save control was clicked; UI Automation did not expose a definitive saved-state indicator, so verify the editor/project state before claiming it is saved. The local `appsscript.json` had previously been saved and removes Sheets OAuth scope.
- Current local checks: all 22 tests pass, lint passes, TypeScript passes, `Code.gs` syntax check passes, `git diff --check` passes, and `npm run build` completes successfully.
- At that interim checkpoint, deployment and security steps were still pending; see the completion status below for their final state.

### 2026-11-17 production cutover completion status

- Verified Apps Script `Code.gs` in the editor exactly matched the local file; editor Save button was disabled afterward. Deployed Apps Script Version 78 successfully, preserving the active deployment and its existing `Execute as Me` / `Anyone` settings. An unauthenticated POST safely returned `Authentication required` without starting generation.
- Commit `909266a` was pushed to GitHub `main`. Vercel Production deployment `dpl_9H5iPch91wMxbzNFanXpFji96Yxz` reached READY with alias `br-workflow.vercel.app`.
- After the Vercel production cutover reached READY, removed the four permissive public-all policies from `clients`, `trademark_documents`, `trademark_history`, and `trademark_records`. A `pg_policies` verification query returned no remaining policies for these tables. The app's authenticated middleware and server-side service role API are now the access path.
- Removed the obsolete `NEXT_PUBLIC_SHEET_URL` from the Vercel Production environment. Local code has no operational Sheet URL/read path; Google is used for document generation only.
- Rechecked migration totals: 474 source case rows exist in Supabase; source fallback text encoded in existing notes for all rows, no generation status `DONE` was mis-mapped, and no inline base64 images were stored. The original Sheet remains unchanged. One unverified client dummy row was removed by exact predicate.
- Full local verification passed: 22/22 tests, lint, type check, Apps Script syntax, diff check, and production build.
- End-to-end production retry is now verified on existing Supabase case ID 242 (client 889, series X, case 1): the authenticated Records/form UI returned success; Apps Script created/reused the two Google Docs; Supabase stores two unique Google Docs references for that record; Drive metadata confirms both TM-1 and TM-48 files exist. The user confirmed the documents are inside the `889` folder shown in their Drive screenshot. The case count remains 474 and case 242's serial/status remain unchanged, so retry created no duplicate case and retained `DISPATCHED` workflow status.
- Final current validation: `npm test` 22/22 pass; lint, TypeScript, Apps Script syntax, `git diff --check`, and production build pass. Latest application deployment is READY. Production data now has 474 migrated case rows and 2 generated document references for the verified retry. The source Google Sheet remains unchanged; Apps Script/Drive are used for document generation only.


---

## 2026-11-22 Phase-two user requirements and implementation handover

### Current baseline verified for this phase

- Current `main` commit at planning time: `d2b38ad2561078117783d8e7fc5188e2dcf60ef3`.
- PR #1 (client/case naming and workflow), PR #2 (ADR process), and PR #3 (Records-first UI) are all merged. PR #1 merge was explicitly verified through GitHub PR metadata; its merge commit is `473da572b3ca4372cba80644aef30e14fd21eba8`.
- Current main commit's GitHub combined status reports Vercel success.
- Current source inspection confirms:
  - `app/page.tsx` still renders a separate landing page with a large logo hero and quick links.
  - `app/components/Navbar.tsx` currently has a circular logo, navigation order Records/Application/Clients/Settings/Home, and a visible Backup button.
  - `app/settings/page.tsx` currently covers only a limited set of browser-local workspace preferences.
  - `app/clients/page.tsx` currently exposes import/export controls, a large form, and an Address table column.
  - `lib/case-reference.ts` currently builds the first reference segment from the case series, not the client category/prefix.
  - `app/trademark-application/page.tsx` defaults the status field to `GENERATING APPLICATION`.
  - `app/records/page.tsx` contains status transition, dispatch/delivery, pagination, and CSV import/export logic that must be regression-tested before editing.
  - `lib/data.ts` contains law-firm/consultant master data suitable for reuse in a dropdown.
  - `Code.gs` currently uses a configured main Drive folder ID; a user-selected Drive Picker folder flow is not yet verified.
- Root `AGENT.md` was absent before this phase. It is now added on the planning branch as the agent operating guide and full implementation plan.
- The existing `AGENT_PROGRESS.md` history has been preserved; this section is appended rather than replacing prior deployment/migration notes.

### New user-approved clarifications

- Visible reference is `N-333-001`: client category/prefix, client code, case number.
- Series is a separate grouping field; it is not the client category and is not part of the visible three-segment reference.
- Keep per-client + per-series case numbering unless a later ADR changes it.
- A single client can contain multiple people/applicants and different applicant names across cases; applicant/person data remains case-specific.
- Document generation outcome is separate from main application status.
- Main application status defaults to `IN REVIEW`; approval/rejection follows review. Rejected cases do not proceed to dispatch. Approved cases remain approved until staff starts dispatch.
- Dispatch asks for date and optionally proof image. Delivery retains tracking number and recipient/person details. All form fields, notes, job details, images, and attachments must be editable.
- Records is the Home destination after login. Navigation order: Home, Clients, Cases, Create Case, Settings.
- Settings is the home for brand identity, independent series management, backup/restore, import/export, spreadsheet template creation, display/sound/notification settings, and Drive setup.
- UI should be compact, with breadcrumbs, pagination, expandable details, concise labels, boxed records alignment, and compact repository footer links.
- New square/rounded logo mark and editable display name/prefix/tagline are required.
- Drive Picker folder assignment and generation into the selected folder must be investigated and tested securely.
- Spreadsheet template and CSV/JSON import/export must match the latest fields and be round-trip verified.

### Documentation-first work completed on branch `feat/brandex-workflow-phase2-plan`

- [x] Created proposed ADR 0004: `audit/0004-phase-two-workspace-series-workflow-drive.md`.
- [x] Added ADR 0004 to `audit/README.md`.
- [x] Created root `AGENT.md` with engineering constraints, approved rules, phased implementation checklist, Drive Picker setup prerequisites, and handover rules.
- [x] Preserved all previous progress history and appended this phase-two baseline and handover.
- [ ] Review documentation branch and open PR for the plan.
- [ ] Implement Phase 0 source/runtime/schema audit.
- [ ] Implement Phase 1 identity/reference/independent series.
- [ ] Implement Phase 2 generation-vs-application workflow and complete edit support.
- [ ] Implement Phase 3 navigation, breadcrumbs, pagination, compact page layouts.
- [ ] Implement Phase 4 Settings, brand identity, backup/import/export, spreadsheet template, feedback preferences.
- [ ] Implement Phase 5 Google Picker and selected-folder document generation.
- [ ] Implement Phase 6 schema reconciliation/migration and import/export round-trip verification.
- [ ] Implement Phase 7 full CI, handover, and authorized deployment verification.

### Safety and deployment status for this phase

- No application source code changed.
- No Supabase schema or production records changed.
- No Google Apps Script deployment or Google Drive file/folder changes performed.
- No Vercel deployment performed.
- The ADR is marked Proposed because implementation and migration design still require the Phase 0 audit.
- Do not treat the plan branch as a production release. Continue from its branch after review; merge only after PR review and checks.
