# ADR 0001: Adopt Architecture Decision Records

- **Date:** 2026-11-22
- **Status:** Accepted
- **Owners:** BrandEx Workflow maintainers
- **Related:** [Audit folder index](README.md)

## 1. Context — what exists today?

BrandEx Workflow is an active legal practice and trademark management CMS. Its documented architecture includes a Next.js application, TypeScript, Supabase PostgreSQL, a local standalone/localStorage fallback, Google Apps Script document generation, CSV import/export, client and case management, authentication, and file/dispatch-proof handling.

Significant implementation decisions have historically been recorded in a mixture of source commits, project documentation, and conversation-based approvals. There has not been a dedicated, consistently structured decision log in the repository.

## 2. Problem — why change?

When the reason for a change is separated from the code, future debugging, maintenance, review, and team handover become slower. A developer may see what changed but not the previous behavior, the business reason, the data risks, or the recovery plan.

## 3. Decision

Create and maintain this `audit/` directory as the authoritative Architecture Decision Record (ADR) log.

Before every major change, write an ADR documenting:
- What existed before the change
- Why the change is needed
- The selected decision and alternatives
- Expected technical and business impact
- Data/migration implications and risks
- Verification and rollback/recovery plan

After implementation, update the record with actual commit/PR references and test/deployment evidence. New decisions must receive new sequential ADR numbers; accepted records are not silently rewritten.

## 4. Alternatives considered

- **Commit messages only:** rejected because commit messages do not consistently capture context, alternatives, data impact, or rollback.
- **Conversation history only:** rejected because it is not a repository-owned, durable handover record.
- **One continuously overwritten architecture document:** rejected because it obscures how and why decisions evolved.

## 5. Impact

This is a documentation and engineering-process change. It adds an auditable decision history without changing application runtime behavior, database schema, Supabase records, authentication, Google Drive contents, or deployed services.

## 6. Data and migration plan

No data migration. No production records or external files are modified.

## 7. Risks and mitigations

- **Risk:** ADRs become stale.  
  **Mitigation:** update the relevant record after implementation and include commit/verification evidence.
- **Risk:** decisions are recorded as facts before they are verified.  
  **Mitigation:** clearly label assumptions, unknowns, and checks that remain pending.

## 8. Verification

- Confirm the `audit/` directory and index are present in the repository.
- Confirm the template covers context, rationale, decision, impact, data, risks, verification, and rollback.
- Confirm this documentation-only change does not modify application source or production data.

## 9. Rollback / recovery

Revert the documentation commit or remove the ADR files if this policy is formally withdrawn. No application or data rollback is required.

## 10. Implementation record

- **Implementation:** Added `audit/README.md` and this ADR on branch `docs/architecture-decision-records`.
- **Runtime impact:** None; documentation only.
- **Verification:** Repository file creation is the verification available for this documentation change. Application tests were not run because no application code changed.