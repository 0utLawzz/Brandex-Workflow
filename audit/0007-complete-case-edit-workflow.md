# ADR 0007: Complete case editing and guarded workflow transitions

- **Date:** 2026-11-23
- **Status:** Accepted
- **Owners:** BrandEx Workflow maintainers
- **Related:** ADR 0002, ADR 0004, ADR 0005, ADR 0006

## 1. Context — what exists today?

- Records is the authenticated primary workspace and Supabase is the source of truth.
- The Records page already has a partial Edit Case dialog and separate approval/rejection, dispatch, and delivery dialogs.
- The edit dialog does not expose all application-entry fields and does not provide consistent editing for applicant identity, CNIC, address, applicant image, delivery proof, and attached document references.
- Workflow state is stored in `trademark_records.status`; legal filing progress is stored separately in `filing_process`. Document generation state is separate again.
- Existing records include historical and mixed legacy status values. Existing references and client relationships must remain unchanged unless the operator explicitly edits a supported field.

## 2. Problem — why change?

Staff need a complete, reliable case editor and guarded workflow actions. In particular, a rejected case must not be dispatched, a case must not be marked delivered before dispatch, and dispatch/delivery actions must collect their required proof and metadata. Editing ordinary case details must not silently alter identity, series, client prefix, or case numbering.

## 3. Decision

1. Extend the existing Edit Case experience to cover the application metadata already represented in the application/database model: applicant and father/representative names, CNIC, address, trading name, class, trademark number, filing/issue and expiry dates, year, law-firm details, notes, applicant image, dispatch proof, delivery proof, and linked attachments where the current storage contract supports them.
2. Keep the visible case identity `SERIES-CLIENTCODE-CASENUMBER` separate from the client's category prefix. Preserve every existing segment when editing unrelated metadata. Reference segments remain editable only through explicit operator input, with the existing per-client-and-series uniqueness check; never auto-recalculate them or merge the client prefix into Series.
3. Keep three distinct lifecycle concepts separate: document-generation outcome, main application workflow status, and legal filing stage (`filing_process`).
4. Main workflow transitions are forward-gated: `IN REVIEW/PENDING → APPROVED or REJECTED → DISPATCHED → DELIVERED`. Rejected cases cannot be dispatched. Dispatch requires an approved case and dispatch date plus tracking/reference details; delivery requires a dispatched case, delivery date, and receiver name. Existing proof fields and history remain retained.
5. Apply transition checks in the server-side data layer as well as the UI so direct API requests cannot bypass them. Bulk operations must apply the same eligibility rules to every selected case and report failures clearly.
6. Every successful metadata edit or workflow transition records a history entry. A failed update must not be presented as successful.
7. Use only existing schema columns and the existing `trademark_documents` reference table for this increment. Do not run a production migration or mutate production records as part of code implementation. If schema reconciliation proves an additive migration is required, document it separately and keep it out of this PR.
8. Do not modify, overwrite, move, or delete the user's existing backup or existing Google Drive folders/files. Do not deploy Apps Script or change production configuration in this increment.

## 4. Alternatives considered

- Allowing all status changes from any stage: rejected because it permits rejected cases to be dispatched and cases to be delivered without dispatch.
- Keeping edit fields split across unrelated dialogs: rejected because staff cannot reliably maintain a complete case record.
- Recalculating or regenerating references during metadata edits: rejected because it risks changing established identity.
- Storing new attachment bytes in an unreviewed schema column: rejected; use the existing document-reference contract and preserve current external file locations.

## 5. Impact

- Records page edit and workflow dialogs.
- Supabase server-side update and bulk status methods.
- Database API validation.
- Pure workflow rules and regression tests.
- ADR/progress documentation.

## 6. Data and migration plan

- No data migration is planned.
- No existing record, reference, client relationship, history row, document row, Drive folder, or backup is to be rewritten or deleted.
- Preserve existing image/proof values unless the operator explicitly replaces or removes a value in the editor.
- Any unsupported schema field must fail with a clear message; do not silently drop it or write to a guessed column.

## 7. Risks and mitigations

- **Legacy status values:** normalize known legacy pending/review labels for eligibility while retaining the stored value until an explicit valid transition.
- **Missing dispatch/delivery metadata:** validate required fields before saving.
- **Bulk mixed eligibility:** reject ineligible selections with case-specific errors rather than silently skipping cases.
- **Partial history failure:** report the persistence failure clearly; never claim an audit event was recorded if it was not.
- **Identity drift:** preserve identity fields by default; explicit reference edits remain subject to the per-client-and-series uniqueness check.
- **Large images/proofs:** enforce the existing 12 MB upload ceiling and accepted image/PDF MIME types.
- **Legacy schema drift:** do not add production columns in this PR; stop and document any unsupported field.

## 8. Verification

- Unit tests for transition eligibility, legacy pending aliases, rejection blocking dispatch, dispatch-only delivery, and required metadata.
- Tests for edit payload identity preservation and allowed field mapping.
- Full CI: dependency audit, Apps Script syntax, lint, tests, Next.js build, required-document checks, and CodeQL where configured.
- Vercel preview build; authenticated manual QA is required before merge.
- No production database writes, Drive changes, Apps Script deployments, or production deployment in this PR.

## 9. Rollback / recovery

- Revert the feature branch through a reviewed Git revert.
- No database rollback is required because no migration or production data mutation is included.
- Existing records, references, document links, Drive files, and backup remain untouched.

## 10. Implementation record

- Implementation branch: `feat/complete-case-edit-workflow`.
- **PR:** [#9 — Complete case editing and guarded workflow transitions](https://github.com/0utLawzz/Brandex-Workflow/pull/9) (draft/open; not merged).
- **CI:** GitHub Actions run `45080110719` passed on latest code commit `a70bd930e0cd73df6407aa9495a60dd9536fa714`: dependency audit, Apps Script syntax, ESLint, regression tests, Next.js production build, and required-document checks. The only later commit updates audit/progress documentation.
- **Preview:** Exact-head READY deployment `dpl_7NbjWfzM71DbjiRTsyZSZ8P2n7wo` was confirmed for commit `44f720b4ec54d2b7246f13b4e7ab87df6d8e0c90`; authenticated functional QA is still pending.
- **Authenticated QA:** pending because the latest branch head does not have a current preview. Do not merge until a current preview is available and the Records editor/workflow is checked.
- Production schema/data, Google Drive, Apps Script, and Vercel production configuration: not changed.

### Verification-gate continuation

- Live production schema comparison confirmed that dispatch proof columns are not present on `trademark_records`; implementation now sends proof only through the existing `trademark_documents` reference table.
- Edit Case now sends a narrow changed-field payload, and single status updates include a conditional current-status predicate to fail closed on a concurrent change.
- Local checks after these changes: 43 tests passed, lint passed with two pre-existing hook warnings, and the production build passed. Disposable Supabase migration/integration verification and authenticated exact-head UI QA remain pending; no production or test-project writes were made.

### Atomic workflow correction

- Added `20261123130000_atomic_case_workflow.sql` with a service-role-only transactional RPC for guarded status changes, proof-reference insertion, and history insertion. It uses the existing production-compatible columns and rolls back when any selected case is missing or ineligible.
- Single and bulk transition callers now use the RPC; transition history is no longer a separate UI/API write. The migration remains unapplied pending a production-equivalent disposable target.
- Edit Case now uses the migration's metadata RPC so the changed-field update, optional proof reference, and `RECORD UPDATED` history row commit together.
- Both RPCs are `SECURITY INVOKER` and executable only by `service_role`; no public `SECURITY DEFINER` endpoint is introduced.
