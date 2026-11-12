# Brandex Workflow — Column Definitions & Statuses

This document details the column structures used across the **Supabase Database**, **Google Sheets**, and **CSV Import/Export**.

---

## 1. Workflow Stage Pipeline

Cases transition sequentially through four distinct legal stages:

```
[PENDING / IN REVIEW] ──▶ [APPROVED or REJECTED] ──▶ [DISPATCHED] ──▶ [DELIVERED]
```

| Stage | Color Badge | Description | Required Metadata |
| --- | --- | --- | --- |
| `PENDING` / `IN REVIEW` | Amber / Gray | Application submitted, undergoing review / examination | Class, TM No, Applicant Name |
| `APPROVED` | Green | Examination passed, advertised in Trademark Journal | Examination notes / IPO receipt |
| `REJECTED` | Red | Objection or refusal raised under Trademark Ordinance | Objection reason / hearing notice |
| `DISPATCHED` | Blue | Documents / certificates sent to client or IPO | Dispatched Date, Courier Tracking ID, **Proof of Sending (Receipt / Waybill)** |
| `DELIVERED` | Forest Green | Case packet safely delivered and signed for | Delivery Date, Receiver Name, Delivery Receipt |

---

## 2. Supabase Table Schema (`trademark_records`)

| Column | Type | Description |
| --- | --- | --- |
| `id` | `BIGSERIAL` | Unique database record ID |
| `serial_no` | `TEXT` | Serial reference (e.g. `646-A-001`) |
| `trademark_no` | `TEXT` | IPO Trademark Number (`TM-589201`) |
| `mark_name` | `TEXT` | Folder / Trademark Brand Name |
| `class_no` | `TEXT` | Nice Classification number (1–45) |
| `class_desc` | `TEXT` | Goods and services classification text |
| `applicant_name` | `TEXT` | Individual or corporate applicant name |
| `father_name` | `TEXT` | Father or representative name |
| `cnic` | `TEXT` | National Identity Card Number |
| `trading_as` | `TEXT` | Commercial trade entity style |
| `address` | `TEXT` | Registered physical business address |
| `consultant_name`| `TEXT` | Legal representative (`BRANDEX LAW ASSOCIATES`) |
| `status` | `TEXT` | Active workflow stage (`PENDING`, `DISPATCHED`, etc.) |
| `tracking_id` | `TEXT` | Courier tracking number (TCS, Leopards, Post) |
| `dispatched_date`| `TEXT` | Formatted dispatch date |
| `dispatched_note`| `TEXT` | Shipping manifest note |
| `dispatched_image`| `TEXT` | **Proof of sending** (Courier slip image or PDF data URL) |
| `dispatched_doc_name`| `TEXT`| Original filename of uploaded dispatch proof |
| `dispatched_doc_type`| `TEXT`| MIME type (`image/jpeg`, `application/pdf`, etc.) |
| `delivered_date` | `TEXT` | Confirmed delivery date |
| `receiver_name` | `TEXT` | Signatory or recipient person |
| `receipt_image` | `TEXT` | Delivery acknowledgment photo |
| `notes` | `TEXT` | Confidential attorney internal case notes |

---

## 3. CSV Import & Export Columns (PapaParse Format)

The system automatically recognizes headers case-insensitively with fuzzy detection:

1. `ID`
2. `Date`
3. `Case Ref`
4. `Case Name`
5. `TM No`
6. `Class`
7. `Applicant`
8. `Trading As`
9. `Law Firm`
10. `Workflow Stage`
11. `Tracking ID`
12. `Dispatched Date`
13. `Dispatched Note`
14. `Delivered Date`
15. `Receiver Name`
16. `Client Code`
17. `CNIC`
18. `Address`
19. `Notes`

---

## 4. Google Sheets Column Mapping (`Code.gs`)

The automated Apps Script writes 22 columns to Google Sheets:
- A: `STATUS` (`START ‼`, `GENERATING`, `DONE`, `ERROR`)
- B: `STAGE` (`STAGE 1`)
- C: `SR NO`
- D: `TM-NO`
- E: `NAME`
- F: `DATE L`
- G: `CLASS`
- H: `CLASS-DESC`
- I: `APP-TYPE`
- J: `APP-NAME`
- K: `APP-SO`
- L: `APP-CNIC`
- M: `ISSUE-DATE`
- N: `EXPIRY-DATE`
- O: `APP-TRADE`
- P: `APP-ADD`
- Q: `YEAR`
- R: `CON-NAME`
- S: `CON-ADD`
- T: `IMG`
- U: `NO-IMG`
- V: `FILING PROCESS`
