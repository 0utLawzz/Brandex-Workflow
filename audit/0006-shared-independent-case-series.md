# ADR 0006: Shared independent case-series management

- **Date:** 2026-11-23
- **Status:** Accepted
- **Owners:** BrandEx Workflow maintainers
- **Related:** ADR 0004; PR #7 (Phase 1 identity/status corrections)

## 1. Context — what exists today?

- The visible case reference is `SERIES-CLIENTCODE-CASENUMBER`, for example `N-333-001`.
- Series is independent from the client's category prefix and client code.
- Create Case currently accepts a typed series value and presents the legacy values `A`, `X`, `N`, and `B` as a browser datalist. Custom values can also be typed.
- Settings currently persists display preferences in browser local storage. It does not provide an organization-wide series registry.
- Client/case data is stored in Supabase. Browser requests use the protected `/api/database` route; the route is protected by the application authentication middleware and uses a server-only Supabase service-role credential.
- The earlier live schema audit found no existing shared settings/series table (its evidence is consolidated in ADR 0008). The application must not rely on browser-local storage for shared business configuration.

## 2. Problem — why change?

A typed/browser-local series list is not centrally managed. Staff can use inconsistent values, and one person's changes cannot be shared reliably. The user requires a shared series master with create, edit, activate, and deactivate controls, while keeping series independent from client category/prefix and preserving historical case references.

## 3. Decision

1. Add a dedicated `public.case_series` table as the canonical shared registry.
2. Store a normalized uppercase series code (1–8 characters; first character A–Z; remaining characters A–Z or 0–9), active state, sort order, and timestamps.
3. Enforce case-insensitive uniqueness at the database layer.
4. Seed the registry with `A`, `X`, `N`, and `B`, plus every distinct valid series already present in `trademark_records.selection_menu`. Existing case rows are read only; no historical reference or case value is rewritten.
5. Read and mutate the registry only through authenticated `/api/database` operations and the server-side Supabase service role. Enable RLS and do not create `anon` or `authenticated` policies or grants.
6. Provide list, create, and update operations. Deactivation is the supported retirement mechanism; do not delete a series. Active series appear in Create Case. Settings can view active and inactive entries.
7. A series code may be renamed only when no existing case references it. If it is in use, reject the rename and instruct the operator to create a replacement series and deactivate the old one. Never bulk-rewrite historical cases or Drive folders.
8. If the registry cannot be loaded, Create Case must show an actionable error and must not silently fall back to a browser-local list or create a case with an unverified series.
9. Do not apply the migration to production as part of this code change. Production schema application requires a separate review/approval and preflight.

## 4. Alternatives considered

- **Browser local storage:** rejected because it is not shared across staff/devices and is not an authoritative business configuration store.
- **Keep free-text entry only:** rejected because it cannot provide a centrally governed active/inactive list or prevent inconsistent series.
- **Store series in client profiles:** rejected because one client can use multiple series and series is not the client's category prefix.
- **Store a comma-separated list in a general settings row:** rejected because it weakens uniqueness, validation, ordering, and safe concurrent updates.
- **Delete retired series:** rejected because historical records may still reference them.

## 5. Impact

Expected code areas:
- `supabase/migrations/` and `supabase_schema.sql`
- `lib/supabase-db.ts` and `app/api/database/route.ts`
- `app/settings/page.tsx` (shared Series management section)
- `app/trademark-application/page.tsx` (active shared series selector)
- Tests for validation, uniqueness, CRUD, deactivation, rename protection, and active-series loading.

No Google Apps Script, Google Drive, backup, case-numbering algorithm, client-prefix, or historical case-reference behavior should change in this increment.

## 6. Data and migration plan

- Add the table and its unique/check constraints additively.
- Seed built-in series and valid distinct values already present in `trademark_records.selection_menu`; use conflict-safe inserts.
- Do not update, delete, renumber, or otherwise mutate existing case rows.
- Enable RLS, grant table/sequence privileges only to `service_role`, and rely on the authenticated server route. No public policies.
- Validate the migration on a disposable project or local Supabase instance before requesting production application.
- Record preflight counts and postflight series counts. If migration fails, no case rows should be affected.

## 7. Risks and mitigations

- **Existing custom values are omitted:** seed from all distinct valid values already in case records, not only the four legacy options.
- **Duplicate values differing by case/whitespace:** normalize on input and enforce a unique normalized index.
- **A retired series is still used by old cases:** retain the row; deactivation affects new selection only.
- **A code rename breaks references:** allow rename only when no case references the old code.
- **API is unavailable:** fail closed; do not use local-only fallback values.
- **Unauthenticated access:** route remains behind existing authentication middleware; use service-role access only on the server.
- **Concurrent duplicate creation:** rely on the database unique index and return a clear conflict error.

## 8. Verification

Required before merge:
- Unit tests for normalization and validation.
- API/data-layer tests for list/create/update, duplicate conflict, deactivation, and rename rejection when referenced.
- Tests that inactive series are excluded from Create Case but remain visible in Settings.
- Tests that case series remains independent from client prefix when a client is selected.
- Full repository CI: dependency audit, Apps Script syntax, lint, tests, TypeScript, production build, and required-document checks.
- Preview build and authenticated UI QA.
- No production schema migration or production case mutation during PR validation.

## 9. Rollback / recovery

- Revert the application code through a reviewed Git revert.
- Do not drop the table automatically during rollback; retaining its rows is safer and preserves administrator configuration.
- If a migration has been applied, disable the UI/API use while retaining the table. Any table removal requires a separate reviewed migration after confirming no application version depends on it.
- Never roll back by changing or deleting existing case references.

## 10. Implementation record

- Implementation branch: `feat/brandex-shared-series-management`.
- Implementation status: code and tests committed on the branch; PR #8 is open as a draft.
- Latest verification on commit `0f914f5c10f08125e6c37fa2de0417ac9ac7ad0c`: dependency audit, Apps Script syntax, lint, unit tests, production build, required-document checks, CodeQL (Actions and JavaScript/TypeScript), and Vercel preview deployment all passed.
- Production schema/data changed: No. The Supabase management connector denied read access in this session, so live schema/migration state could not be independently rechecked here.
- Apps Script/Drive/Vercel production changed: No.
