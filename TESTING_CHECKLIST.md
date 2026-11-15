# Testing checklist – Dr. Han Field Sales

Tick each item. Use `local-test.html` (switch devices with the TEST MODE panel) or the live link.

## 1. Admin setup
- [ ] Log in with **ADMIN / Admin@123** → asked to set a new password → admin dashboard opens
- [ ] Setup → upload `sample-data/HAN_Sample_Test_Data.xlsx` → "10 executives · 50 doctors", no error rows
- [ ] All Doctors → zone tabs show North / Central / South / Outside Chennai and one "Zone not set" (Unknown Nagar)
- [ ] Open a "Zone not set" doctor → change Zone → it moves to that zone
- [ ] Setup → each executive shows "Not logged in yet"
- [ ] Replace HAN001's WhatsApp number with **your own** number (for the WhatsApp tests)
- [ ] 🎨 → try each look → "Set as default for whole team"

## 2. Executive login (Executive phone 1)
- [ ] Type **HAN001** → the name "Arun Kumar" appears automatically
- [ ] Wrong password → error message
- [ ] **Test@001** → asked to set own password; reusing Test@001 is refused
- [ ] After setting a password: only **My Doctors** and **My Meetings** tabs, 5 doctors
- [ ] Logout → log in again with the new password
- [ ] Typing **ADMIN** on an executive phone → "Admin login works only on the admin's own account"
- [ ] HAN009 (no default password in sheet) → its WhatsApp number 9000000009 works as the default password

## 3. Meetups & meetings
- [ ] Open a doctor → details, "No meetups yet"
- [ ] Schedule meeting for tomorrow 10:30 → shows under Next meeting and in My Meetings
- [ ] + Add meetup update → Follow-up + reason + date (+1d) + time → saved, history shows #1
- [ ] Add a second meetup → Positive + expected date → history shows #1 and #2
- [ ] Negative requires a reason; the form won't save with missing fields

## 4. Handover (handshake)
- [ ] Phone 1 (HAN001): open a doctor → 🤝 Hand over → choose HAN002 + reason → "waiting for acceptance"
- [ ] Phone 2 (HAN002 / Test@002): handover request box → **Accept** → doctor appears in HAN002's list with full history
- [ ] Try another handover and **Decline** → HAN001 sees "declined", doctor stays
- [ ] Admin: open any doctor → 🔁 Reassign → moves immediately

## 5. Admin checks
- [ ] All Doctors / Meetings / Reports show everyone's data
- [ ] WhatsApp Briefings (Tomorrow) → first-meeting message has name, location, time, phone; repeat-meeting message has summary + key points
- [ ] **📤 Send reminders to all executives** → WhatsApp opens with one combined message per executive → list marks ✓ Sent
- [ ] Log in as HAN001 from the admin computer → see and edit HAN001's dashboard → logout → back to admin
- [ ] Reports → Excel / CSV download opens in Excel
- [ ] Activity Log → Today shows logins, meetups, schedules, handovers, reminders
- [ ] Activity Log → filter by user and action; Last 7 days
- [ ] **⬇ PDF** → one page per day; **⬇ Excel** works
- [ ] Setup → Reset password for an executive → they log in with the default again

## 6. Go live
- [ ] Setup → Danger zone → **Reset data → Erase everything** (admin password + type RESET)
- [ ] App is empty; admin login still works
- [ ] Upload your **real** Excel (from `templates/HAN_Executive_Upload_Template.xlsx`)
- [ ] Share the live link with each executive's email; send them their User ID + default password
