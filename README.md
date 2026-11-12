# Brandex Workflow — Legal CMS & Trademark Management System

[![Next.js](https://img.shields.io/badge/Next.js-15.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Cloud%20Database-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

A modern, high-performance Legal Practice CMS designed for **Brandex Law Associates** to manage trademark registrations, case records, courier dispatch proofs, client ledgers, and automated IPO Form TM-1 / TM-48 document generation.

---

## 🌟 Key Features

### 1. Dual-Sovereignty Architecture (Supabase Cloud + Local Standalone)
- **Primary Source of Truth:** Centralized cloud persistence using **Supabase PostgreSQL** (`trademark_records`, `trademark_history`, `trademark_documents`, `clients`).
- **Local Sovereignty Fallback:** Complete offline capability via `localStorage` in `lib/standalone-db.ts` with zero-latency instant rendering and automatic synchronization.
- **Resilient Fallback:** Automatically degrades gracefully if offline and syncs back when connectivity resumes.

### 2. Dispatch Tracking & Proof of Sending
- **Courier Booking & Airway Bill Uploads:** Attach dispatch booking receipts, consignment notes (TCS, Leopards Courier, Pakistan Post, DHL), and airway bills as either **images (PNG, JPG, WEBP)** or **PDF documents** (up to 12MB).
- **Proof Viewer Modal:** Full-screen inspector to review receipts or embedded PDFs with one-click **Download File** capability.
- **Workflow Pipeline:**
  $$\text{Pending / In Review} \longrightarrow \text{Approved / Rejected} \longrightarrow \text{Dispatched (with Proof)} \longrightarrow \text{Delivered}$$

### 3. Bulletproof CSV Import & Export (PapaParse)
- **Zero-Bug CSV Engine:** Replaced fragile regex with `PapaParse` to eliminate array boundary issues (`RangeError: Invalid array length`). Handles quoted commas, empty columns, multiline text, and byte-order marks.
- **Fuzzy Header Matching:** Automatically maps column headers regardless of naming (e.g. `Mark Name`, `Folder`, `Case Name`, `Applicant`, `TM No`, `Class`, `Tracking ID`).
- **Sample Demo Templates:** One-click download of demo CSVs directly from the UI:
  - `public/sample_brandex_records.csv`
  - `public/sample_brandex_clients.csv`

### 4. Client Profiles & Ledger Directory
- Manage client codes, applicant names, father names, trading entities, CNICs, addresses, and assigned law firms.
- Instant auto-fill inside the Trademark Application Generator for rapid filing.

### 5. Document MailMerge & Generation
- Integrated with Google Apps Script backend (`Code.gs`) to generate formatted Word documents (Form TM-1 and TM-48) in Google Drive with authorization proxies.

### 6. Authentication & Security
- In-app staff login screen (`/login`) with cookie session verification (`brandex_auth`).
- Server-side API proxies for Google Apps Script and database credentials—no secrets exposed to client browsers.

---

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── applications/route.ts    # Secure submission proxy
│   │   ├── auth/                    # In-app login and logout API
│   │   └── records/route.ts         # Secure records fetch proxy
│   ├── clients/page.tsx             # Client Ledger & Directory
│   ├── components/
│   │   ├── Navbar.tsx               # Header Navigation
│   │   ├── Footer.tsx               # Neobrutalist Footer
│   │   └── DataBackupModal.tsx      # Full JSON backup & restore
│   ├── login/page.tsx               # Staff Login Portal
│   ├── records/page.tsx             # Case Records, Stage Workflow & Proof Viewer
│   ├── trademark-application/page.tsx # TM Application Generator Form
│   ├── layout.tsx                   # Metadata, OpenGraph & Favicon configuration
│   └── globals.css                  # Neobrutalist theme styling
├── lib/
│   ├── standalone-db.ts             # Browser client-side database & CSV engine
│   ├── supabase-db.ts               # Supabase Cloud Database integration
│   ├── apps-script-proxy.ts         # Server-only proxy utilities
│   └── data.ts                      # Nic-class list & configuration
├── public/
│   ├── assets/                      # Brandex high-res logo and icon assets
│   ├── sample_brandex_records.csv   # Demo sample records CSV
│   ├── sample_brandex_clients.csv   # Demo sample clients CSV
│   ├── site.webmanifest             # Web App Manifest
│   └── favicon.ico                  # Site favicon
├── Code.gs                          # Google Apps Script MailMerge script
├── supabase_schema.sql              # Supabase PostgreSQL schema with RLS
└── package.json                     # Dependencies (Next.js 15, React 19, PapaParse)
```

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js `20.x` or `22.x`
- npm or pnpm

### 1. Installation
```bash
git clone https://github.com/0utLawzz/Brandex-Workflow.git
cd Brandex-Workflow
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your configuration:
```env
# Supabase Cloud (Primary Database)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Access Authentication
APP_ACCESS_USER=admin
APP_ACCESS_PASSWORD=your-secure-password

# Google Apps Script (Document Generation)
APPS_SCRIPT_RECORDS_TOKEN=your-token
NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## ☁️ Deploy to Vercel

1. Push your repository to **GitHub**:
   ```bash
   git add .
   git commit -m "feat: complete brandex cms with supabase persistence and dispatch proof uploads"
   git push origin main
   ```
2. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New > Project**.
3. Import `Brandex-Workflow`.
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `APP_ACCESS_USER`
   - `APP_ACCESS_PASSWORD`
   - `APPS_SCRIPT_RECORDS_TOKEN`
   - `NEXT_PUBLIC_APPS_SCRIPT_URL`
5. Click **Deploy**. Vercel will build and serve your app on a global edge network.

---

## 📊 CSV Import & Export Format

When importing records via the **Import CSV** button, the following columns are supported (order is automatically detected):

| Column | Description | Example |
| --- | --- | --- |
| `Date` | Filing Date | `02/10/2026` |
| `Case Ref` | Folder / Reference Code | `646-A-001` |
| `Case Name` | Mark / Trademark Name | `AEROFLEX COURIER` |
| `TM No` | Official TM Number | `TM-589201` |
| `Class` | Nice Classification (1–45) | `39` |
| `Applicant` | Applicant Full Name | `MUHAMMAD USMAN RAZA` |
| `Trading As` | Business Trading Style | `AEROFLEX LOGISTICS` |
| `Law Firm` | Attorney / Consultant | `BRANDEX LAW ASSOCIATES` |
| `Workflow Stage` | `PENDING`, `APPROVED`, `DISPATCHED`, `DELIVERED` | `DISPATCHED` |
| `Tracking ID` | Courier Consignment No | `TCS-99201488` |
| `Dispatched Date` | Date Shipped | `Tue 10-Nov-2026` |
| `Dispatched Note` | Shipping Manifest Note | `Dispatched via TCS Express` |
| `Delivered Date` | Delivery Date | `12-Nov-26` |
| `Receiver Name` | Name of Signatory | `DR. TARIQ MAHMOOD` |
| `Client Code` | Client ID Number | `646` |
| `CNIC` | National Identity Card | `35201-1234567-1` |
| `Address` | Applicant Address | `Plot 14, Sector I-9, Islamabad` |
| `Notes` | Internal Notes | `Priority hearing requested` |

*Download a ready-to-use sample template directly from the CMS header via the **Sample CSV** button.*

---

## 🛡️ License

Copyright © 2026 Brandex Law Associates. All rights reserved.
