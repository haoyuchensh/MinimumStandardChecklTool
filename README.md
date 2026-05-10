# Rental Minimum Standards Checklist VIC

Static, mobile-first web app for Victorian landlords and property managers to complete a rental minimum standards self-check, record notes and photos, save a draft locally, and download a PDF report.

This version is designed for GitHub Pages. There is no build step.

## Important Disclaimer

This checklist is a self-assessment tool only and does not constitute legal advice. Landlords should refer to Consumer Affairs Victoria and seek professional advice where required.

The app deliberately uses wording such as:

- Self-check
- Appears compliant
- Needs review
- Professional check recommended

## Features

- Phone-first guided flow with large buttons and readable text
- Sticky progress bar and bottom navigation for one-handed use
- Property details screen
- 15 Victorian rental minimum standards checklist sections
- Official requirement summary, plain-English guidance, common issues and self-check questions for every section
- Assessment options: Appears compliant, Needs review, Not applicable, Professional check recommended
- Notes, suggested repair/action, priority selector and photo upload per section
- Browser local draft save
- Smart summary with ready/not-ready result logic
- Downloadable and printable PDF report with photos, notes, repair list, signature area and disclaimer
- Reusable checklist data in `data/checklist.json`

## Static File Structure

```text
index.html              Main app page
assets/styles.css       Mobile-first responsive UI
assets/app.js           App logic, local draft saving and PDF generation
assets/checklist-data.js Bundled checklist fallback for direct file opening
data/checklist.json     Checklist content and standards data
.nojekyll               GitHub Pages compatibility file
```

## Run Locally

You can open `index.html` directly in a browser for a quick preview. The app includes `assets/checklist-data.js` so the checklist still loads when opened as a local file.

For the closest match to GitHub Pages, open it through a small local web server.

With Python:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Host On GitHub Pages

1. Push these files to a GitHub repository.
2. In GitHub, open `Settings`.
3. Open `Pages`.
4. Set source to `Deploy from a branch`.
5. Choose the branch, usually `main`, and folder `/root`.
6. Save.

GitHub will serve the app from the Pages URL once deployment completes.

## PDF Dependency

PDF generation uses jsPDF from a CDN in `index.html`:

```html
https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js
```

The app itself is static. PDF generation needs that script to load in the browser.

## Smart Summary Logic

- Any urgent issue is marked `Not ready`
- More than 3 failed items is marked `Not ready`
- High-priority failed or professional-check items are marked `Not ready`
- No failed, professional-check or unanswered items is marked `Ready to advertise`
- Other issues are marked `Ready after minor fixes`

## Source Reference

Checklist content is based on Consumer Affairs Victoria rental minimum standards guidance, checked on 10 May 2026:

- https://www.consumer.vic.gov.au/housing/renting/repairs-alterations-safety-and-pets/minimum-standards/checklist-rental-properties-minimum-standards
- https://www.consumer.vic.gov.au/housing/renting/repairs-alterations-safety-and-pets/minimum-standards/minimum-standards-for-rental-properties

Always verify the current rules before relying on a report for a real property decision.

## Future Extension Points

- Chinese language support
- AI photo analysis
- Multiple property management
- Annual compliance reminders
- Smoke alarm records
- Gas/electrical safety certificate uploads
- Tradie quote requests
