# BRANDEX WORKFLOW — Vercel Deployment & Architecture Guide

## 1. Where Are The Files? (All in this Repo!)
All pages and application logic are **100% self-contained inside this repository**. There are **no external repositories linked**.

### Repository Structure:
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
|---------|-------|-------|
| **Framework Preset** | `Next.js` | Auto-detected |
| **Root Directory** | `./` | Leave as default `./` |
| **Build Command** | `npm run build` | Default `next build` |
| **Output Directory** | `.next` | Default Next.js output |
| **Node.js Version** | `20.x` or `22.x` | Recommended |

### Environment Variables on Vercel:
Because the app is **100% Standalone**, **NO database keys or Supabase secrets are required**. 
Everything runs with zero network lag, zero latency, and zero risk of database credential exposure.

*Optional*:
- `NEXT_PUBLIC_APPS_SCRIPT_URL`: *(Optional)* If you connect Google Apps Script to auto-generate TM-1/TM-48 Google Docs in Google Drive. If omitted, the app uses the built-in default Apps Script URL in `lib/data.ts`.

---

## 3. Security & Speed Optimizations

1. **Zero Database Credential Leaks**:
   - The app has been audited to remove external database round-trips. No anon keys, service roles, or database passwords can be intercepted or abused.
2. **Instant 0ms Page Load**:
   - Client and trademark records are loaded instantly from the embedded Standalone DB engine (`lib/standalone-db.ts`) with zero network latency.
3. **Data Portability & 1-Click Backups**:
   - Click **STANDALONE** in the top navbar or **Backup JSON** on the Records page to download a timestamped full JSON backup of all clients, records, timelines, and documents.
   - Restore or migrate your data on any device anytime using the **Import JSON Backup** feature.
   - Export filtered tables to standard CSV format anytime.

---

## 4. Key Features

- **Automatic Selection Slider**: Auto-rotating showcase on the Home Page highlighting the 4 core workflow tools with interactive pause-on-hover.
- **Screen Wipe Transition**: High-impact Neo-Brutalism wipe animation when launching the Records Dashboard from the Home Page.
- **Record Management & Timelines**: Full tracking of trademark filings, stages (DELIVERED, DISPATCHED, APPROVED, REVIEW, PENDING), and case history.
- **Client Directory**: Manage client codes, CNICs, addresses, and instant auto-fill into applications.

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
> **Important**: Google Apps Script web apps do NOT update their permissions until you deploy a **New version**!
1. In the top right, click **Deploy** > **Manage deployments**.
2. Click the **Edit (pencil icon)** on your Active deployment.
3. In the **Version** dropdown, change from the existing number to **"New version"**.
4. Click **Deploy**.
5. Done! The web application can now create and mailmerge Google Docs seamlessly.

