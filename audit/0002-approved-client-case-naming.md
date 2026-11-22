# ADR 0002: Approved client and case naming rules

- **Date:** 2026-11-22
- **Status:** Accepted
- **Owners:** BrandEx Workflow maintainers
- **Related:** [Implementation commit 473da57](https://github.com/0utLawzz/Brandex-Workflow/commit/473da572b3ca4372cba80644aef30e14fd21eba8)

## 1. Context — what exists today?

The application already manages client and trademark case records, including client identifiers, case references, identity details, workflow statuses, and associated Drive folders. The implementation history includes an update titled "feat: implement BrandEx naming and workflow updates" (commit `473da572b3ca4372cba80644aef30e14fd21eba8`).

The commit summary describes approved client and case naming, per-client-series numbering, CNIC validation, compact records layout, status stages, date pickers, Drive folder conventions, and homepage slider removal.

## 2. Problem — why change?

Client and case references must be predictable and consistent across the application and related filing/document workflows. Ambiguous numbering or identity rules can cause duplicate references, incorrect associations, and disruption to existing records.

## 3. Decision

The user explicitly approved the following rules:

- **Case reference format:** `A005-010`.
- **Numbering:** per-client-series.
- **ID card format:** standard Pakistani CNIC.
- **Approval state:** approved.
- **Preservation requirement:** preserve existing data and working features.

These are the accepted business rules to follow in subsequent work. Do not infer additional meanings for client prefixes or invent new naming rules beyond the approved source requirements.

## 4. Alternatives considered

No alternative numbering or identity model is recorded as approved in the available decision. Do not introduce one without documenting and obtaining approval.

## 5. Impact

Relevant areas include client/case creation, case reference generation, identity validation, records display, and integrations that consume client or case references.

The referenced implementation commit is evidence of a naming/workflow update; this ADR records the user's explicit approval and the rules to preserve in future changes.

## 6. Data and migration plan

Preserve all existing production records. Do not bulk-renumber existing cases or alter existing client identities as part of follow-up work without an explicitly approved, separately documented migration plan.

Preserve existing Google Drive folders and their contents. Do not rename, move, or delete existing folders without explicit approval and a recovery plan.

## 7. Risks and mitigations

- **Risk:** a future change generates references using a global rather than per-client series.  
  **Mitigation:** test reference generation across multiple clients and multiple cases per client.
- **Risk:** existing records are silently renumbered or become detached from their documents.  
  **Mitigation:** preserve current identifiers and validate record-to-document associations.
- **Risk:** CNIC validation rejects legitimate standard-format values or changes stored data unexpectedly.  
  **Mitigation:** test accepted standard CNIC formatting and avoid destructive data normalization.

## 8. Verification

For future changes to these rules, verify:
- New references follow the approved `A005-010` structure and per-client-series numbering.
- CNIC validation follows the standard Pakistani format.
- Existing references, records, and working features remain intact.
- Drive folder links and document associations remain intact.

No new application tests were run as part of recording this historical decision.

## 9. Rollback / recovery

If a future implementation violates these rules, stop further writes, restore the previous application behavior through a reviewed code rollback, and recover any affected data from a verified backup. Never attempt an unreviewed bulk renumbering or folder rename as a quick fix.

## 10. Implementation record

- **Related implementation commit:** `473da572b3ca4372cba80644aef30e14fd21eba8`.
- **Approval recorded:** 2026-11-22.
- **Note:** This ADR documents the accepted rules and preservation constraints; it does not independently assert that every implementation detail has been re-tested.