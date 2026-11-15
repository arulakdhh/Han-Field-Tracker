/* =================================================================
   STEP 6 of SETUP_STEPS.md
   Paste your Firebase web-app settings here.
   Firebase console → ⚙ Project settings → General → "Your apps" →
   Web app → "SDK setup and configuration" → choose "Config".
   Copy the values between the { } into the matching lines below.
   (These values are not secret — security comes from firestore.rules.)
   ================================================================= */
window.FIREBASE_CONFIG = {
  apiKey: "PASTE_YOUR_apiKey_HERE",
  authDomain: "PASTE_YOUR_authDomain_HERE",
  projectId: "PASTE_YOUR_projectId_HERE",
  storageBucket: "PASTE_YOUR_storageBucket_HERE",
  messagingSenderId: "PASTE_YOUR_messagingSenderId_HERE",
  appId: "PASTE_YOUR_appId_HERE"
};

/* Do NOT change these two lines (they must match firestore.rules).
   The admin account you create in Firebase must use exactly this email. */
window.HAN_ADMIN_EMAIL = "admin@hanfield.app";
window.HAN_EMAIL_DOMAIN = "hanfield.app";
