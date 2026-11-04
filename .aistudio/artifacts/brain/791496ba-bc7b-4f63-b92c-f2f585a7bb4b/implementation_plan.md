# Implementation Plan - Brandex MailMerge & Trademark CMS

## Overview
Enhance Brandex MailMerge & Trademark CMS to include:
1. **Database Integration (Supabase / PostgreSQL)** via `DATABASE_URL` environment variable for storing clients, consultants, and trademark records.
2. **Trademark Application & Acknowledgment**:
   - Required 6-digit Trademark Number / Acknowledgment field validation.
   - Dispatch tracking ID and image upload handling.
   - Status tracking: `ACK_RECEIVED`, `REVIEW`, `DISPATCHED`, `DELIVERED`, `START`, `PROCESSING`, `DONE`, `ERROR`.
3. **Client & Consultant Management**:
   - CRUD interface to add, manage, and store consultant and client names, CNIC, phone numbers, and addresses.
4. **Class Management**:
   - Nice Classification (1–45) with editable and removable class descriptions.
5. **Generation Categories & MailMerge Templates**:
   - Category selector (e.g. Trademark Application TM-1/TM-48, Assignment, Renewal) loading specific form fields and template mailmerge generation options.
6. **Dashboard, KPI Charts & Table Controls**:
   - Attractive KPI charts, search filters, sorting, and pagination (25 to 50 entries per page).
   - CSV / JSON export and import capabilities.

## Proposed Changes

### 1. Database & API Layer (`/lib/db.ts`, `/app/api/...`)
- Implement PostgreSQL client connection using `pg` with `process.env.DATABASE_URL` (Supabase/Neon compatible) with robust fallback/in-memory handling.
- API endpoints for consultants, clients, and trademark records.

### 2. Client & Consultant Management Page (`/app/clients/page.tsx` & `/app/consultants/page.tsx`)
- Dedicated management interfaces for adding and storing clients and consultants in Supabase/PostgreSQL.

### 3. Enhanced Trademark Application & MailMerge (`/app/trademark-application/page.tsx`)
- Generation Category selector (TM-1 / TM-48 Application, Assignment, Renewal).
- Required 6-digit Trademark Number / Acknowledgment validation.
- Dispatch tracking ID, status selector (`ACK_RECEIVED`, `REVIEW`, `DISPATCHED`, `DELIVERED`), and image upload.
- Editable/removable class description.

### 4. Records CMS & Dashboard (`/app/records/page.tsx`)
- 25-50 items per page pagination, column sorting, search filters.
- Record actions: Move record, Export CSV, Import CSV.
- KPI summary cards and distribution charts.

## Verification Plan
- Run `compile_applet` to verify TypeScript and Next.js compilation.
