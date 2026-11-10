# BRANDEX WORKFLOW — Vercel Deployment & Architecture Guide

## 1. Where Are The Files? (All in this Repo!)

All pages and application logic are **100% self-contained inside this repository**. There are **no external repositories linked**.

### Repository Structure

```
Brandex-Workflow2/
├── app/
│   ├── page.tsx                     # CMS Home (Automatic Slider + Screen Wipe Transition)
│   ├── records/
│   │   └── page.tsx                 # Trademark Records & Timeline Dashboard
│   ├── trademark-application/
│   │   └── page.tsx                 # Trademark Application Form Generator
│   ├── clients/
│   │   └── page.tsx                 # Client Directory & Profile Management
│   ├── components/
│   │   ├── Navbar.tsx               # Top Navigation & Quick Switcher
│   │   ├── DataBackupModal.tsx      # 1-Click JSON Backup Export / Restore / Reset
│   │   └── Footer.tsx               # Neo-brutalist Footer
│   ├── layout.tsx                   # Root HTML Layout & Meta Tags
│   └── globals.css                  # Tailwind CSS Styles
├── lib/
│   ├── standalone-db.ts             # In-App Standalone Engine (Zero Latency & 100% Offline)
│   └── data.ts                      # Nic-Classes & Govt Portals Configuration
├── public/                          # Static Assets & Thumbnails
├── package.json                     # Next.js 15 & Dependencies
├── next.config.ts                   # Next.js Configuration
└── DEPLOY-GUIDE.md                  # This Deployment & Architecture Guide
```

---

## 2. Vercel Deployment Settings

When importing `Brandex-Workflow2` into Vercel:

| Setting | Value | Notes |
| --------- | ------- | ------- |
| **Framework Preset** | `Next.js` | Auto-detected |
| **Root Directory** | `./` | Leave as default `./` |
| **Build Command** | `npm run build` | Default `next build` |
| **Output Directory** | `.next` | Default Next.js output |
| **Node.js Version** | `20.x` or `22.x` | Recommended |

### Hostinger Node.js Upload

For Hostinger plans with Node.js app support, upload a source archive rooted at the project files. Use the `Next.js` preset, Node.js `22.x`, root directory `./`, build command `npm run build`, and output directory `.next`. The start script runs the standalone server and uses the port assigned by the hosting platform.

Include `app/`, `lib/`, `public/`, `middleware.ts`, `package.json`, the lockfile, and the Next.js configuration files. Do not include `.env`, `.git/`, `.next-dev/`, or `node_modules/`. Set `APP_ACCESS_USER`, `APP_ACCESS_PASSWORD`, and `APPS_SCRIPT_RECORDS_TOKEN` as Hostinger runtime environment variables; never expose the token with a `NEXT_PUBLIC_` prefix. Optionally set `NEXT_PUBLIC_APPS_SCRIPT_URL` before building to override the built-in Apps Script endpoint. Use HTTPS.

Before enabling production access, open the Apps Script project settings and add the Script Property `RECORDS_ACCESS_TOKEN` with the exact same secret as `APPS_SCRIPT_RECORDS_TOKEN`. Deploy a new web-app version after updating `Code.gs`. The Records page and application form now call same-origin Next.js API routes; those routes attach the secret server-side. The Apps Script `getRecords` GET action and all POST actions reject requests without that secret. A live deployment is not protected until the property and new script version are in place.

### Current data storage and environment variables

This app is **not connected to Supabase for persistence**. Client profiles and CMS changes are saved in the current browser's `localStorage`; each browser/device has a separate copy. Initial application submissions also call Google Apps Script, which writes to the configured Google Sheet and generates Drive documents. The Records page reads that Apps Script feed and combines it with the current browser's local records.

Hostinger runtime variables do not replace browser storage behavior. If you override `NEXT_PUBLIC_APPS_SCRIPT_URL`, set it in the build environment because `NEXT_PUBLIC_` values are embedded in the client bundle. `NEXT_PUBLIC_SHEET_URL` is not currently used by the page links, which still point to the configured Sheet directly.

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `DATABASE_URL` are not currently used by the app's persistence flow. Setting them will not move records to Supabase. Never put a Supabase service-role key or database password in a `NEXT_PUBLIC_` variable or browser bundle.

---

## 3. Security & Speed Optimizations

1. **Browser-local data**:
   - `lib/standalone-db.ts` uses browser `localStorage`. It is not a shared server database and can be cleared with browser data.
2. **Data Portability & 1-Click Backups**:
   - Click **STANDALONE** in the top navbar or **Backup JSON** on the Records page to download a timestamped full JSON backup of all clients, records, timelines, and documents.
   - Restore or migrate your data on any device anytime using the **Import JSON Backup** feature.
   - Export filtered tables to standard CSV format anytime.

---

## 4. Key Features

- **Automatic Selection Slider**: Auto-rotating showcase on the Home Page highlighting the 4 core workflow tools with interactive pause-on-hover.
- **Screen Wipe Transition**: High-impact Neo-Brutalism wipe animation when launching the Records Dashboard from the Home Page.
- **Record Management & Timelines**: Full tracking of trademark filings, stages (DELIVERED, DISPATCHED, APPROVED, REVIEW, PENDING), and case history.
- **Client Directory**: Manage client codes, CNICs, addresses, and instant auto-fill into applications.

### Supabase migration status

`supabase_schema.sql` and the setup modal describe an earlier proposed schema, but the running app does not use it. The schema does not cover all CMS fields. Its previously included example policies granted unrestricted access to anyone with the public anon key; those policies have been removed here, and the current draft leaves RLS enabled with access denied until reviewed policies are added. Do not run it as a production migration. A safe migration needs an agreed field mapping, an authentication and access policy design, and a one-time import plan for existing Sheet and browser-local records. No live data was migrated by this repository review.

---

## 5. Troubleshooting: "Specified permissions are not sufficient to call DocumentApp.openById"

If you encounter this error during document generation:
`❌ Request failed: Specified permissions are not sufficient to call DocumentApp.openById. Required permissions: https://www.googleapis.com/auth/documents`

This occurs because your deployed Google Apps Script Web App was deployed without the Google Docs OAuth scope authorized on your Google account. Follow these 4 steps (takes 2 minutes):

### Step 1: Enable the manifest file in Google Apps Script

1. Open your Apps Script Project at [script.google.com](https://script.google.com).
2. On the left sidebar, click **Project Settings** (⚙️ gear icon).
3. Check the box: **"Show 'appsscript.json' manifest file in editor"**.

### Step 2: Ensure `appsscript.json` has `auth/documents`

1. Go back to the **Editor** (`< >` code icon) and click on **appsscript.json**.
2. Verify that `oauthScopes` includes `https://www.googleapis.com/auth/documents`:

```json
{
  "timeZone": "Asia/Karachi",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
  ]
}
```

### Step 3: Trigger the Google Authorization Prompt

1. In the Editor, open **Code.gs**.
2. From the function dropdown in the top toolbar, select `authorizeScript`.
3. Click the **Run** button.
4. Google will show: **"Authorization required"**.
5. Click **Review permissions** -> Select your Google Account -> Click **Advanced** -> Click **Go to Brandex Law Associates (unsafe)** -> Click **Allow**.
6. Check the Execution log — it will display: `✅ DocumentApp & DriveApp permissions authorized successfully!`.

### Step 4: Deploy as a "New version" (CRITICAL!)
>
> **Important**: Google Apps Script web apps do NOT update their permissions until you deploy a **New version**!

1. In the top right, click **Deploy** > **Manage deployments**.
2. Click the **Edit (pencil icon)** on your Active deployment.
3. In the **Version** dropdown, change from the existing number to **"New version"**.
4. Click **Deploy**.
5. Done! The web application can now create and mailmerge Google Docs seamlessly.
