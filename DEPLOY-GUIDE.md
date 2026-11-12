# BRANDEX WORKFLOW — Vercel & Production Deployment Guide

## 1. Architecture Overview

Brandex Workflow is a full-featured Legal Practice CMS for Brandex Law Associates built on Next.js 15 (App Router).

### Persistence & Storage Tiers
1. **Primary Cloud Database (Supabase PostgreSQL):**
   - Tables: `trademark_records`, `trademark_history`, `trademark_documents`, `clients`.
   - Stores all trademark filings, case status transitions, courier dispatch tracking, and uploaded proof documents/receipts.
2. **Local Sovereignty (Browser Engine):**
   - Implemented via `lib/standalone-db.ts` to ensure 0ms latency and uninterrupted operation even during intermittent internet connectivity.
3. **Document MailMerge Backend:**
   - Google Apps Script (`Code.gs`) generates official Form TM-1 and TM-48 documents directly in Google Drive.

---

## 2. Deploying to Vercel (Step-by-Step)

### Option A: Deploy via GitHub Integration (Recommended)

1. **Commit and Push Code to GitHub:**
   ```bash
   git add .
   git commit -m "feat: complete brandex cms with supabase persistence, dispatch receipts and clean UI"
   git push origin main
   ```

2. **Import into Vercel:**
   - Go to [vercel.com](https://vercel.com) and log in.
   - Click **Add New...** → **Project**.
   - Select your GitHub repository (`0utLawzz/Brandex-Workflow`).

3. **Configure Project Settings in Vercel:**
   - **Framework Preset:** `Next.js` (Automatically detected).
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Node.js Version:** `20.x` or `22.x`

4. **Add Environment Variables:**
   Under the **Environment Variables** section, add the following key-value pairs:

   | Key | Description | Example / Location |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://your-project.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon public key | `eyJhbGciOi...` |
   | `APP_ACCESS_USER` | Staff login username | `IT` or `admin` |
   | `APP_ACCESS_PASSWORD` | Staff login password | `YourStrongPassword` |
   | `APPS_SCRIPT_RECORDS_TOKEN` | Secret token matching Script Property | `your-secret-token` |
   | `NEXT_PUBLIC_APPS_SCRIPT_URL` | Google Apps Script Web App URL | `https://script.google.com/macros/s/.../exec` |
   | `NEXT_PUBLIC_SHEET_URL` | Google Sheet URL | `https://docs.google.com/spreadsheets/d/...` |

5. **Deploy:**
   - Click **Deploy**. Vercel will install dependencies, build the Next.js production bundle, and publish your site with automatic SSL and global CDN caching.

---

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI globally:
   ```bash
   npm i -g vercel
   ```
2. Log in and deploy from project directory:
   ```bash
   vercel
   ```
3. Deploy to production:
   ```bash
   vercel --prod
   ```

---

## 3. Database Schema Setup in Supabase

1. Open your Supabase Dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project → Navigate to **SQL Editor**.
3. Open `supabase_schema.sql` from this repository, copy its contents, paste them into the SQL Editor, and click **Run**.
4. The script creates:
   - `trademark_records` (including `dispatched_image`, `dispatched_doc_name`, `dispatched_doc_type`, `receipt_image`)
   - `trademark_history` (audit logs of stage transitions)
   - `trademark_documents` (file attachments, airway bills, receipts)
   - `clients` (client ledger profiles)
   - Row Level Security (RLS) policies allowing secure authenticated access.

---

## 4. Google Apps Script Configuration

1. Open your Google Spreadsheet for trademark records.
2. Go to **Extensions** → **Apps Script**.
3. Paste the contents of `Code.gs` from this repository.
4. Under **Project Settings** (gear icon) → **Script Properties**, add:
   - Property: `RECORDS_ACCESS_TOKEN`
   - Value: The exact same secret value as your `APPS_SCRIPT_RECORDS_TOKEN`.
5. Click **Deploy** → **New Deployment** → Type: **Web App**:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the Web App URL and set it as `NEXT_PUBLIC_APPS_SCRIPT_URL`.

---

## 5. Security Checklist

- [x] All database mutations and sensitive operations run securely.
- [x] Passwords and API tokens are never exposed in client bundles (`process.env.APP_ACCESS_PASSWORD`).
- [x] Protected routes require authentication via `middleware.ts`.
- [x] PapaParse parses CSV files safely with zero infinite-loop risks.
- [x] Dispatch receipts and documents are stored as verified data URLs or Supabase records with size limits (up to 12MB).
