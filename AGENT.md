# BrandEx Workflow — Agent Operating Guide and Phase-Two Implementation Plan

Last updated: 2026-11-22

## 1. Purpose

This file is the working handover for any AI agent or developer continuing BrandEx Workflow. Read this file, `AGENT_PROGRESS.md`, `README.md`, `STATUS_AND_COLUMNS.md`, and the relevant records in `audit/` before changing code.

The goal is to complete the user's phase-two requirements as a sequence of small, reviewable, tested changes while preserving the working production system.

## 2. Non-negotiable engineering rules

1. **Audit before implementation.** Before a major code, database, workflow, storage, Apps Script, import/export, authentication, or deployment change, create or update an ADR in `audit/`. Document existing behavior, reason, decision, impact, data/migration plan, risks, verification, rollback, and implementation record.
2. **Preserve production data.** Never delete, bulk-renumber, silently rewrite, or detach existing clients, cases, history, documents, or Drive folders. No destructive SQL or Drive operations.
3. **Inspect current main.** Do not rely on old ZIP snapshots, stale local assumptions, or PR descriptions as proof of current runtime behavior. Read the current source, tests, migrations, and live configuration where authorized.
4. **Supabase is the operational source of truth.** Client/case business data belongs in Supabase. Google Apps Script/Drive is for document generation and file storage only. Do not reintroduce operational Google Sheets reads/writes.
5. **Security first.** Never expose Supabase service-role keys, Apps Script backend tokens, OAuth refresh tokens, or Google credentials in client code, logs, screenshots, commits, or browser storage. Keep RLS enabled and do not add permissive public policies.
6. **Compatibility.** Preserve authentication, existing case records, document generation (TM-1, TM-48, individual/series/bulk where supported), retries, attachments, export/import, and existing integrations.
7. **Minimal dependencies.** Reuse existing components and libraries. Do not add packages or database columns without demonstrating need.
8. **No false completion claims.** Separate code committed, CI passed, deployment READY, Apps Script deployed, Drive output verified, and production end-to-end verified. These are different milestones.
9. **Small phases.** Keep tasks and evidence current in `AGENT_PROGRESS.md`. Mark a task complete only when its acceptance checks pass.
10. **Do not auto-deploy** unless the user explicitly asks for deployment in the current task and the target configuration has been checked. Never run production data migrations from a template without a preflight and an explicit reviewed migration.

## 3. Approved business rules

### 3.1 Client, series, and case identity

These are separate fields:

- Series: e.g. `N`, a separate grouping label selected for a case.
- Client code: e.g. `333`, belongs to the client identity.
- Case number: e.g. `001`, belongs to a case within its client + series sequence.
- Client category/prefix: a separate client-profile attribute for classification/folder routing. It is not the case series and is not substituted for the series in the case reference.
- Applicant/person name: case-specific; one client may have multiple people and different applicant names across cases.

New visible case reference: **`N-333-001`**.

Reference segments are selected series, client code, and case number, with hyphens between all three segments. The client profile's category/prefix remains a separate field and is not merged into the series. Numbering remains per client + series unless a new ADR explicitly changes it.

Do not automatically change old references or infer missing client prefixes. Existing client prefixes may be blank; require an explicit client-profile value before creating a new case where the prefix is needed.

### 3.2 Workflow statuses — keep two tracks separate

**Generation operation**
- User clicks Generate.
- Show progress and an accessible success/failure notification.
- Confirm success only after the generation API succeeds and document URLs/references are saved.
- Do not confuse a transient generation operation with the main case lifecycle.

**Main application status**
- New case default: **IN REVIEW**.
- IN REVIEW → APPROVED or REJECTED.
- REJECTED is terminal for dispatch; no dispatch action should be offered.
- APPROVED stays APPROVED until staff explicitly starts dispatch. Approval must not auto-dispatch.
- DISPATCHED asks for dispatch date; dispatch image/proof is optional.
- DELIVERED retains tracking number and captures recipient/person name as required.
- Keep all status, notes, specific-job details, images, and attachments editable through the record edit flow.

The separate four-stage legal filing tracker remains distinct from generation and courier/application status. Do not implement a payment gateway or full trademark workflow as part of this phase.

### 3.3 Navigation and compact UI

Authenticated primary navigation order:
1. Home (the Records workspace; default post-login destination)
2. Clients
3. Cases
4. Create Case

Settings should be opened through a compact gear/settings menu entry, not added as a fifth primary navigation tab unless the user later requests it.

Use a compact horizontal breadcrumb/path trail. Keep the current Records boxed display style, correcting alignment and density. Hide secondary information behind expand/collapse controls. Provide pagination and fast page navigation. Keep repository links as a compact icon-led footer.

### 3.4 Client page

- Heading: **Client Profiles**.
- Remove redundant header copy.
- Keep “New Client” as a compact action that expands the create form.
- Remove Address from the normal client table; retain the address field in create/edit only if required by the filing workflow.
- Move import/export to Settings.
- Support client-code-based grouping and show cases/applicants under the correct client without assuming one applicant name per client.
- When a client is selected in the case form, show the client details inline; remove any redundant extra “view/select details” button if the selection itself already reveals them.

### 3.5 Case Generator

- Heading: **Case Generator**.
- Put secondary/coming-soon actions into a dropdown.
- Keep current document generation features and retry behavior.
- Use numeric trademark class display (e.g. `43`, not `Class 43`) where the user-facing class value is shown.
- Keep applicant name, father/representative details, CNIC, and address at case level because different cases under the same client may have different applicants.
- Use one canonical law-firm master list; reconcile the existing values in `Code.gs` and `lib/data.ts` instead of maintaining two drifting dropdown lists.
- Build law-firm dropdown options from the existing master values in `lib/data.ts`; allow the appropriate case-level value to be edited.
- Show prefix, client code, case number, and series as separate controls/values.
- Investigate a Google Drive Picker folder assignment per client/case and save generated documents into the selected folder after server-side validation.

### 3.6 Settings

Create organized, compact sections for:
- Brand logo/mark (square with rounded corners), display name, prefix/wordmark, and tagline.
- Independent series management (create/edit/activate/deactivate).
- Backup/restore.
- Client/case import and export.
- Create spreadsheet template using current approved columns.
- Display preferences, reduced-motion-aware button effects, optional soft UI sound, and opt-in notifications.
- Google Drive picker configuration/status and setup guidance.

Organization-wide brand/settings data must persist in a secure shared store; do not assume browser-local preferences are sufficient for all users.

### 3.7 Feedback and accessibility

- Subtle button and navigation animation, not random or distracting motion.
- Soft sound only after explicit user action; user can disable it.
- Respect `prefers-reduced-motion`.
- Browser notifications require opt-in permission. In-app notifications remain available without browser permission.
- Provide clear loading, success, warning, error, and retry states.

### 3.8 Google Drive Picker

Use Google Picker API only after verifying the Google Cloud project, Picker API, Drive API, OAuth client, app ID/project number, API key restrictions, authorized origins, scopes, and folder permissions.

Folder IDs must be validated server-side. Do not expose backend tokens or service credentials to the browser. Preserve the configured root as a controlled fallback only if the final UX makes the destination explicit. Test with a non-production folder first. Never move/rename/delete existing Drive folders.

### 3.9 Spreadsheet, backup, import/export

- Spreadsheet creation creates a blank/template sheet using the approved column map; it does not make Sheets the operational source of truth.
- CSV/JSON backup/export and import must round-trip the latest fields without dropping client prefix, client relationship, independent series, case number, status, notes, dispatch/delivery fields, attachments, or document references.
- Do not import sample/test rows as production records.
- Report duplicate and unresolved identities; do not invent missing identifiers.

## 4. Phase-two task plan and acceptance criteria

### Phase 0 — Audit and baseline
- [ ] Read all current source modules, tests, schema/migrations, and relevant ADRs.
- [ ] Verify current main commit and branch; identify any open/unmerged work.
- [ ] Inspect current live Supabase schema and counts read-only; reconcile it with `supabase_schema.sql`.
- [ ] Audit existing case references, series values, client relationships, missing prefixes, and duplicates without changing data.
- [ ] Audit all record fields and edit flows, including image/document attachment persistence.
- [ ] Audit current Apps Script folder resolution and document output paths.
- **Exit:** written source-to-runtime map and a risk list; no production mutations.

### Phase 1 — Identity and independent series
- [ ] Change new reference formatter to `N-333-001` using series + client code + case number.
- [ ] Keep series independent and visible/managed separately.
- [ ] Confirm per-client + per-series numbering and uniqueness.
- [ ] Remove obsolete display/reference construction paths and old dropdown labels only after compatibility tests.
- [ ] Preserve historical references and missing prefixes; do not bulk-rewrite.
- [ ] Ensure each case retains its own applicant/person name.
- **Exit:** unit/integration tests cover multiple clients, multiple series per client, different applicants, missing prefixes, duplicates, and legacy references.

### Phase 2 — Workflow separation and editable records
- [ ] Separate generation operation outcome from main application status.
- [ ] Default new records to IN REVIEW after successful creation/generation flow.
- [ ] Implement IN REVIEW → APPROVED/REJECTED; rejection blocks dispatch.
- [ ] Approval remains APPROVED until staff starts dispatch.
- [ ] Dispatch captures date and optional proof image.
- [ ] Delivery captures tracking number and recipient/person name.
- [ ] Make every existing entry field editable, including notes, job details, images, and attachments.
- [ ] Keep legal filing stages separate.
- **Exit:** transition tests and edit/persistence tests pass; generation failures never report success.

### Phase 3 — Navigation and page density
- [ ] Records becomes the Home navigation item and authenticated default.
- [ ] Navigation order is Home, Clients, Cases, Create Case, Settings.
- [ ] Add horizontal breadcrumbs.
- [ ] Remove duplicate homepage logo/hero and use square rounded header logo.
- [ ] Keep repository links as compact footer icons with short labels.
- [ ] Keep boxed record display and fix alignment.
- [ ] Add pagination and page navigation.
- [ ] Collapse secondary details and remove excessive text.
- [ ] Client page heading becomes Client Profiles; remove address from table.
- [ ] Add compact New Client expander; remove client import/export controls from page.
- [ ] Case Generator heading; move secondary actions into dropdown.
- **Exit:** responsive desktop/mobile visual checks and navigation regression tests pass.

### Phase 4 — Settings and brand identity
- [ ] Build structured Settings sections.
- [ ] Add logo upload, display name, prefix/wordmark, and tagline persistence.
- [ ] Add independent series management and connect it to Create Case.
- [ ] Move backup/restore and import/export into Settings.
- [ ] Add current-column spreadsheet template creation.
- [ ] Add sound, motion, and notification preferences.
- [ ] Ensure shared settings persist securely and are available consistently to authorized users.
- **Exit:** settings persistence, authorization, and import/export regression tests pass.

### Phase 5 — Google Drive folder selection and generation
- [ ] Verify required Google Cloud APIs and OAuth configuration.
- [ ] Implement Picker folder selection and persist selected folder association safely.
- [ ] Validate selected folder permissions server-side.
- [ ] Update Apps Script to create output in selected client folder (or controlled case subfolder).
- [ ] Preserve TM-1, TM-48, logo, ID-card/supporting attachments, and existing retry behavior.
- [ ] Verify generated file naming includes client prefix/code, client identity, application name, and numeric class.
- [ ] Test using a dedicated non-production folder; provide exact user setup instructions.
- **Exit:** end-to-end test proves files land in the selected folder and references are saved.

### Phase 6 — Schema, import/export, and spreadsheet verification
- [ ] Prepare additive migration only if the audited data model requires it.
- [ ] Add preflight and postflight checks; provide rollback SQL.
- [ ] Update `supabase_schema.sql` to match the intended clean-install schema without reintroducing permissive RLS.
- [ ] Compare export columns and import mapping against all current fields.
- [ ] Test CSV/JSON round-trip, backup/restore, duplicate handling, and custom series.
- [ ] Generate a spreadsheet template with the exact approved columns and verify it.
- **Exit:** migration reviewed and safely applied only after approval; row counts and relationships reconcile.

### Phase 7 — Verification, handover, and release
- [ ] Run dependency audit, Apps Script syntax, lint, tests, TypeScript, diff check, and production build.
- [ ] Update ADR 0004 implementation record with PR/commit/test evidence.
- [ ] Update `AGENT_PROGRESS.md` task statuses and deployment evidence.
- [ ] Prepare a final copy/paste/deploy bundle and simple setup instructions.
- [ ] Deploy Vercel and Apps Script only when authorized; verify each independently.
- [ ] Run authenticated production smoke checks without destructive test data.
- **Exit:** source, CI, Vercel, Apps Script, Drive output, Supabase, and import/export states are reported separately and accurately.

## 5. Google Drive Picker setup prerequisites (for the eventual user handover)

Do not ask the user to configure this until the code and required APIs are ready. The eventual setup guide must show, step by step:

1. Open the Google Cloud project used by the Apps Script/Drive integration.
2. Enable Google Picker API and Google Drive API.
3. Configure the OAuth consent screen and authorized application domain.
4. Create/reuse the correct OAuth web client and add the production app origin plus local development origin.
5. Create/restrict a browser API key for the Picker API and the authorized origins.
6. Confirm the Google Cloud project number/app ID and pass only public Picker configuration to the browser.
7. Keep server tokens/service credentials in server-side environment variables or Apps Script properties.
8. Grant the executing Google account access to the selected client folder.
9. Test folder selection and generated file placement with a temporary test folder.
10. Revoke temporary test credentials or bypasses and document the final configuration without recording secrets.

The exact values and URLs must be taken from the actual connected Google Cloud project; never invent them.

## 6. Current verified baseline

- Current main commit at planning time: `d2b38ad2561078117783d8e7fc5188e2dcf60ef3`.
- PR #1 naming/workflow changes: merged.
- PR #2 ADR process: merged.
- PR #3 Records-first UI: merged.
- PR #3 commit CI status: successful at the time checked.
- Current main source has a separate landing route, circular navbar logo, navbar Backup button, basic browser-local Settings, client address table column, generation status default of GENERATING APPLICATION, and case-reference helper that currently uses series as its first segment.
- The current repository has `AGENT_PROGRESS.md` and `audit/`; it did not have a root `AGENT.md` at planning time.
- No application source, production schema/data, Apps Script deployment, or Drive content was changed in the documentation-planning step.

## 7. Handover rule

At the start of each work session, read this file and the latest `AGENT_PROGRESS.md`. Before code changes, confirm the current branch and working-tree state. After each phase, update the checklist and progress notes with exact evidence. If work stops partway, leave the next actionable task and any blockers clearly marked; never mark unverified work complete.
