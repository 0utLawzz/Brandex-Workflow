# Security Policy

## Scope

This project handles trademark client names, CNICs, addresses, case details, and unfiled logo images. Security issues may expose confidential client information.

## Reporting a vulnerability

Please report security issues privately to the repository owner rather than opening a public issue. Include what you found, why it is a security issue, steps to reproduce it, and any suggested fix.

## Current design risks

- Client profiles and most case edits are stored in browser `localStorage`. This is not shared across users or devices and has no server-side access controls.
- The browser calls a Google Apps Script web-app URL. Its `getRecords` action returns Sheet records without an authentication check. Anyone who can reach that endpoint may be able to read the returned client and case information. Restrict access before using it with confidential live data.
- The Supabase schema file is a draft. It does not provide application authentication or persistence. RLS is enabled without public policies in this branch.
- Trademark logo images are embedded into generated Google Docs; review Apps Script and Drive sharing settings for those documents.
