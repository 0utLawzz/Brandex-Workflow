# Google Sheets Columns and Statuses

`Code.gs` is the source of truth for the `Sheet1` header row and validation lists. Keep the 22 columns in this order; `getRecordsForView()` maps these positions into the Records page.

| Column | Header | Records feed / behavior |
| --- | --- | --- |
| A | `STATUS` | `START ‼`, `GENERATING`, `DONE`, or `ERROR` |
| B | `STAGE` | `STAGE 1`; paired with `START ‼` for manual processing actions |
| C | `SR NO` | Generated serial number |
| D | `TM-NO` | Trademark number |
| E | `NAME` | Record folder / mark name |
| F | `DATE L` | Date shown as `date` in Records |
| G | `CLASS` | Nice class number |
| H | `CLASS-DESC` | Class goods/services description |
| I | `APP-TYPE` | Applicant type |
| J | `APP-NAME` | Applicant name |
| K | `APP-SO` | Applicant father/representative field |
| L | `APP-CNIC` | CNIC |
| M | `ISSUE-DATE` | Issue date; not the Records `date` field |
| N | `EXPIRY-DATE` | Expiry date |
| O | `APP-TRADE` | Trading-as name |
| P | `APP-ADD` | Applicant address |
| Q | `YEAR` | Usage year |
| R | `CON-NAME` | Consultant name |
| S | `CON-ADD` | Consultant address |
| T | `IMG` | Uploaded Drive image ID; exposed as `img` |
| U | `NO-IMG` | Fallback image text |
| V | `FILING PROCESS` | Filing status dropdown |

## Processing status

The form writes a row with `START ‼` and `STAGE 1`, then processes it immediately. Column A changes to `GENERATING`, then `DONE` or `ERROR`. The one-row and bulk Sheet menu actions only select rows whose Column A is `START ‼` and Column B is `STAGE 1`.

The filing-process dropdown in Column V is maintained separately: `PENDING`, `IN REVIEW`, `APPROVED`, `REJECTED`, `DISPATCHED`, and `DELIVERED`.

## Nice classes

Column G's dropdown is generated from `CLASS_DATA` in `Code.gs` (classes 1–45). When its value changes, `onEdit` fills the matching description into Column H.
