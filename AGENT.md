# Brandex Workflow contributor and agent rules

This is the repository's single authoritative instruction file. Read it before changing code. Use [ADR 0008](audit/0008-consolidated-2026-11-24-audit-and-fixes.md) as the current evidence-based audit, acceptance, and rollout log; ADRs 0001–0007 preserve the decisions and history that led to the current design.

## Product and data boundaries

- Supabase PostgreSQL is the operational source of truth for client profiles, cases, workflow history, document references, shared settings, and recovery state. Google Apps Script and Drive handle document generation and files. Do not add operational Google Sheets reads or writes.
- `lib/standalone-db.ts` is an explicit unconfigured/local demo mode. It is not an offline synchronization system or production data source.
- Preserve existing production rows, history, document references, assets, and Drive folders. Never renumber records, infer missing identity, or rename/move/delete Drive folders without explicit user approval.
- Keep case identity segments independent: selected series, client code, and case number form the visible `SERIES-CLIENTCODE-CASENO` reference. Client prefix is a separate folder/file naming attribute.
- Keep generation progress, workflow status, and legal filing stage separate. Current workflow: In Review → Approved or Rejected → Dispatched → Delivered. Rejected cases cannot be dispatched. Dispatch requires a date and tracking ID or note; dispatch proof is optional. Delivery requires its date, recipient, and receipt. Preserve a supplied dispatch proof in the selected case's Dispatch folder and same-case document reference.
- Use `lib/merge-contract.ts` as the canonical application/API/template field mapping. Keep `Code.gs` synchronized through `node scripts/sync-merge-contract.mjs --check`.

## Security and database changes

- Never expose Supabase service-role keys, Apps Script tokens, OAuth refresh tokens, or other secrets in client code, logs, screenshots, commits, or browser storage. Public `NEXT_PUBLIC_` values must be safe for browser exposure.
- Keep RLS enabled; do not add permissive public policies. Sensitive writes use authenticated server routes and narrowly granted database functions. Check `SECURITY.md` and the current ADR evidence before changing access controls.
- Keep preview and production Supabase/Apps Script targets isolated. A deployment marked Ready does not prove its configured database, authenticated UI, or generated files are correct.
- Before changing a data contract or external integration, update ADR 0008 first. Database changes must be additive and reviewed, tested on a disposable PostgreSQL 17 database, and include preflight, verification, and rollback instructions. Never apply a production migration, write production data, merge the release PR, or deploy production without the user's separate explicit confirmation.
- Validate external URLs, folder ownership, file type/size, identity and same-case relationships on the server. Keep request bodies bounded and reject ambiguous identities instead of guessing.

## Implementation and verification

- Preserve existing user changes. Check branch, remote, working tree, and current `main` before editing. Do not trust historical checkboxes or a deployment's old status as current evidence.
- Keep changes reviewable. The user has authorized small commits and pushes to the consolidated review branch for backup. Never push to `main` or merge automatically.
- Use existing dependencies and patterns unless a concrete requirement calls for a change. Before removing code or documentation, search imports, scripts, workflows, generated contracts, and links; remove only material shown to be obsolete.
- Run relevant tests and checks when requested by the active task. Report exact command results and distinguish local source/database tests from GitHub CI, hosted test, protected Preview, Apps Script deployment, Drive output, and production acceptance.
- Update ADR 0008 with evidence and PASS/PARTIAL/FAIL/PENDING status. Do not claim browser, hosted, or production behavior from unit tests or build output.
- Keep UI accessible, responsive, and respectful of reduced-motion settings. Do not invent business data or silently change case identity during display, filtering, CSV import, backup, or restore.

## Local development

Supported runtime: Node.js `>=22.13.0 <25` and npm `>=10 <12`.

```bash
npm ci
npm run dev
```

See [README.md](README.md) for setup and [DEPLOY-GUIDE.md](DEPLOY-GUIDE.md) for guarded rollout steps. Current task status and environment evidence belong in ADR 0008; do not create a parallel progress checklist or status/schema document.
