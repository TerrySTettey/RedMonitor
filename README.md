# RedMonitor

A public hotel guest feedback dashboard, designed for free GitHub Pages hosting.

## Your workflow

1. Put scanned forms or photos in **`feedback-inbox/`**.
2. Ask the assistant: **“Process the feedback inbox and update the dashboard.”**
3. The assistant reads the forms with AI, extracts ratings and themes, writes anonymous summaries and actionable findings, and updates the website's report data.
4. The local runner validates the prepared report, commits only the anonymous dataset and pushes to `TerrySTettey/RedMonitor`. The included GitHub Actions workflow rebuilds and publishes the site. The runner verifies the live report before reporting success.

The website displays the prepared report: reporting-period frequency, positive/mixed/negative/neutral sentiment, ranked concerns and praise, original 1–4 item ratings, anonymous summaries, and findings linked to supporting forms. Recommendations follow the selected reporting-period range, with separate prepared findings and evidence for each period. The folder is not watched automatically; ask for processing whenever you add a batch.

**Current report:** 180 distinct forms reconstructed from 127 PDF pages across eight scanned batches. Five repeated forms are excluded; entry 1 has no scans. Spreadsheet figures were not imported. Reporting-period labels come from supplied batch metadata, with date discrepancies disclosed.

Sentiment: 92 positive, 78 mixed, 9 negative, 0 neutral and 1 unclear. High-priority findings cover room locks and pest reports. GitHub Pages is configured at [the public dashboard](https://terrystettey.github.io/RedMonitor/).

## Privacy

`feedback-inbox/` and `.feedback-work/` are ignored by Git. Keep raw forms, guest details, and private working notes there. Do not force-add them to Git or upload them into the website's public directory.

Published reports contain batch reporting periods, anonymous response IDs, original item ratings, sentiment, concern/praise categories and reviewed paraphrases. The assistant removes identifying information before publishing. Anyone with access to the public website can view and download that report. Small batches can still reveal information through context, so anonymous prose needs review.

## Run locally

Use Node.js 22 or newer:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Checks:

```bash
npm test
npm run build
npm run preview
```

`npm run test:browser` tests the display, filtering, mobile layout, and error handling. It uses Chromium at `/usr/bin/chromium`; set `CHROMIUM_PATH` for another installation.

## Publish on GitHub Pages

1. Create a public GitHub repository and upload this project, including `.github/workflows/deploy.yml` and `package-lock.json`. Keep the private folders excluded.
2. Use `main` as the branch, or adjust the workflow's branch setting.
3. Open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Push to `main` or run **Actions → Deploy dashboard to GitHub Pages**.
5. GitHub displays your website URL when deployment succeeds.

The workflow validates the data, runs unit tests, builds the website, and deploys `dist`. Relative asset paths work with GitHub repository sites. [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

Every subsequent commit to `public/data/dashboard.json` triggers a fresh deployment. The site fetches the published report when opened or reloaded. Writing a local file alone does not update GitHub.

## Preparing reports

For the local inbox runner, see [Local automation](docs/LOCAL_AUTOMATION.md). Run it with `npm run feedback:process`; only new dated batch folders marked `READY` are eligible. On this computer, a user timer is enabled for Monday at 09:00 Africa/Accra, with a desktop reminder. Publishing targets `TerrySTettey/RedMonitor` and requires Pages to be enabled. Cloning the project elsewhere does not install the timer or GitHub credentials.

Detailed assistant instructions, extraction rules, and the report schema are in [Processing feedback](docs/PROCESSING_FEEDBACK.md).

After the assistant prepares `.feedback-work/report.json`:

```bash
npm run publish:report -- .feedback-work/report.json
npm test
npm run build
```

This updates the local public report. The command uses the full cumulative report and replaces the previous dataset; the assistant preserves existing records and tracks processed forms privately to prevent duplicate counting.

No AI service, API key, document scanner, or upload interface runs on the public website. AI processing happens in the assistant session. Missing or uncertain readings remain excluded from scores; unclear sentiment is shown separately from neutral. The dashboard calculates totals from the published records; narrative insights are prepared beforehand.
