# ADR 0003: Initial system architecture baseline

- **Date:** 2026-11-22
- **Status:** Accepted (baseline record; not a new architecture approval)
- **Owners:** BrandEx Workflow maintainers
- **Related:** [Repository README](../README.md)

## 1. Context — what exists today?

The repository README describes the following system baseline:

- **Application:** Next.js 15.2, TypeScript 5.7, React 19, and Tailwind CSS v4.
- **Cloud persistence:** Supabase PostgreSQL, with documented tables including `trademark_records`, `trademark_history`, `trademark_documents`, and `clients`.
- **Standalone fallback:** browser-side `localStorage` behavior in `lib/standalone-db.ts`, with synchronization to cloud when connectivity resumes.
- **Database integration:** `lib/supabase-db.ts`.
- **Authentication:** staff login at `/login`, cookie session handling using `brandex_auth`, and server-side API proxies.
- **Document generation:** Google Apps Script integration in `Code.gs`, including Form TM-1 and TM-48 generation.
- **Core workflows:** client ledger, trademark case records, CSV import/export, workflow stages, courier dispatch proofs, and document/file handling.
- **Backup and restore:** JSON backup/restore UI documented in `app/components/DataBackupModal.tsx`.

This is a baseline transcribed from the repository's project documentation, not an independent security or architecture audit. Actual implementation may differ; inspect source code before relying on any detail for a change.

## 2. Problem — why change?

Future changes need a common reference point so maintainers can identify which architecture and responsibilities existed before a proposed change.

## 3. Decision

Record the README-described architecture as the initial documentation baseline. Treat source code, current database configuration, deployed environment, and verified runtime behavior as authoritative whenever they differ from this summary.

This ADR does not approve a redesign, migration, or change to any component.

## 4. Alternatives considered

- **Treat README as a fully verified architecture audit:** rejected because documentation alone does not prove runtime behavior or deployed configuration.
- **Omit a baseline:** rejected because future ADRs would lack a starting reference.

## 5. Impact

Documentation only. No source code, application behavior, database schema, Supabase data, authentication configuration, Google Drive files, or deployments are changed.

## 6. Data and migration plan

No data migration. Existing records and external files remain untouched.

## 7. Risks and mitigations

- **Risk:** a reader assumes this baseline proves the current production configuration.  
  **Mitigation:** verify source and deployment state before relying on it; this record explicitly identifies its README-derived scope.

## 8. Verification

Compare this summary with the repository README when it changes. Inspect relevant source files and deployed configuration before making architecture decisions. No runtime tests were run for this documentation record.

## 9. Rollback / recovery

Revert this documentation record if it becomes misleading; replace it with a new dated baseline ADR rather than silently rewriting decision history.

## 10. Implementation record

- **Source used:** repository `README.md` on the default branch at the time this ADR was created.
- **Implementation:** documentation only on branch `docs/architecture-decision-records`.
- **Verification:** repository documentation was read; source-level and production-environment verification were not performed as part of this baseline note.