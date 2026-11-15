# Dr. Han Field Sales – GitHub Pages + Firebase version

Start with **SETUP_STEPS.md** (11 numbered steps).

| File | Upload to GitHub? | What it is |
|---|---|---|
| `index.html` | ✅ yes | The complete app (HTML, CSS, JavaScript) |
| `firebase-runtime.js` | ✅ yes | Connects the app to Firebase (database + secure login) |
| `firebase-config.js` | ✅ yes, **after editing** (Step 6) | Your Firebase project settings |
| `firestore.rules` | no, paste into Firebase (Step 4) | Database security rules |
| `sample-data/HAN_Sample_Test_Data.xlsx` | no | Fictional test data: 10 executives, 50 doctors |
| `templates/HAN_Executive_Upload_Template.xlsx` | no | Empty template for your real data |
| `TESTING_CHECKLIST.md` | no | Tick-box test plan |

## How logins work
- **Admin:** User ID `ADMIN` → Firebase account `admin@hanfield.app` (you create it in Step 5).
- **Executives:** User ID `HAN001` → Firebase account `han001.1@hanfield.app`, created automatically when you upload the Excel. The number after the dot changes each time the admin resets that executive's password, which switches the old login off.
- On first login an executive must replace the default password with their own.
- Passwords are handled entirely by Firebase Authentication; the app never stores them.

## Data (Firestore)
`config/master` team & doctors · `public/names` IDs + names for the login page · `auth/<ID>` login generation · `visits/<ID>/v/*` meetups · `plans` scheduled meetings · `assign` + `transfers` handovers · `activity/<ID>/d/<date>` activity log.
Security: each executive reads and writes only their own meetups and activity; only the admin changes the team list and sees everything (see `firestore.rules`).

Libraries: Firebase JS SDK 10.12.2 (compat), SheetJS 0.18.5, jsPDF 2.5.1 + AutoTable 3.8.2.
