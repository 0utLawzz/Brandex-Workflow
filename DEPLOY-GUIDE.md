# Deployment and production rollout

This guide describes the guarded release sequence. It is not authorization to change production. The active audit and exact migration inventory are maintained in [ADR 0008](audit/0008-consolidated-2026-11-24-audit-and-fixes.md).

## Architecture

- Vercel hosts the Next.js application and server-side API routes.
- Supabase PostgreSQL is the operational database. The tracked files in `supabase/migrations/` are additive migrations; `supabase_schema.sql` is a clean-install schema, not a production reset script.
- Google Apps Script (`Code.gs`) is deployed separately and writes generated documents to Google Drive. GitHub/Vercel deployments do not update Apps Script.
- Preview must have separately reviewed test Supabase and Apps Script targets. Do not assume Preview is isolated from production based on its URL or Ready status.

## Verified environment baseline — 2026-11-28

- GitHub `main` is PR #9 merge `6ec9f6b`; the Production Vercel deployment is still that revision at `https://brandex-workflow-irkyvboie-projectsb.vercel.app`.
- The current authenticated PR #10 Preview is `https://brandex-workflow-git-audit-baseline-2026-11-24-projectsb.vercel.app`. Its core read-only UI is verified: login succeeds, Records shows two populated cases and hides eight incomplete legacy rows without deleting them, Clients shows one synthetic client, Settings shows shared series, and Create Case loads its client/series choices. Preview writes and Drive operations remain guarded until the separate QA Apps Script endpoint/token and approved test-folder write access are confirmed.
- Production Supabase `pjthtvkzuthxwpvcdqxy` has 485 trademark records, 139 history rows, 42 document rows, 8 clients and 5 series across only 5 public tables. It lacks `workspace_settings`, all recovery tables, the current app's 10 queried columns, and its application workflow/recovery RPCs. Its core tables have RLS with no policies; four still grant `SELECT` to `anon`/`authenticated`, so RLS must remain enabled and policy state must be rechecked.
- A PII-free production identity preflight found 460/485 cases missing at least one identity part, 25 with complete identities, zero duplicate complete case identities, 476 cases without a unique client match, and one duplicated nonempty client-code group. Do not bulk-assign `client_id` or infer missing case identities; existing rows need a reviewed case-by-case mapping before any production data migration.
- The production duplicate is a normalized client-code collision. Production has no `clients_unique_normalized_code` index; the isolated test project does. Migration `20261124055816_atomic_client_identity_guards.sql` explicitly aborts while this collision exists. Stop before applying it to production; resolve the duplicate through an approved data plan and re-run the exact preflight first.
- The review repository has 23 SQL migration files. Production has 3 migration-history entries; the isolated test project `clviaughxebohniopzyg` has 21. Their names/timestamps do not map one-to-one to the repository files. Supabase's migration-list command compares timestamps, and `db push` applies every migration it considers pending. **Do not run `db push` or `migration repair` against either hosted database until a reviewed migration-lineage map and exact dry run reconcile this divergence.** A dry-run listing many old migrations is a stop condition, not a release plan. See the [Supabase migration-list reference](https://supabase.com/docs/reference/cli/supabase-migration-list) and [db push reference](https://supabase.com/docs/reference/cli/supabase-db-push).
- The test project has the expected app columns and three core workflow RPCs plus the recovery/import/transfer functions; its 9 tables have RLS, no policies, and service-role-only table grants. It currently has 10 trademark rows (two synthetic cases and eight original blank regression rows), one synthetic client, one Settings row and the required test schema. It supports read-only and authenticated UI checks; it does not yet support real Picker/Drive acceptance because the separate QA Apps Script deployment and execution-account folder access are not configured.

### Preview isolation requirements

Before the app can write in Preview, configure Preview-only environment values to point at the test project, including `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, server-only `SUPABASE_SERVICE_ROLE_KEY`, and `PREVIEW_WRITE_PROJECT_REF=clviaughxebohniopzyg`. Configure a distinct non-production `PREVIEW_APPS_SCRIPT_URL` and matching `APPS_SCRIPT_RECORDS_TOKEN`; it must differ from `PRODUCTION_APPS_SCRIPT_URL`. Configure the restricted Google Picker client, API key, and project number. Keep service-role keys and Apps Script tokens server-side; never put them in browser-visible variables, Git, or logs. Until both test database and test Apps Script targets are independently confirmed, leave the Preview write/file guard enabled.

#### No-code Google Picker setup for the audit Preview

The Picker is intentionally fail-closed. If any of the three public values is missing, Case Edit and Client Edit show `Google Drive Picker is not configured` and do not write anything. To prepare the isolated Preview test:

1. In Google Cloud Console, open the same project used by the Apps Script/Drive test, enable **Google Picker API** and **Google Drive API**, and open **APIs & Services → Credentials**.
2. Create or reuse a **Web application OAuth client ID**. Add the audit Preview origin (without a path) to its authorized JavaScript origins: `https://brandex-workflow-git-audit-baseline-2026-11-24-projectsb.vercel.app`.
3. Create a restricted API key and restrict it to the Picker API. Copy the OAuth client ID, API key, and the numeric Google Cloud project number; these are the three values, not passwords.
4. In Vercel → `brandex-workflow` → Settings → Environment Variables, add each value only to the `audit-baseline-2026-11-24` Preview branch under the exact names `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_PICKER_API_KEY`, and `NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER`. Do not add them to Production or Development.
5. Redeploy the audit Preview branch from its branch deployment page. Do not use the environment-variable page's default redeploy if it selects Production.
6. Open the protected Preview, edit the disposable test case, choose a folder inside the approved QA Drive folder, and confirm that the app reports a saved destination. The server independently checks that both the Picker user and Apps Script execution identity can add children before saving `drive_folder_id`.

Do not paste API keys, OAuth client secrets, Apps Script tokens, or service-role keys into GitHub, this guide, screenshots, or chat. The current audit evidence confirms the Picker control and safe missing-config guard; real Picker authorization and Drive writes remain pending until this checklist is completed.

### Authentication rate limiting

The Vercel login handler and protected HTTP Basic requests use `@vercel/firewall` with the configured `VERCEL_AUTH_RATE_LIMIT_ID`. Configure the Vercel Firewall in the project before enabling protected Vercel authentication:

1. Add a custom rule with the `@vercel/firewall` condition and rate-limit ID `brandex-auth-attempts` (or the exact ID placed in `VERCEL_AUTH_RATE_LIMIT_ID`).
2. Set a fixed window of 10 minutes, a limit of 10 attempts per client IP, and the Too Many Requests/429 action. This shared bucket counts each login POST and each protected HTTP Basic request. The normal browser session-cookie flow does not submit Basic credentials.
3. Set `VERCEL_AUTH_RATE_LIMIT_ID` in the appropriate Vercel environment. In Vercel, a missing ID, missing rule, WAF error, or timeout returns 503 and prevents authentication. Local non-Vercel development skips this platform check.
4. On Preview, enable Protection Bypass for Automation and automatic exposure of Vercel system environment variables as required by the [Vercel Firewall SDK preview setup](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting-sdk#test-in-a-preview-deployment). Verify successful sign-in, repeated failures, and 429 on the isolated Preview before relying on this control.
5. Review the project's current Firewall plan and rules before changing Production. Vercel tracks counters per region, so traffic spread across regions can exceed a single-region threshold. Review [rate-limit behavior and limits](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting) and [SDK configuration](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting-sdk). Production Firewall changes remain subject to separate explicit approval.

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
