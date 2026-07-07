# Design — Multi-Admin Opportunities Posting System

*A proposal for how five section editors post opportunities to Sciovia, with no coding.*
*Status: DESIGN — for review by the managing committee before we build.*

---

## 1. Goal

Let **five section editors** — one per category — post and manage opportunities on the live site, each in their own area, without touching code or GitHub. This doubles as the operational structure of the **managing committee**.

| Section (category) | Covers | Section Editor |
|---|---|---|
| Conferences & Calls | Conference CFPs, special sessions, journal special-issue / publication calls | *(admin 1)* |
| Funding | Grants, fellowships, funding calls | *(admin 2)* |
| Positions | Faculty, postdoc, PhD openings | *(admin 3)* |
| Internships | Research & industry internships | *(admin 4)* |
| News & Updates | Community announcements & updates | *(admin 5)* |

A **Coordinator** (any committee member) provides light oversight.

---

## 2. Why Google Sheets (recommended)

We already run membership on Google Apps Script, so this reuses the same free, familiar foundation. Editors work in a spreadsheet — from a laptop or phone — and the website updates itself.

Alternatives considered and why not:
- **Editing the code/JSON on GitHub** — requires technical skill; five people editing one file causes conflicts. ✗
- **A custom web admin panel with logins** — needs a real backend/database and ongoing maintenance/cost. Overkill for now. ✗
- **Google Sheets** — free, no-code, per-person access control, phone-friendly, already in our stack. ✓

---

## 3. How it works

```
  Section editor adds a row            Apps Script publishes           Website reads it live
  in their tab of the       ──────►    only "Published" rows   ──────► Opportunities page
  "Opportunities" Google Sheet         as JSON                         updates automatically
```

- One Google Sheet named **"Sciovia Opportunities"** with **5 tabs**, one per category.
- Each tab has the same columns (below).
- The Apps Script exposes a URL that returns all **published** rows as JSON.
- The website's Opportunities page reads that URL instead of the static file. If the service is ever unreachable, it falls back to the last known list — the site never breaks.

### Columns (each tab)

| Column | Meaning |
|---|---|
| Title | Name of the opportunity |
| Organization | Host university / journal / body |
| Location | City, Country / Online |
| Mode | In-person / Online / Hybrid |
| Dates | Event or award dates (free text) |
| Deadline | The deadline (date) — leave blank for rolling |
| Link | URL to the official page (required) |
| Published | ✅ checkbox — only ticked rows appear on the site |
| Added by | (auto) the editor's name |

---

## 4. Access control — each editor scoped to their section

Two simple options; we can pick one:

- **Option A — Protected tabs (recommended).** All five editors get edit access to the sheet, but each tab is *protected* so only its assigned editor (plus the Coordinator) can edit it. An editor literally cannot change another section. Built into Google Sheets, no code.
- **Option B — Separate sheets.** Each editor gets their own private sheet; the script pulls from all five. More isolation, slightly more setup.

Either way, no editor can publish outside their section, and the Coordinator can see and adjust everything.

---

## 5. Moderation

- The **Published** checkbox is the gate: a row only appears on the site once ticked.
- Editors can add drafts freely; nothing goes live until Published is checked.
- The Coordinator can un-publish anything (untick the box) — instantly removed from the site.
- Expired opportunities: an editor unticks Published (or deletes the row) once the deadline passes. *(Optional later: auto-hide past-deadline rows.)*

---

## 6. What each Section Editor does (day-to-day)

1. Open the **Sciovia Opportunities** sheet → their tab.
2. Add a row: Title, Organization, Deadline, Link (and the rest).
3. Tick **Published**.
4. Done — it appears on the site within a minute. No approvals, no code.

## 7. What the Coordinator does

- Keeps an eye on quality and accuracy (Sciovia's promise is *verified* listings).
- Un-publishes or corrects anything off.
- Onboards/removes editors by sharing/unsharing the sheet.

---

## 8. What building it involves

**On the website side (my part, ~1 session):**
- Extend the Apps Script with an endpoint that returns published opportunities as JSON.
- Point the Opportunities page (and homepage "Featured") at that endpoint, with a safe fallback.

**On your side (one-time, ~20 min, in the teamsciovia account):**
- Create the "Sciovia Opportunities" sheet with the five tabs and columns (I'll give exact steps, or a ready-made template).
- Share it with the five editors and set the tab protections.
- Redeploy the Apps Script (same one-time step as before).

**From the committee (to start):**
- The five editors' **names + emails**, and which section each takes.

---

## 9. Safety & sustainability

- **No single point of failure in content:** any editor can post; the site keeps working if one is away.
- **Site never breaks:** if the Sheet/endpoint is unreachable, the page shows the last good list.
- **Free & low-maintenance:** no servers, no database, no subscriptions.
- **Portable:** if Sciovia later moves to a dedicated domain or a bigger platform, this data exports cleanly.

---

## 10. Governance note

This structure *is* the managing committee in practice: five Section Editors + a Coordinator, all working under the Sciovia name with no personal bylines on the public site. It distributes the work, makes the initiative sustainable beyond any one person, and reads as an established, community-run body.

*Optional future extensions: public "submit an opportunity" queue feeding an editor's review; a member directory; analytics on most-viewed listings.*

---

## 11. Implementation — the section editors

Each of the five section tabs is assigned to one Section Editor. **Their names and
emails are kept privately by the Coordinator and are deliberately not published here**
(this repository is public). The Coordinator holds the current assignment list.

| Section tab | Section Editor |
|---|---|
| Conferences & Calls | *(assigned privately)* |
| Funding | *(assigned privately)* |
| Positions | *(assigned privately)* |
| Internships | *(assigned privately)* |
| News & Updates | *(assigned privately)* |

### Setup (one time, in the teamsciovia account)

1. **Update the script** — paste the latest `backend/Code.gs` into Apps Script and save.
2. **Redeploy** — Deploy → Manage deployments → ✏️ → New version → Deploy (same URL).
3. **Create the sheet** — reload the *Sciovia Members* sheet → menu **Sciovia → Set up Opportunities sheet**. This creates a new **"Sciovia Opportunities"** spreadsheet with the five section tabs (seeded with the current listings) and shows its link. Authorize if prompted.
4. **Share** — open that new sheet → **Share** → add each editor's email as **Editor**.
5. **Scope each tab** — for every tab: **Data → Protect sheet and ranges → Set permissions →** allow only that section's editor (and the owner) to edit.

### How editors post
Open the *Sciovia Opportunities* sheet → their tab → add a row (Title, Organization, Deadline, Link, Type if relevant) → tick **Published**. It appears on the website within a minute.

**Columns:** Title · Type · Organization · Location · Mode · Dates · Deadline · Link · Published (checkbox) · Added by.
