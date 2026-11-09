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
