# ADR 0005: Full-fidelity case backup and safe restore

- **Date:** 2026-11-22
- **Status:** Accepted for implementation; production restore remains blocked until verification
- **Owners:** BrandEx Workflow maintainers
- **Related:** [ADR 0004](0004-phase-two-workspace-series-workflow-drive.md), [PR #4](https://github.com/0utLawzz/Brandex-Workflow/pull/4)

## 1. Context — what exists today?

The current JSON export reads cases, clients, history rows, and document-reference rows from Supabase. The current cloud restore inserts cases and clients only. It drops history and document references because new database IDs are assigned, and it does not include the bytes of files stored outside the database. The restore UI currently reports that history and document links were not restored.

The current export maps document references to a reduced shape and does not prove that every case-associated asset is available in the backup. A URL pointing to Google Drive is a reference, not a copy of the file. The existing user's historical case backup is valuable and must not be overwritten or treated as disposable test data.

## 2. Problem — why change?

A backup that contains case rows but loses identity, history, document links, or actual files is not a reliable disaster-recovery backup. A restore that creates cases without restoring their related rows can leave the database looking complete while records have silently lost their audit trail and supporting documents.

## 3. Decision

The case backup is a top-priority release requirement. Do not label backup/restore "full", "complete", or "verified" until all acceptance checks below pass.

A verified backup package must preserve:

- Original case ID and visible case reference, including Series, client code, and case number as separate values.
- Client ID/relationship, client name, client category/prefix, and client code.
- Case-specific applicant/person identity, application/mark name, TM number, numeric class, law firm, dates, status, legal filing stage, generation outcome where recorded, notes, specific job, tracking, dispatch, and delivery details.
- All history/audit rows and all document-reference metadata, including original record IDs and timestamps.
- An asset manifest for every referenced file, with source URL/provider, file name, MIME type, size, checksum where available, and the case/client association.
- Actual file bytes for assets claimed as fully backed up. If bytes cannot be copied due to unavailable credentials or permissions, the export must clearly label the package as incomplete and list every unavailable asset. A URL-only manifest is not a complete file backup.

Restore must:

1. Validate package version, structure, required identity fields, relationships, and asset manifest before writing anything.
2. Offer a dry-run/preflight summary, including new rows, already-existing rows, ID/reference collisions, missing files, and broken references.
3. Never overwrite or delete existing production rows by default.
4. Preserve original IDs when restoring into an empty compatible target where safe; otherwise build explicit old-ID-to-new-ID maps and reattach history, documents, client relationships, and assets using those maps.
5. Preserve the independent Series, client prefix, client code, case number, and original visible reference. Never infer missing historical values.
6. Be idempotent or detect duplicates so retrying a restore does not create duplicate cases/history/documents.
7. Verify row counts, relationships, history counts, document counts, and asset checksums/availability after restore.
8. Produce a restore report and stop safely on partial failure; never report success for a partial restore.

The user's existing backup must remain untouched. Keep at least one separate copy before testing any restore workflow.

## 4. Alternatives considered

- **Keep JSON rows and URLs only:** rejected as insufficient for full disaster recovery.
- **Restore only cases and clients:** rejected because it silently omits history and document associations.
- **Overwrite production to reproduce a snapshot:** rejected as the default because it can destroy newer records.
- **Reassign IDs without relationship mapping:** rejected because child rows become orphaned or detached.

## 5. Impact

Expected areas include DataBackupModal.tsx, lib/standalone-db.ts, lib/supabase-db.ts, authenticated database API routes, document/asset storage integration, backup tests, and user-facing restore reports. Drive asset copying may require a verified Google Drive integration or an explicitly supported export path. Do not assume a connector or credential is available.

## 6. Data and migration plan

No production data migration is authorized by this ADR. First implement and test the backup package format and dry-run restore against a disposable test database/storage location. Existing production records, Drive folders, and the user's historical backup remain unchanged.

Before any production restore, produce a backup of the current production state, verify that backup package independently, and obtain explicit user approval for the target and restore mode.

## 7. Risks and mitigations

- **Missing Drive files:** enumerate every asset and distinguish copied bytes from URL-only references.
- **ID collisions:** preflight and map IDs before inserting child rows.
- **Duplicate restore:** use stable source identifiers and idempotency checks.
- **Schema drift:** validate package version and destination schema before writes.
- **Partial restore:** use staged operations/transactions where possible and emit a machine-readable report.
- **Historical identity loss:** preserve Series, client prefix, client code, case number, and visible reference independently.

## 8. Verification

Required acceptance tests:

- Export and inspect a complete case package containing multiple cases, clients, multiple Series, and case-specific applicants.
- Confirm all case identity fields and original IDs are present.
- Confirm history and document-reference metadata are included with original parent IDs.
- Confirm every asset is either included with verified bytes/checksum or explicitly listed as unavailable; no URL-only package may claim full backup.
- Dry-run detects invalid JSON, missing clients, duplicate references, ID collisions, and missing assets without writes.
- Restore into an empty test target preserves IDs and relationships.
- Restore into a non-empty test target maps IDs safely and never overwrites existing rows.
- Repeat restore and verify no duplicate cases/history/documents.
- Verify post-restore counts, links, and file availability.
- Confirm the UI clearly distinguishes complete, partial, and failed backup/restore results.

## 9. Rollback / recovery

Do not test against production. Retain the original backup and a separately verified current-state backup before any approved production restore. If a test restore fails, discard only the disposable test environment. Production rollback requires a reviewed restore plan and explicit approval; never delete or overwrite records to force a match.

## 10. Implementation record

- **Implementation branch:** feat/phase2-backup-integrity-first.
- **Current status:** first incremental implementation committed on feat/phase2-backup-integrity-first. Versioned package and asset-manifest coverage checks are in place; cloud restore is still incomplete.
- **Implementation commit(s):** see branch history for the versioned backup package, asset manifest, backup UI warnings, and tests.
- **Tests:** added; CI result pending.
- **Known gaps:** history/document rows are not yet restored; the live schema lacks client_id; external Google Drive file bytes are not copied. This increment must not be described as full backup/restore.
- **Production data/files changed:** No.
- Update this section after each implementation PR with verified test evidence and remaining gaps.
