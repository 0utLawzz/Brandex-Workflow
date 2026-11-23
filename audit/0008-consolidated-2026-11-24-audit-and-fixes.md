# ADR 0008 — Consolidated Audit, User Findings and Repository Reset Baseline

**Date:** 2026-11-24  
**Status:** Proposed for evidence-based verification; NO fixes authorized by this document alone  
**Baseline:** GitHub `main` at PR #9 merge `6ec9f6b1d55facf03654bc7c36f2e94b44be90a5`  
**Scope:** PRs #1–#9 + user findings #01–#17 + security, runtime, deployment, data safety, developer experience, documentation and code hygiene.

## Decision — Single source of truth from November 24

This ADR is the *current consolidated work queue* until a subsequent reviewed ADR/release supersedes it. Earlier `AGENT.md`, `AGENT_PROGRESS.md`, PR descriptions and ADRs are **historical evidence**, not automatically current instructions or evidence that work remains undone. Preserve their factual provenance, but never copy unchecked old checkboxes into new tasks. Current source + migrations + live read-only observation + verified tests take precedence. Any conflict must be logged with evidence and resolved before implementing. Do not edit production, migrate data, delete files, merge or deploy during this planning stage.

**Interpretation of status:** CODE FOUND ≠ runtime verified; READY ≠ working; SCREEN VISIBLE ≠ saved/persisted. Label each task VERIFIED / CODE FOUND / PARTIAL / NOT FOUND / NOT TESTED. Do not count the same issue twice.

## PR 1–9 scope reconciliation (initial PR description review, runtime recheck pending)

| PR | Historical scope and merged output | Unclosed or independently testable condition |
|---|---|---|
| #1 | Client & case naming, prefix, numbering, compact Records, legal stages, slider removal/animations, Drive naming source code; production metadata migration reported | Apps Script live version/selected destination and actual generation evidence |
| #2 | Introduced ADR directory and decision/documentation rules | Documentation only |
| #3 | Records-first navigation, compact home, Settings, UI/error states | Breadcrumbs, page density, preserved animation and actual UI acceptance |
| #4 | Phase Two `AGENT.md`, progress and ADR 0004 master scope | Planning only; do not mistake as implementation |
| #5 | Backup v3 manifest, integrity checks, partial-file warnings | Full transactional restore of history/doc references/asset bytes NOT delivered by this PR |
| #6 | Consolidated UI: Records Home, navbar, Settings backup/CSV, Clients UI, footer | Case CSV import paused; layout refinements pending |
| #7 | Reference `N-333-001`, independent series, default IN REVIEW | Shared management was delegated to #8 |
| #8 | Shared Supabase case-series registry, Settings management, guard on Create Case | Table present in production; authenticated behavior and schema correctness need evidence |
| #9 | Extended Edit Case, attachment links, guarded workflow/atomic SQL migration, legal stages | UI was read-only QA tested in authenticated preview; code merged and production READY; production atomic RPCs absent at read-only DB inspection. Verify current runtime before migrations. |

**Previously verified environment evidence (2026-11-24 session):** PR #9 merge Vercel production READY at `6ec9f6b`; Vercel preview READY at PR #9 head `3befe7e`. Production project `pjthtvkzuthxwpvcdqxy` counts observed: 484 cases, 8 clients, 141 history, 42 document refs, 5 series; RLS enabled on those five tables; zero public policies; no `apply_case_workflow_transition` or `apply_case_metadata_update` found there. Disposable project `clviaughxebohniopzyg` has the transition function, after test migrations. Preview READY and prior authenticated read-only UI observation do NOT prove production write success. Do not apply SQL absent tested preflight/rollback and authorization.

## Consolidated user findings #1–#17 — acceptance requirements

The user supplied findings over successive voice recordings. #1–#8 appear in the current chat. #9–#17 were **recovered as summaries**, not word-for-word audio; clarify ambiguities only where decisions affect functionality. Items below are not all confirmed bugs.

| ID | Area | Required behavior / decision to verify |
|---|---|---|
| 01 | Edit Case | All original application fields editable; user observed full field UI and Add Link/Image options. Verify save, refresh, attachments and ownership; don't reimplement already working UI. |
| 02 | Drive destination | Google Drive *folder* Picker (not Add Link/image), persistent per-client/case mapping, server permission validation, generation in selected client folder/controlled case subfolder, existing folders preserved. |
| 03 | Home redirect | After generation complete go to genuine Home with integrated Cases/Records workspace, not merely cosmetic `/` → `/records` redirect; confirm UX distinction. |
| 04 | Breadcrumb | Compact clickable page-path trail under Brandex header, reflecting actual navigation. |
| 05 | Title | Change `Case Record and Workflow Timeline` to concise prominent `Case Record`, retaining functionality. |
| 06 | Simplification/stages | Remove Box 1/2/3/4 clutter/unnecessary explanations. Make All Stages filter work across all records, not just Pending/In Review. |
| 07 | Filtering/sorting | One collapsed Filters control at table top-right (includes consultant/stages); Excel-like per-header sort/filter for date, reference, case, etc. Apply across full dataset, not just displayed page. |
| 08 | Home table & analytics | Columns: selection checkbox; date `DD-MMM-YY` no time; visually distinct series/client-code/case-no separated by dashes without altering identity; thumbnail; wide Case Name with small TM status below; compact Class; separate Workflow Status; separate Legal Case Stage same visual treatment; Applicant with Trading As beneath; six actions in 3x2 rows. Default 50 rows/page (user-adjustable). Add useful, correctly sourced KPIs/monthly applications by appropriate filing date; avoid invented metrics. |
| 09 | Clients Directory | Compact table with prefix, client code, client/S/O, business/consultant, phone/email; sorting/filters; CNIC not shown by default, city secondary; retain Edit/Delete access with protections. Recovered summary, confirm detailed column order against recording if needed. |
| 10 | Create Case | Correct client selection and independent series, client prefix, code, case number; no overwriting one by another. |
| 11 | Form/classification | Simplify labels, numeric classes, correct TM vs copyright reference conventions. |
| 12 | Form sections | Improve headings, date fields, Using Since, consultant fields and documents grouping without dropping fields. |
| 13 | Generation UX | One 0–100 progress indicator reflecting real phases, not fake success; clean instructions; success/error notifications; opt-in sound/tick animation, preserved wipe/fade; compact Drive/TM1/Dossier/Record View actions and working footer/credits. |
| 14 | Mail Merge/API | Permanent canonical field-to-template/API tags for every application field; tested end-to-end mapping to data, templates and generated documents. |
| 15–16 | Settings | Central Settings, remove redundant naming boxes, consistent Series management/delete safeguards, backup/import/export, branding/navigation; Address Label mentioned as *low priority/future* not an automatically approved current feature. Recovered summaries blend #15/#16; exact boundary unknown. |
| 17 | Workflow + Drive output | Review→Approved/Rejected→Dispatched→Delivered/Received with accurate separate timestamps; naming `PREFIX-CLIENTCODE-CASENO` e.g. `X-646-011`; Logo, Documents, Dispatch subfolders; output file names like `X-646-011 APPLICATION_NAME C35`. Preserve original logo, PDF/Excel attachments and dispatch proofs in correct location. **Important conflict:** earlier current reference rule is *Series–ClientCode–CaseNo*, while this folder rule begins *Client Prefix*. Folder naming and case reference must be separate by design and confirmed; never silently rename existing data. |

### Consolidation and conflict rules

- #01 already visually confirmed by user; only persistence and related workflows remain unverified. #03/#08 and #06/#07 are unified UI acceptance sets, not duplicate development tickets.
- #02 and #17 share Drive routing, but distinct responsibilities: choosing destination versus actual folder hierarchy/file placement.
- #05, #06, #07, #08 are presentation changes, not permission for database identity rewrites.
- Original `AGENT.md` said dispatch proof optional; #9 code/ADR 0007 requires it. Treat as *requirement conflict requiring explicit decision* before modifying workflow policy, not an automatic bug.
- Recovered #09–#17 are summaries; keep their provenance and do not imply verbatim precision.

## Technical audit gates before one-go implementation

1. **Scope-to-code matrix:** Map each requirement to actual file/function and PR diff, tests, current production and preview behavior. Record PASS/PARTIAL/FAIL/NOT TESTED with links and reproduction.
2. **Security:** authenticated Next.js boundaries, service role isolation, least privilege, RLS and grants, CSRF/origin protection, rate limiting, user identity, file/URL validation, exposed secrets, OAuth Picker scopes, public access, security advisers. RLS enabled + no policies is encouraging but **not alone full authorization verification**.
3. **Schema & workflow:** compare production tables/indexes/functions with tracked migrations. Test atomic metadata edit, status/history/docs update, concurrency, invalid transitions, retries and existing legacy values in *disposable* environment first.
4. **Functional E2E:** authenticated test workspace covering Home/Clients/Create/Edit/approval/dispatch/delivery, pagination/header sorting, attachments, generation/error/retry, selected Drive folder. Avoid production writes except approved safe smoke operation.
5. **Data safety:** backup v3 completeness, actual Drive file bytes, identity-preserving CSV/JSON, restore history/documents/assets safely with dry-run and ID mapping, no duplicate/overwrite, spreadsheet template field contract.
6. **Deployment:** distinguish GitHub CI, Vercel Preview, Production and Apps Script deployed versions/config; prove no Preview-only fix; production and preview may point to same database, so no write tests without isolation.
7. **Reproducible local dev:** choose one supported package manager+lockfile after examining dependencies, Node version, .gitignore, `.next` and `node_modules` handling, environment templates, clean clone install/build/test and smoke procedures across local, Google AI and Vercel. No credentials in repo.

## One consolidated implementation batch — AFTER audit evidence and user review

**P0:** data safety, atomic production schema mismatch, security issues; test migrations/restore in disposable target, produce backup/preflight/postflight/rollback and request explicit production go/no-go.

**P1:** full-fidelity backup and restore, safe identity CSV round-trip, client/case Drive Picker + validated folder mapping and generated output; robust edit persistence, statuses, attachment tests.

**P2:** Home/Clients/Create Case/Settings presentation changes (#03–#13, #15–16) with current UI reuse, compact table, dropdowns, analytics based on real timestamps, reduced-motion behavior.

**P3 — LAST: Repository hygiene and canonical documentation (explicit user instruction).** Perform dependency/reference analysis before deleting any code. Remove only demonstrably dead code, temp/generated artifacts mistakenly tracked, obsolete references, duplicated modules and contradictory stale documents; *do not* delete active fallback or historical evidence needed for audit/recovery without checking. Retain **one authoritative agent/rules entry point** (`AGENT.md`), one concise current progress/release status document, one current deployment/setup guide, and a compact indexed ADR decision history as required; avoid doc-on-doc duplication and superseded checklists. Update `.gitignore`, installation instructions, naming, structure and CI checks. Git history preserves old commits; archive/delete obsolete prose only once its current value is safely consolidated. Check imports/references and run full test suite/build after removals.

**P4 Final acceptance:** Run clean-clone `npm ci`/tests/lint/typecheck/build, Apps Script syntax, dependency/security scans, protected browser E2E, disposable DB restores/migrations, Drive folder generation, UI cross-device checks. Open **one consolidated review PR** describing all changes, risks, rollback and evidence. Merge only after checks/review, deploy only with explicit production confirmation, post-deploy smoke verify, and tag release. No claim of 'final' without verified acceptance.

## Work-control log

- **2026-11-24:** User approved *future controlled implementation*, but specifically requests **complete audit + merged plan ADR first**; no fixes/code deletion or production changes now.
- The planning branch is `audit-baseline-2026-11-24`. This ADR is a proposed consolidated baseline, not a production release or final audit sign-off.
- **Pending audit evidence:** PR line-by-line patches, full app UI click testing, complete current source-to-schema field mapping, actual Drive Picker/OAuth connectivity, production RPC recheck before migration, security review and clean-clone install.
