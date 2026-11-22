# Architecture Decision Records (ADRs)

This folder is the durable decision log for BrandEx Workflow. It explains what the system was, why a significant change was needed, what was decided, and how the decision can be verified or reversed.

## Rules

1. **Before a major change:** create an ADR before implementation. Do not begin a high-impact code, database, authentication, storage, data-model, workflow, or deployment change until its decision note exists.
2. **After implementation:** update the ADR with the actual implementation commit/PR, verification performed, and any deviations from the original plan.
3. **Preserve history:** never silently rewrite an accepted decision. If a decision changes, create a new ADR that supersedes the earlier one.
4. **Protect production:** document data impact, compatibility, migration/backfill, backup, and rollback considerations. Prefer additive and reversible changes. Do not renumber existing records or rename/move/delete existing Drive folders without explicit approval.
5. **Be factual:** distinguish verified facts from assumptions and open questions. Link relevant code, issues, pull requests, commits, and test evidence where available.
6. **Keep records readable:** write ADRs in clear English so a future developer or team member can understand the reasoning without needing the original conversation.

## What counts as a major change?

- Database schema, migrations, RLS, authentication, authorization, or session handling
- Client/case identity, numbering, naming, status, or workflow rules
- Google Drive / Apps Script integration, document generation, file or image storage
- Data import/export, synchronization, backup/restore, or source-of-truth behavior
- Application architecture, major dependencies, deployment, or security controls
- Any change that can affect existing production data or user workflows

Small isolated bug fixes and visual-only adjustments do not normally need a new ADR unless they alter a system contract or carry meaningful risk.

## Naming and numbering

Use sequential, zero-padded identifiers and descriptive kebab-case filenames:

`0001-adr-process.md`, `0002-approved-client-case-naming.md`

Do not reuse an ADR number. Keep the date and status inside each record.

## Required ADR template

Copy this template for each new decision:

```markdown
# ADR NNNN: Short decision title

- **Date:** YYYY-MM-DD
- **Status:** Proposed | Accepted | Superseded | Rejected
- **Owners:** BrandEx Workflow maintainers
- **Related:** issue / PR / commit / ADR links

## 1. Context — what exists today?
Describe the current behavior, architecture, data shape, and relevant constraints.

## 2. Problem — why change?
Explain the user/business need and the risks of doing nothing.

## 3. Decision
State the selected approach and important rules precisely.

## 4. Alternatives considered
List realistic alternatives and why they were not selected.

## 5. Impact
Describe affected modules, APIs, database tables, integrations, users, and compatibility.

## 6. Data and migration plan
Explain whether existing data changes, how it is protected, and how migration/backfill is handled. State "No data migration" when applicable.

## 7. Risks and mitigations
List meaningful failure modes and how they are controlled.

## 8. Verification
List tests, checks, and evidence required or completed. Do not claim checks that were not run.

## 9. Rollback / recovery
Explain how to revert safely, including database or external-system recovery where relevant.

## 10. Implementation record
Add implementation commit(s), PR, deployment status, and any deviations after the work is complete.
```

## Current index

- [ADR 0001: Adopt Architecture Decision Records](0001-adr-process.md)
- [ADR 0002: Approved client and case naming rules](0002-approved-client-case-naming.md)
- [ADR 0003: Initial system architecture baseline](0003-initial-architecture-baseline.md)

New ADRs should be added to this index.