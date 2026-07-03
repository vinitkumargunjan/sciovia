# Editorial Workflow

*How content flows into Sciovia and out to readers each week. This engine — not the logo — is what keeps the initiative alive past issue #6.*

---

## The core idea: collect all week, assemble in one sitting

The failure mode of every newsletter is hunting for content on the day you publish. Sciovia avoids this by keeping **living lists** that you top up whenever you spot something. On assembly day you are *selecting*, not *searching*.

```
  All week                         Assembly day                 Send day
  ────────                         ────────────                 ────────
  Spot an item                     Open a new issue from        Paste into the
  →  add a row to content/    →    _template.md, pull the   →   email tool,
     (and content/data CSV)        best fresh items in          send, commit
```

## Where content lives

| File | Holds |
|---|---|
| `content/calls-for-papers.md` | Journal CFPs and special issues |
| `content/funding.md` | Grants, fellowships, funding calls |
| `content/positions.md` | Faculty, postdoc, and PhD openings |
| `content/conferences.md` | Conferences and events |
| `content/data/*.csv` | The same items in structured form, for sorting/automation later |

Add to the Markdown file for quick human editing. If you can, also add a row to the matching CSV — that structured copy is what will later power a searchable database and automated deadline sorting.

## Adding an item — the standard

Every item, no exceptions:

1. **What it is** (one line: the call/position/event and who is offering it).
2. **The deadline as an absolute date** (e.g. *15 August 2026*). No "next week".
3. **A working link to the original source.** If you can't link the source, don't publish it.
4. **Verified.** You (or a volunteer) opened the link and confirmed it is real and current.

Drop anything that is unclear, expired, or unverifiable. Accuracy over volume — always.

## Assembling an edition

1. Copy `issues/_template.md` to `issues/YYYY-MM-DD-issue-NNN.md`.
2. Fill the front matter (date, issue number).
3. Pull the freshest, most relevant items from each `content/` list. **Aim for the 5 MVP sections only** until sourcing is comfortable:
   - Calls for Papers · Funding · Positions · Researcher of the Week · One Practical Tip
4. Sort anything with a deadline into the **Deadlines This Week** box at the top.
5. Read it once out loud against `BRAND.md` voice rules. Cut every unnecessary word.
6. Remove used/expired items from the `content/` lists so they don't reappear.

## Sending

- GitHub Pages hosts the **archive** (the file you just committed gets a permanent link).
- A free email tool (Substack or Beehiiv) does the **delivery**. Paste the edition in, or use `templates/newsletter-email.html` as the layout.
- Commit the new issue file so the web archive stays complete.

## Growing the section list

Start at 5 sections. Add one more only when its source is reliable and semi-automated. Natural order to expand:

`Conferences → Special Issues → Research Awards → Reviewer Tips → Research Integrity Corner → Book Announcements → Collaborations → Research Tools`

## When volunteers join (later)

Volunteers contribute by editing a `content/` file and opening a pull request. The curator (or a section editor) checks it against the standard above and merges. That is the whole review process — simple, and it scales.

## Sourcing shortcuts

Places to watch so the lists fill themselves:
- CFP aggregators and journal "special issue" pages in the target fields
- National/global funding portals and fellowship calls
- University career pages and academic job boards for positions
- Society and conference announcement feeds

Once a few sources are stable, most of this can be pulled automatically into `content/data/` — a good task to automate after the first ~10 issues ship.
