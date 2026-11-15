# Dr. Han Field Sales – Setup on GitHub Pages + Firebase

Follow these steps one by one. Total time: about 20–30 minutes. Firebase's free plan is enough.

Your site: **https://arulakdhh.github.io/Han-Field-Tracker/**

---

## Step 1 – Create a Firebase project
1. Open **https://console.firebase.google.com** and sign in with your Google account.
2. Click **Create a project** (or **Add project**).
3. Name: `han-field-tracker` → Continue.
4. Google Analytics: switch **off** → **Create project** → wait → **Continue**.

## Step 2 – Create the database (Firestore)
1. In the left menu: **Build → Firestore Database** → **Create database**.
2. Location: **asia-south1 (Mumbai)** → Next. (The location can't be changed later.)
3. Choose **Start in production mode** → **Create**.

## Step 3 – Turn on User ID + password login
1. Left menu: **Build → Authentication** → **Get started**.
2. Tab **Sign-in method** → click **Email/Password** → switch **Enable** on (leave "Email link" off) → **Save**.

## Step 4 – Paste the security rules
1. Go to **Firestore Database → Rules** tab.
2. Delete everything in the box.
3. Open the file **`firestore.rules`** from this ZIP (with Notepad), copy **all** of it, and paste it into the box.
4. Click **Publish**.

These rules make sure each executive can only see their own meetups, and only the admin can change the team list.

## Step 5 – Create YOUR admin login
1. Go to **Authentication → Users** tab → **Add user**.
2. Email: **`admin@hanfield.app`** (type exactly this; it's only an internal login name, no email is sent).
3. Password: choose a strong password (at least 6 characters). **This is your admin password.**
4. Click **Add user**.

## Step 6 – Connect the website to Firebase
1. Click the **⚙ gear → Project settings** (top-left).
2. Scroll to **Your apps** → click the **`</>`** (Web) icon.
3. App nickname: `han-field-web` → leave "Firebase Hosting" unticked → **Register app**.
4. You'll see a code box with `const firebaseConfig = { apiKey: "...", authDomain: "...", ... }`.
5. Open **`firebase-config.js`** from this ZIP in Notepad and replace each `PASTE_YOUR_..._HERE` with the matching value. Keep the quotes, for example:
   ```js
   apiKey: "AIzaSyB....",
   authDomain: "han-field-tracker.firebaseapp.com",
   projectId: "han-field-tracker",
   storageBucket: "han-field-tracker.firebasestorage.app",
   messagingSenderId: "1234567890",
   appId: "1:1234567890:web:abc123"
   ```
6. Save the file. **Do not change** the two `HAN_...` lines at the bottom.

## Step 7 – Allow your GitHub site
1. **Authentication → Settings** tab → **Authorized domains** → **Add domain**.
2. Type **`arulakdhh.github.io`** → **Add**.

## Step 8 – Upload the files to GitHub
In your repository **Han-Field-Tracker** on github.com:
1. Click **Add file → Upload files**.
2. Drag in these 3 files from the ZIP (they replace the old `index.html`):
   - `index.html`
   - `firebase-config.js` (the one you edited in Step 6)
   - `firebase-runtime.js`
3. Scroll down → **Commit changes**.
4. Wait 1–2 minutes for GitHub Pages to update.

## Step 9 – First login as admin
1. Open **https://arulakdhh.github.io/Han-Field-Tracker/** (press **Ctrl+F5** to refresh).
2. User ID: **ADMIN**, Password: your admin password from Step 5 → **Login**.
3. You should see **All Doctors, Meetings, WhatsApp Briefings, Reports, Activity Log, Setup**.

If you see "Setup needed", recheck Step 6. If you see "Couldn't load data… Check the Firestore rules", recheck Step 4.

## Step 10 – Test with the sample data
1. **Setup → Upload the Excel file** → choose `sample-data/HAN_Sample_Test_Data.xlsx`.
   - This automatically creates a login for each executive (HAN001…HAN010) with their default password.
   - Default passwords must be **at least 6 characters** (a Firebase rule).
2. **Logout** → log in as **HAN001 / Test@001** → set a new password → you see Arun Kumar's 5 doctors.
3. Test on your phone too: open the same link and log in as another executive.
4. Work through **TESTING_CHECKLIST.md**.

## Step 11 – Go live
1. Log in as **ADMIN** → **Setup → Danger zone → Reset data → Erase everything** (admin password + type RESET).
2. Optional clean-up: Firebase **Authentication → Users** → delete the test logins (`han001.1@hanfield.app`, …). Keep `admin@hanfield.app`.
3. Fill `templates/HAN_Executive_Upload_Template.xlsx` with your real executives and doctors → upload it in **Setup**.
4. Send each executive the link + their **User ID** + **default password**. On first login they set their own password.

---

## Everyday admin tasks
| Task | Where |
|---|---|
| Executive forgot password | Setup → their card → **Reset password** (type a new default) → tell them the new default |
| Add an executive or doctor | Setup → Add one executive / Add one doctor, or upload Excel again (existing logins are kept) |
| Change your admin password | Top bar → **Change password** |
| Forgot admin password | Firebase console → Authentication → Users → `admin@hanfield.app` → ⋮ → **Reset password** won't work (no real inbox), so **delete** the user and **add** it again with a new password (Step 5). Your data is not affected. |

## Free plan limits (Firebase Spark)
About 50,000 reads and 20,000 writes per day and 1 GB of storage, which is plenty for 10 executives. The Firebase console → **Usage** shows how much you use.

## What's different from the claude.ai version
- Executives don't need a claude.ai account; they just open your GitHub link.
- AI-written key points aren't available here (they run on claude.ai). The built-in key-point tips are used instead.
- Executive IDs and names (no passwords) are readable from the login page so the name can appear when an ID is typed.
