# Security Policy

## Scope

This project handles trademark client names, CNICs, addresses, case details, and unfiled logo images. Security issues may expose confidential client information.

## Reporting a vulnerability

Please report security issues privately to the repository owner rather than opening a public issue. Include what you found, why it is a security issue, steps to reproduce it, and any suggested fix.

## Current design risks

- Client profiles and most case edits are stored in browser `localStorage`. This is not shared across users or devices and has no server-side access controls.
- Production must have `APP_ACCESS_USER`, `APP_ACCESS_PASSWORD`, and server-only `APPS_SCRIPT_RECORDS_TOKEN` configured. The Next.js middleware applies Basic Auth to app pages and API routes, and the Apps Script proxy attaches the token server-side.
- Apps Script direct `getRecords` requests and all POST actions are rejected unless the request includes the token matching Script Property `RECORDS_ACCESS_TOKEN`. Deploy the updated `Code.gs` and configure that property before relying on this protection; old deployments continue using their old access behavior.
- Use HTTPS for Basic Auth. The shared app login does not provide per-user identity, and browser-local records are not isolated between people sharing an authenticated browser.
- The app's local source changes do not update a live Google Apps Script deployment. Until the script is redeployed and its property configured, its existing public `getRecords` endpoint may still expose Sheet data.
- The Supabase schema file is a draft. It does not provide application authentication or persistence. RLS is enabled without public policies in this branch.
- Trademark logo images are embedded into generated Google Docs; review Apps Script and Drive sharing settings for those documents.
