# Deployment and production rollout

This guide describes the guarded release sequence. It is not authorization to change production. The active audit and exact migration inventory are maintained in [ADR 0008](audit/0008-consolidated-2026-11-24-audit-and-fixes.md).

## Architecture

- Vercel hosts the Next.js application and server-side API routes.
- Supabase PostgreSQL is the operational database. The tracked files in `supabase/migrations/` are additive migrations; `supabase_schema.sql` is a clean-install schema, not a production reset script.
- Google Apps Script (`Code.gs`) is deployed separately and writes generated documents to Google Drive. GitHub/Vercel deployments do not update Apps Script.
- Preview must have separately reviewed test Supabase and Apps Script targets. Do not assume Preview is isolated from production based on its URL or Ready status.

## Verified environment baseline — 2026-11-25

- GitHub `main` is PR #9 merge `6ec9f6b`; the Production Vercel deployment is still that revision at `https://brandex-workflow-irkyvboie-projectsb.vercel.app`.
- The authenticated review Preview is `https://brandex-workflow-fitxqf3s7-projectsb.vercel.app`. It currently refuses writes with `PREVIEW CHANGES ARE LOCKED. CONFIGURE AN APPROVED TEST DATABASE FIRST.` No write or Drive operation has been attempted.
- Production Supabase `pjthtvkzuthxwpvcdqxy` has 485 trademark records and 8 clients, but lacks the current app's 10 queried columns and all three workflow/metadata RPCs.
- The review repository has 23 SQL migration files. Production has 3 migration-history entries; the isolated test project `clviaughxebohniopzyg` has 21. Their names/timestamps do not map one-to-one to the repository files. Supabase's migration-list command compares timestamps, and `db push` applies every migration it considers pending. **Do not run `db push` or `migration repair` against either hosted database until a reviewed migration-lineage map and exact dry run reconcile this divergence.** A dry-run listing many old migrations is a stop condition, not a release plan. See the [Supabase migration-list reference](https://supabase.com/docs/reference/cli/supabase-migration-list) and [db push reference](https://supabase.com/docs/reference/cli/supabase-db-push).
- The test project has the expected app columns and three RPCs; this is schema evidence only. It has 10 trademark rows and no clients, so it does not yet support representative Edit/Picker/Drive acceptance.

### Preview isolation requirements

Before the app can write in Preview, configure Preview-only environment values to point at the test project, including `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, server-only `SUPABASE_SERVICE_ROLE_KEY`, and `PREVIEW_WRITE_PROJECT_REF=clviaughxebohniopzyg`. Configure a distinct non-production `PREVIEW_APPS_SCRIPT_URL` and matching `APPS_SCRIPT_RECORDS_TOKEN`; it must differ from `PRODUCTION_APPS_SCRIPT_URL`. Configure the restricted Google Picker client, API key, and project number. Keep service-role keys and Apps Script tokens server-side; never put them in browser-visible variables, Git, or logs. Until both test database and test Apps Script targets are independently confirmed, leave the Preview write/file guard enabled.

## Review release

1. Review the consolidated implementation PR, its evidence in ADR 0008, and all required GitHub checks.
2. Confirm the Vercel Preview is built from the exact PR head and uses the designated test database and test Apps Script deployment.
3. Run authenticated acceptance in Preview: create/edit a disposable case; validate workflow transitions with and without optional dispatch proof; test selected-folder Picker and generation; exercise CSV and recovery only against disposable targets.
4. Confirm no production schema, data, Drive file, Apps Script deployment, or Vercel Production deployment changed during review.

## Production rollout — requires separate explicit approval

Before acting on production, obtain the user's explicit approval for the specific migration, merge, and deployment steps. Then:

1. Use a clean release worktree. This repository currently has no `supabase/config.toml`; if using the Supabase CLI, run `npx supabase init` there and review its generated local config before linking. Sign in with `npx supabase login`, then explicitly link production with `npx supabase link --project-ref pjthtvkzuthxwpvcdqxy`. Do not put access tokens or database passwords in shell history or the repository.
2. Record current `main`, Vercel Production deployment, production Supabase project/schema, migration history, row counts, RLS/policies, and function signatures. Re-run the production RPC and schema parity preflight; do not rely on historical observations in ADR 0008.
3. Compare migration histories using `npx supabase migration list --remote`. **The current history divergence is known and unresolved.** First reconcile every remote timestamp to the exact reviewed SQL/schema state; do not use `migration repair` as a shortcut. Only after that review, inspect `npx supabase db push --dry-run --remote`. Both commands must identify `pjthtvkzuthxwpvcdqxy`; stop if the target differs, history remains ambiguous, or the dry run includes any unreviewed file. Supabase CLI v3 targets local by default, so keep `--remote` explicit.
4. Take and verify a current database backup and document the recovery point. Preserve existing records, history, document references, IDs, and Drive files.
5. Stop on schema drift, duplicate identity, missing privileges, or unknown migration history. Reconcile manually applied schema changes through a separately reviewed migration; do not use `migration repair` to guess or suppress mismatches.
6. After separate explicit approval, apply only the reviewed additive migrations in order with `npx supabase db push --remote`. Do not execute `supabase_schema.sql` against an existing database.
7. Verify function definitions and EXECUTE grants, RLS and policies, constraints/indexes, migration records, and before/after row counts. Run rollback-only workflow/edit/restore fixtures where authorized; verify production data remains unchanged by those fixtures.
8. Merge the approved PR only after all required checks and migration evidence pass. Deploy the exact reviewed commit to Vercel Production only after separate approval.
9. Run a protected, read-only production smoke check first. Any write smoke check requires its own explicit approval and a disposable, clearly identified record. Confirm Apps Script deployment version and Drive output separately.
10. Record deployment IDs, commit, migration results, checks, and rollback decision in ADR 0008. Never claim success until each external system is independently verified.

## Rollback

Stop writes if postflight differs from the reviewed expectation. Roll application code back to the last verified deployment. Database rollback must follow the migration-specific instructions and dependency order in the migration/ADR; retain existing data and historical documents. Do not blindly drop additive columns, functions, or tables after they may contain data. Restore from backup only after a separate preflight and explicit approval.

## Integration credentials

Use the environment variable names in `.env.example` and the deployment's secret store. Do not put private values in this guide, GitHub, browser-visible variables, screenshots, or logs. Picker API keys must have appropriate restrictions; backend tokens remain server-only. Configure Preview and Production independently.
