# Sciovia

*The path of knowing.*

An independent initiative that helps the research community discover opportunities — calls for papers, funding, faculty and doctoral positions, conferences, and practical guidance on publishing and research integrity.

**An initiative by Dr. Vinit Kumar Gunjan.**

Sciovia is not affiliated with any organization. It is a community service: curated, trustworthy, non-commercial.

---

## What this repository is

This repo is three things at once, all free:

1. **The website** — published via GitHub Pages from this repo (see `index.md`).
2. **The content database** — opportunities live as plain files in `content/` (human-readable Markdown) and `content/data/` (structured CSV).
3. **The newsletter archive** — every weekly edition is a file in `issues/`, so each one gets a permanent link.

## How the weekly edition works

Content accumulates all week in `content/`. On assembly day you pull the freshest entries into a new file in `issues/` using `issues/_template.md`, then send it via the email tool (GitHub hosts the archive; a separate free sender delivers the email).

See `CONTRIBUTING.md` for the full editorial workflow, and `BRAND.md` for voice and naming rules.

## Structure

```
.
├── index.md                 # GitHub Pages homepage
├── _config.yml              # GitHub Pages (Jekyll) config
├── BRAND.md                 # Brand foundation: mission, voice, naming rules
├── CONTRIBUTING.md          # Editorial workflow + how content gets added
├── content/                 # Living lists (updated all week)
│   ├── calls-for-papers.md
│   ├── funding.md
│   ├── conferences.md
│   ├── positions.md
│   └── data/                # Same data, structured for reuse/automation
│       ├── cfp.csv
│       ├── funding.csv
│       └── conferences.csv
├── issues/                  # The newsletter archive
│   ├── _template.md         # Copy this to start a new edition
│   └── 2026-07-04-issue-001.md
└── templates/
    └── newsletter-email.html  # Email layout for the sender
```

## Setup checklist

- [ ] Register `sciovia.org` and grab the matching LinkedIn / social handles.
- [ ] Confirm an IP India trademark search (Class 41) shows "Sciovia" is clear.
- [ ] Create a GitHub repo and push these files.
- [ ] Enable **Settings → Pages** (build from the `main` branch) to make the site live.
- [ ] Create a free newsletter account (Substack or Beehiiv) for email delivery.
- [ ] Prepare issues #1–#3 before publishing any, so there's a buffer.
