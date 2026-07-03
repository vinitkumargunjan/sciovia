# Membership backend — setup guide

This connects the website's application form to a Google Sheet and sends an
automatic welcome email (with a link to the member's Member Pass) when you
approve someone. It is free and takes about 20 minutes.

**Do all of this while signed in as `teamsciovia@gmail.com`.**

---

## 1. Create the Sheet

1. Go to <https://sheets.google.com> and create a new blank spreadsheet.
2. Name it **Sciovia Members**.

## 2. Add the script

1. In the sheet: **Extensions → Apps Script**.
2. Delete whatever is in `Code.gs`.
3. Open `backend/Code.gs` from this project, copy **all** of it, and paste it in.
4. Click **Save** (the disk icon).

## 3. Authorize it (one time)

1. In the Apps Script editor, choose the function **`processApprovals`** in the
   toolbar dropdown and click **Run**.
2. Google will ask for permission — choose `teamsciovia@gmail.com`, click
   **Advanced → Go to (project) → Allow**. (It may warn the app is unverified;
   that's normal for your own script.)
3. This also creates an **Applications** tab in the sheet.

## 4. Publish the web app (so the website can send applications here)

1. In Apps Script: **Deploy → New deployment**.
2. Click the gear ⚙ → **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**.
4. Click **Deploy**, then **copy the Web app URL** (ends in `/exec`).

## 5. Connect the website

1. Open `assets/js/membership.js` in this project.
2. Find the line near the top:
   ```js
   const APPLY_ENDPOINT = "";
   ```
   Paste your Web app URL between the quotes:
   ```js
   const APPLY_ENDPOINT = "https://script.google.com/macros/s/AKfy..../exec";
   ```
3. Commit and push. From now on, applications land in the **Applications** tab
   (no email needed). *(Until you do this step, applications still reach you by
   email as a fallback — nothing breaks.)*

---

## How you approve a member (day-to-day)

1. Open the **Sciovia Members** sheet → **Applications** tab.
2. Read the applicant's details (field, profile link, reason).
3. To approve: type **`Approved`** in that row's **Status** column.
4. Menu: **Sciovia → Send passes to approved members**.
   - Each approved applicant gets the next **Sciovia ID** (SCV-2026-000001, …)
   - They receive an automatic welcome email with a link to their Member Pass.
   - Their Status changes to **Sent** and the ID is recorded.

To decline someone, just leave them (or write `Rejected`) — no email is sent.

---

## Notes

- Emails send **from** `teamsciovia@gmail.com`. Free Gmail allows ~100 emails/day
  — far more than early membership will need.
- The member's pass opens at `card.html` with their details in the link; they can
  download it as a PNG. The QR on the pass links to `verify.html`.
- Member numbers are assigned **in sequence at approval time**, so this is a real
  register — no duplicates.
- If you ever change the website address, update `CARD_BASE` at the top of `Code.gs`.
