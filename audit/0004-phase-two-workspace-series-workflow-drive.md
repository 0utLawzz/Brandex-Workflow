# ADR 0004: Separate client identity, case series, and case reference display; phase-two workflow and workspace plan

- **Date:** 2026-11-22
- **Status:** Proposed
- **Owners:** BrandEx Workflow maintainers
- **Supersedes:** ADR 0002 only for the displayed case-reference format and the interpretation of the first reference segment. Its data-preservation and per-client/per-series numbering constraints remain in force.
- **Related:** [ADR index](README.md), [current main commit](https://github.com/0utLawzz/Brandex-Workflow/commit/d2b38ad2561078117783d8e7fc5188e2dcf60ef3)

## 1. Context — what exists today?

The current `main` branch contains the merged naming/workflow implementation from PR #1 and the Records-first UI implementation from PR #3.

Verified source observations on 2026-11-22:

- The home route (`app/page.tsx`) still renders a separate landing page with a large logo in its hero, quick links, external portals, and a repository section.
- The shared navigation (`app/components/Navbar.tsx`) currently orders Records, Application, Clients, Settings, Home; it displays a circular logo and a Backup button.
- Settings (`app/settings/page.tsx`) currently persists a small set of display preferences in the browser. It does not yet provide the requested full brand, series, backup, import/export, spreadsheet, and integration configuration.
- Client management (`app/clients/page.tsx`) currently exposes import/export controls on the page, includes an address column, and displays a large client form.
- The current case-reference helper (`lib/case-reference.ts`) formats the first segment from the case series, followed by client code and case number. This does not match the newly clarified reference.
- The application form defaults its status to `GENERATING APPLICATION`. Records currently combines several generation and processing values in its status filter/transition logic.
- `lib/data.ts` contains the current law-firm/consultant master values. These should be reused as the initial dropdown source rather than duplicated.
- `Code.gs` currently uses a configured main Drive folder ID. A user-selected client folder picker and verified folder-targeted generation flow are not yet established by this audit.
- The repository has `AGENT_PROGRESS.md` and the `audit/` ADR process, but no root `AGENT.md` or `AGENTS.md` was found.

No application source, Supabase schema, production data, Apps Script deployment, or Drive folders were changed while preparing this ADR.

## 2. Problem — why change?

The current display reference treats the series as the first visible reference segment. The user has clarified that this mixes two different concepts: client identity/category and a business grouping series. That makes client categorization and filtering harder, especially when one client code has multiple people or multiple applications with different applicant names.

The generation trigger is also being confused with the ongoing application processing status. Users need to know whether document generation succeeded, while the main case status should independently describe review, approval/rejection, dispatch, and delivery.

The UI still exposes secondary controls and repeated explanatory content in places where compact navigation and expandable details are preferred. Brand identity, series management, backup, import/export, and integration configuration need a single Settings home.

## 3. Decision

### 3.1 Client, series, and case identity

Keep these as independent fields and concepts:

- **Series:** an independent, editable grouping selected for the case, for example `N`. It is not the client's category/prefix.
- **Client code:** a separate three-digit client identifier, for example `333`.
- **Case number:** a separate three-digit number, for example `001`.
- **Client category/prefix:** a separate client-profile attribute used for client classification/folder routing; it is not substituted for the selected case series in the case reference.

The newly approved visible reference is:

`N-333-001`

The reference is composed of selected case series + client code + case number. All three segments are displayed separately with hyphens. Client category/prefix remains a separate client-profile attribute and is not merged into the case reference. Numbering remains per client + series unless a later ADR changes that rule. Applicant/person name is case-specific and must not be assumed to be identical for every case belonging to a client.

The implementation must inspect existing fields and relationships before changing schema. Prefer reusing existing `clients.client_prefix`, `trademark_records.client_code`, `trademark_records.case_no`, and `trademark_records.selection_menu` where their actual meanings are verified. Do not silently reinterpret legacy values or automatically rewrite existing records. If the record needs a durable client-prefix snapshot or explicit series table/relationship, propose an additive migration with preflight, backfill rules, uniqueness, and rollback before applying it.

### 3.2 Two independent status tracks

- **Generation outcome:** an operation/result, not the main business status. The user starts generation; the UI reports progress and a clear success/failure notification. Avoid showing a persistent generation status as though it were the application lifecycle.
- **Main application status:** a separate editable field. New generated applications default to **IN REVIEW**.
  - IN REVIEW → APPROVED or REJECTED.
  - REJECTED is terminal for this process; do not offer dispatch as the next action.
  - APPROVED remains approved until staff deliberately starts dispatch; do not auto-dispatch merely because approval was recorded.
  - DISPATCHED requires a dispatch date; proof image is optional.
  - DELIVERED captures the existing tracking number and recipient/person details as appropriate.
- All relevant fields, notes, case-specific job details, images, and attachments must remain editable through the record edit flow.

Preserve the separate four-stage legal filing tracker unless a later user-approved decision changes it. Do not confuse it with document generation or courier/application status.

### 3.3 Workspace and navigation

- Make Records the default authenticated landing page and label it Home in the navigation.
- Top navigation order: Home (Records), Clients, Cases, Create Case, Settings.
- Provide a compact horizontal breadcrumb/path trail so users can move back to parent pages.
- Keep the separate marketing/landing content out of the primary logged-in workflow. Remove the large duplicated homepage logo; use a visible square/rounded-corner brand mark in the header.
- Keep repository links as a compact icon-led footer/link strip, with minimal text.
- Use compact cards/boxed summaries with alignment fixes. Collapse secondary details and expand them on demand. Add pagination and quick page navigation without hiding core search/filter access.
- Move backup/restore, client/case import/export, and spreadsheet creation tools into Settings.
- Keep client creation behind a compact “New Client” action; keep the client table focused on identity and code, not address.
- Use concise page headings: “Client Profiles” and “Case Generator”. Remove redundant marketing subtitles and repeated explanatory paragraphs.
- On the case generator, group future/secondary actions in a dropdown rather than occupying permanent page space.

### 3.4 Settings and brand identity

Create a structured Settings panel with compact sections for:

- Brand mark/logo upload or selection, display name, prefix/wordmark, and tagline; apply the saved identity consistently in the header and supported document-generation surfaces.
- Series management: create, edit, activate/deactivate, and select independent series. Series must not change client category or client code.
- Backup and restore.
- Client and case import/export.
- Spreadsheet template creation with the current approved columns.
- Display, sound, notification, and integration preferences.
- Google Drive folder-selection setup and connection status.

Use an appropriate persistent store for shared settings after inspecting the existing Supabase/auth architecture. Do not treat browser-only local preferences as organization-wide configuration.

### 3.5 Interaction feedback

- Add restrained button/card motion and a short, soft UI sound only after an explicit user gesture. Provide a setting to disable sound and respect reduced-motion/accessibility preferences.
- Add visible in-app notifications for generation, save, import/export, and errors. Browser/system notifications must be opt-in and permission-based.
- Do not autoplay sound on page load or bypass browser notification permissions.

### 3.6 Google Drive folder picker

Investigate Google Picker API as the user-facing folder selection mechanism. Confirm OAuth client, API key, project number/app ID, authorized origins, scopes, and folder permissions before implementation. The chosen folder must be validated server-side and its folder ID associated with the intended client/case using the approved data model. Apps Script generation must create output in the selected folder (or a safely created case subfolder under it), while retaining the existing configured root as a controlled fallback only if explicitly designed and disclosed.

Do not expose service credentials or backend tokens to the browser. Do not move, rename, or delete existing Drive folders. Test folder access and output placement with a non-production test folder before live use.

### 3.7 Spreadsheet and data exchange

The spreadsheet-creation action should create a blank/template sheet with the approved current columns, not silently switch the operational source of truth away from Supabase. Import/export and backup formats must be round-trip tested against the latest fields and preserve IDs, relationships, custom series, prefix, status tracks, notes, and document references. Never import sample rows as production cases.

## 4. Alternatives considered

- **Keep series as the visible reference prefix:** rejected because it confuses series grouping with client category.
- **Merge series into client code:** rejected because series is an independent business grouping and clients may have multiple people and cases.
- **Automatically rewrite all old references:** rejected because existing references may be linked to generated documents, Drive folders, exports, or external filing records.
- **Make generation outcome the main application status:** rejected because generation is an operation, while review/approval/dispatch/delivery is the business lifecycle.
- **Put every secondary action on the main pages:** rejected because it creates clutter; use Settings and contextual expandable controls instead.
- **Use Google Apps Script fixed root only:** retain only as a reviewed fallback; user-selected folder targeting is the requested workflow.

## 5. Impact

Potentially affected areas:

- `app/page.tsx`, `app/records/page.tsx`, `app/clients/page.tsx`, `app/trademark-application/page.tsx`, `app/settings/page.tsx`
- `app/components/Navbar.tsx`, `Footer.tsx`, record edit/dispatch modals, and notification components
- `lib/case-reference.ts`, `lib/data.ts`, `lib/standalone-db.ts`, `lib/supabase-db.ts`, API routes, and import/export utilities
- `supabase_schema.sql` and a separately reviewed Supabase migration if source inspection proves it necessary
- `Code.gs`, `appsscript.json`, Google Cloud project settings, OAuth consent/configuration, and Drive folder permissions
- Tests, documentation, ADRs, and deployment configuration

No source/runtime changes are included in this proposed ADR commit.

## 6. Data and migration plan

- First inspect the live schema and current production row counts/read-only configuration. Do not run SQL based only on the template schema.
- Preserve all existing client and case rows, primary keys, history, attachments, and generated document references.
- Do not bulk-renumber historical records or change old Drive folders.
- Prepare a read-only identity audit for blank prefixes, duplicate references, missing client relationships, and series values before any migration.
- If a schema change is necessary, use additive nullable fields/tables first, preflight constraints, a reversible migration, and post-migration count/relationship checks. No destructive column replacement.
- Test import/export round trips using a sanitized copy and verify that no fields are dropped or mapped to the wrong status.
- Test Drive folder selection and generation using a dedicated test folder and test client before production use.

## 7. Risks and mitigations

- **Reference collision or ambiguity:** retain a unique key on client + series + case number; keep the visible reference distinct from series; run duplicate preflight.
- **Legacy records lack prefix or client relationship:** do not guess; show an explicit “prefix/relationship required” state and preserve the old record.
- **Applicant names differ per case:** keep applicant/person details on the case; do not auto-overwrite from client profile when editing existing cases.
- **Workflow status regression:** add explicit transition tests and preserve historical status values during migration.
- **Generation falsely appears successful:** only show success after Apps Script returns success and expected document URLs are saved/verified.
- **Drive folder picker misconfiguration or unauthorized access:** validate folder access server-side, keep credentials private, and test with a non-production folder.
- **Browser sound/notification restrictions:** trigger only from user actions, provide opt-out, and never make sound/notifications required for successful use.
- **Schema/template drift:** compare migrations, current live schema, and `supabase_schema.sql`; do not blindly run the full schema template against production.
- **Scope too broad for one safe release:** implement in ordered, independently testable phases and keep unfinished tasks visible in `AGENT_PROGRESS.md`.

## 8. Verification

### Initial read-only audit evidence (2026-11-22)

- Connected Supabase project: `pjthtvkzuthxwpvcdqxy`, status `ACTIVE_HEALTHY`, PostgreSQL `17.11.0.018`.
- Current row counts: 6 clients, 480 trademark records, 131 history rows, and 26 document-reference rows.
- RLS is enabled on all four business tables; a read-only `pg_policies` query returned no policies for those tables. The current app's protected server-side service-role API remains the intended access path.
- All 6 current clients have a non-empty client prefix and client code.
- A read-only duplicate scan for populated client-code + series + case-number tuples returned no duplicate groups.
- Current status pairs are mixed: 420 records have `status=DISPATCHED` and `filing_process=DISPATCHED`; 50 are DELIVERED/DELIVERED; 4 PENDING/PENDING; 4 REJECTED/REJECTED; 1 APPROVED/APPLICATION FILED; 1 IN REVIEW/APPLICATION FILED. This confirms that the two tracks are not consistently separated in current data. Do not mass-rewrite these values without a reviewed mapping.
- Live `trademark_records` does not currently expose `client_id`, `dispatched_image`, `dispatched_doc_name`, or `dispatched_doc_type` columns, even though the code/schema template references some of these concepts. The only current migration file adds client folder metadata and the uniqueness index; it does not add those record columns.
- The live schema has 480 records, while historical progress notes refer to earlier totals. Use current live read-only results as the baseline for this phase.
- `supabase_schema.sql` still contains a project URL comment and placeholder JWT reference for a different project ref (`zbkgerbdnjmctqqnoqnd)); the application default URL and connected Supabase project use `pjthtvkzuthxwpvcdqxy`. Correct the stale schema comment/placeholder during the schema reconciliation phase; do not use the placeholder key.
- Supabase's current Data API model requires both role grants and RLS policies for direct Data API access. The current app uses protected server-side service-role API routes; any new tables must be granted only to the necessary roles and protected with RLS. The October 30, 2026 default-grant change means new public tables should not be assumed to be exposed automatically.

These checks were read-only. They did not change schema, rows, policies, or deployments.

Required before marking implementation complete:

- Unit tests for reference formatting, series independence, per-client/per-series numbering, and duplicate prevention.
- Tests for existing records with missing prefix/client link and cases with different applicant names under one client.
- Workflow transition tests: generation result independent of IN REVIEW; approve/reject; approved-to-dispatch; dispatch date; optional proof; delivered tracking and recipient.
- Edit-flow tests for every field, notes, images, and attachments.
- Client and case UI tests for compact layout, breadcrumbs, pagination, and responsive navigation.
- Import/export round-trip tests for every current field and spreadsheet template column checks.
- Google Picker OAuth/origin/scope verification, folder access checks, and a test generation placed in the selected folder.
- Full CI: dependency audit, Apps Script syntax, lint, tests, type checks, Next.js production build, and documentation checks.
- Production smoke tests with existing records only; no destructive test data or bulk rename.

## 9. Rollback / recovery

- Revert UI and application logic through a reviewed Git revert/rollback.
- Keep database migrations additive and provide explicit reverse SQL where safe; do not drop data columns during rollback.
- Retain the old reference formatter for reading historical references if compatibility requires it, while using the new formatter only for new display/generation after migration review.
- Restore settings from the verified backup if configuration changes fail.
- Revert Apps Script to the last known-good deployment version if folder-targeted generation fails.
- Never roll back by deleting records, changing historical references, or moving existing Drive folders.

## 10. Implementation record

- **Planning branch:** `feat/brandex-workflow-phase2-plan`.
- **Initial implementation status:** Proposed; documentation-first planning only.
- **Application source changed:** No.
- **Supabase schema or production data changed:** No.
- **Apps Script deployed or Drive changed:** No.
- **Verification:** Current `main` source files and merged PR metadata were inspected. Automated application tests have not been run in this planning step.
- Update this section after each implementation PR with commit, tests, migration verification, and deployment evidence.
