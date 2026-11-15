# Dr. Han Healthcare – Field Sales Visit Tracker

A mobile-first web app for Dr. Han Healthcare Private Limited (Chennai) to manage field sales executives, their assigned doctors, meetups, follow-ups and WhatsApp briefings.

**Live app:** https://claude.ai/artifact/9dceAeALtisy9FmuVfFuE2

---

## What's in this ZIP

| File / folder | What it is |
|---|---|
| `index.html` | **The complete app**: all HTML, CSS and JavaScript in one file. This is exactly what runs on claude.ai. |
| `local-test.html` | The same app with a test database, for testing **offline on your own computer** (see below). |
| `mock-runtime.js` | The test database used only by `local-test.html`. It keeps data in your browser and is not used live. |
| `capabilities.json` | Database security rules the live app is published with (who can read/write what). |
| `templates/HAN_Executive_Upload_Template.xlsx` | Empty upload template for your real data. |
| `sample-data/HAN_Sample_Test_Data.xlsx` | **Fictional test data**: 10 executives, 50 doctors across all Chennai zones. |
| `TESTING_CHECKLIST.md` | Step-by-step test plan. |
| `docs/` | Screenshots. |
| `assets/logo-icon.png` | Logo icon used in the app (embedded inside `index.html`). |

---

## Two ways to test

### A. Offline on your computer (`local-test.html`)
1. Unzip the folder.
2. Double-click **`local-test.html`**. It opens in Chrome or Edge (internet is needed for fonts and the Excel/PDF libraries).
3. A dark **TEST MODE** panel appears at the bottom-left:
   - **🖥 Admin computer (owner)** lets you act as the admin.
   - **📱 Executive phone 1–5** let you act as different executives' phones.
   - **Reset test data** wipes the test database.
4. Admin first login: User ID **ADMIN**, password **Admin@123**, then set a new password.
5. Upload `sample-data/HAN_Sample_Test_Data.xlsx` in **Setup**.
6. Switch to "Executive phone 1" and log in as **HAN001 / Test@001**, and so on.

Test data stays only in that browser. WhatsApp buttons open real WhatsApp, so use your own number in the sample sheet to see the messages.

### B. On the live claude.ai app
Same steps, using the live link. When testing is complete, go to **Setup → Danger zone → Reset data → Erase everything**, then upload your real Excel file.

---

## Features

**One login page for everyone.** User ID **ADMIN** opens the admin dashboard; executive IDs (HAN001…) open that executive's dashboard. First login forces a password change. Passwords are stored hashed (PBKDF2-SHA256). Each Executive ID can be used on only one account.

**Executive dashboard** (own doctors only)
- My Doctors: doctor details, meetup history, next meeting, **+ Add meetup update**
- Meetup form: date/time auto, purchase role, purpose (multi-select), conversation, status Positive (expected date) / Follow-up (reason + date + time) / Negative (reason)
- Schedule or reschedule meetings
- 🤝 Hand over a doctor to another executive (they must accept)
- My Meetings: upcoming, today, overdue

**Admin dashboard**
- All Doctors grouped by **North / Central / South / Outside Chennai** (auto-detected from area/address, editable)
- Meetings & follow-ups for everyone, Excel export
- WhatsApp Briefings: first-meeting message (basic details) or repeat-meeting summary with key points; **Send reminders to all executives**
- Reports & Export (Excel, CSV, Excel-XML)
- **Activity Log** with date range, user and action filters, **PDF (one page per day)** and Excel download
- Setup: Excel upload, add executive or doctor, WhatsApp numbers, default passwords, password reset, reassign doctors
- 🎨 5 looks (Classic Navy, Ocean Glass, Sunrise Coral, Royal Purple, Midnight Dark), with a team default
- **Danger zone → Reset data**: erase test activity only, or erase everything

---

## Important: where the app runs

`index.html` uses the **claude.ai artifact platform** for its database, user identity, downloads and AI key points (`window.claude.use("db" | "user" | "downloads" | "sample")`). That means:

- It runs **live only as a claude.ai artifact** (the link above). Executives need a claude.ai account and must be invited with **Share** (Editor on personal plans, Contributor on Team/Enterprise).
- Opening `index.html` directly in a browser shows the app but **cannot save data**. Use `local-test.html` for offline testing.
- To host it on your own website or server instead, the `db`, `user`, `downloads` and `sample` calls would need replacing with your own backend (for example Firebase or Supabase). That is a separate development task.

---

## Data structure (live database)

| Path | Contents | Who can write |
|---|---|---|
| `config/master` | Executives, doctors (with zone/address), team look | Admin only |
| `auth/<ExecID>` | Default password hash per executive | Admin only |
| `visits/<account>` | Executive's login binding + personal password hash | That account (admin can read all) |
| `visits/<account>/v/<id>` | Meetup records | That account |
| `plans/<id>` | Scheduled meetings | Team |
| `assign/<doctorId>` | Doctor reassignment after handover | Team |
| `transfers/<id>` | Handover requests and their status | Team |
| `claims/<ExecID>` | Which account owns an Executive ID | Team |
| `activity/<account>/d/<date>` | Activity log for that day | That account (admin reads all) |
| `data/users/<owner>/admin` | Admin password hash (private) | Admin only |

Libraries loaded from cdnjs: SheetJS 0.18.5 (Excel), jsPDF 2.5.1 + jsPDF-AutoTable 3.8.2 (PDF). Fonts: Inter and JetBrains Mono from Google Fonts.

---

## Known limits
- WhatsApp messages open WhatsApp with the text ready; someone taps Send once per executive. Fully automatic sending needs a WhatsApp Business API provider (for example Bird or Sent) and a Meta-approved template.
- The page cannot save PDFs on its own; the admin taps **⬇ PDF**. The activity data itself is stored permanently, day by day.
- About 25,000 records fit in the live database. Export and reset yearly if you go beyond that.
