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

## How you review applications (day-to-day)

1. Open the **Sciovia Members** sheet → **Applications** tab.
2. Read the applicant's details (field, profile link, reason).
3. In the **Status** column, type:
   - **`Approved`** to accept, or
   - **`Rejected`** to decline — and (optional) type a short reason in the **Note** column.
4. Menu: **Sciovia → Process applications (approve / decline)**.
   - **Approved** → gets the next **Sciovia ID** (SCV-2026-000001, …) + an automatic welcome email with their Member Pass. Status becomes **Sent**.
   - **Rejected** → gets a courteous decline email (including your **Note** reason, if any). Status becomes **Declined**.
   - Rows you leave blank/Pending are untouched.

---

## Sending the weekly newsletter

Subscribers land in a **Subscribers** tab automatically. To send them a digest:

1. Menu: **Sciovia → Newsletter → Set up newsletter tab** (first time only). This creates a **Newsletter** tab.
2. In the **Newsletter** tab, edit the **Issue label**, **Intro**, **Researcher of the Week**, and **Practical Tip**. *(The opportunities are pulled in and grouped automatically from your live listings — you don't type those.)*
3. Menu: **Sciovia → Newsletter → Send test to me** → check the email in your inbox.
4. When it looks right: **Sciovia → Newsletter → Send to all subscribers**.

Free Gmail sends ~100 emails/day. Once you pass that, move bulk sending to a
dedicated tool (Substack/Beehiiv) — you already have the subscriber list to import.

---

## Notes

- Emails send **from** `teamsciovia@gmail.com`. Free Gmail allows ~100 emails/day
  — far more than early membership will need.
- The member's pass opens at `card.html` with their details in the link; they can
  download it as a PNG. The QR on the pass links to `verify.html`.
- Member numbers are assigned **in sequence at approval time**, so this is a real
  register — no duplicates.
- If you ever change the website address, update `CARD_BASE` at the top of `Code.gs`.
