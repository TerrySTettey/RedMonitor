# Processing hotel feedback

The website is a public viewer. AI document reading and synthesis happen in the assistant session, outside the website.

## Files and privacy

- `feedback-inbox/`: original scans and photos, ignored by Git except `.gitkeep`.
- `.feedback-work/`: private rendered pages, readings, source hashes, response manifest, duplicates and report drafts. Entirely ignored by Git.
- `public/data/dashboard.json`: the only published dataset.

Never put scans, names, contact details, signatures, room numbers, booking identifiers or private provenance in public assets, source code, documentation or Git history. Do not force-add private files. Public summaries are anonymous paraphrases, not identifying quotations.

## Read the evidence

1. Read the existing public report and private manifests before processing. Preserve stable anonymous response IDs and existing records when adding batches.
2. Visually inspect every source page using AI. Render PDF pages privately if necessary. Do not substitute a keyword classifier or spreadsheet data for reading the selected answers and handwritten comments.
3. The user has explicitly excluded spreadsheet figures. Use spreadsheet filenames or structure only as reference metadata. Do not import spreadsheet scores, counts or comments. Do not infer intentional misconduct from differences or missing evidence.
4. Track source PDFs by SHA-256 and map each form to its file, page and side in `.feedback-work/processed-files.json`. Check for repeated scans and rescans. Different forms from the same guest are not automatically duplicates. Count distinct forms, not unique people.
5. Count multiple forms on one page separately. Join reverse-side continuations to the original form. Exclude blank/failed pages and confirmed repeated copies, and reconcile all source pages.
6. The current questionnaire has 18 items on a native **1–4** scale: 1 Needs improvement, 2 Average, 3 Good, 4 Excellent. There is **no overall score**. Preserve each readable item mark. Never convert to 1–5 or infer an overall guest rating. Null means blank, N/A or unreadable; `uncertainItems` distinguishes ambiguous/cropped/overwritten marks from blank answers.
7. Use supplied batch reporting periods when individual dates are absent or inconsistent. These labels are reference metadata, not verified guest-response dates. Note conflicts. Do not infer dates from upload timestamps or allocate crossing-week forms to calendar months. Missing scans mean an unknown count, not zero.
8. Interpret sentiment from comments and selected answers together:
   - **Positive:** favourable comments and/or predominantly good/excellent marks with no clear complaint. Average marks alone need not make it mixed.
   - **Mixed:** favourable evidence plus a complaint, specific improvement request or needs-improvement mark. Preserve disagreement between comments and ticks.
   - **Negative:** predominantly adverse assessment.
   - **Neutral:** readable feedback without a favourable or adverse assessment.
   - **Unclear:** insufficient readable evidence. Never use neutral for unreadable text or blank responses.
9. Assign specific `concerns` and `praises` from the supported area taxonomy in `src/analysis.js`. Concern evidence is a written issue/request or explicit score 1. Praise tags require explicit favourable comments; they do not count every positive tick. One form can praise and criticize the same area. Do not transfer overall negative sentiment to unrelated topics.
10. Prioritize potential-impact issues such as room locks and pests independently of frequency. Describe them as guest reports and propose proportionate checks; do not state unverified allegations as facts.

## Public schema: version 3

The executable schema and item order are in `src/analysis.js` (`validateReport`, `ITEMS`, `AREA_GROUPS`). Unknown fields are rejected to help prevent accidental private-data publication.

- Report: `version: 3`, `hotelName`, `publishedAt` (ISO timestamp or null before publishing), `executiveSummary`, `periods`, `records`, `insights`, and optional `periodInsights`.
- Period: anonymous `id` (`period-001` etc.), `label`, `start`, `end` (YYYY-MM-DD), `status` (`scanned` or `missing`), `scannedPages`, `blankPages`, `observedForms`, `duplicateForms`, `note`.
- Missing period: zero scanned pages, zero duplicates, `observedForms: null`. No feedback records can belong to it.
- Scanned period: `observedForms` equals included records plus duplicate forms. This is a form count, not PDF page count; one page can contain multiple forms or a continuation.
- Record: `id` (`response-001` etc.), `periodId`, `scores` (18 values, each integer 1–4 or null), `uncertainItems` (zero-based indices into null scores), `sentiment`, `concerns`, `praises`, `summary`.
- Period insight: the insight fields below plus `periodId`. Every supporting response must belong to that scanned period. Prepare period-specific wording, counts and actions outside the website; do not reuse all-period statistics for a selected period.
- Insight: `type` (`strength`, `opportunity`, `observation`), `priority` (`high`, `routine`), `title`, `detail`, `recommendation`, `responseIds` (existing distinct IDs).

The item order follows the form: accommodation (3), food (5), recreation (2), service (5), venue (3). Consult `ITEMS` for exact labels.

## Synthesis and verification

- Write anonymized evidence-linked findings. Each referenced response must support the specific claim.
- Check every stated count against the prepared records. Counts for overlapping topics cannot be added as unique forms.
- The mean item score uses all readable item marks, not a mean of inferred guest ratings. Report the denominator. Blank/N/A/ambiguous scores are excluded. Forms with more marked items contribute more marks.
- Frequency filters include whole reporting periods. Missing batches stay visible as unknown. Unsupplied periods are omitted. These data cannot determine response rates or occupancy.
- Prepare both complete-report narratives and period-specific findings. Reporting-period filters select prepared period findings; multiple periods show separately labeled findings. The complete-report executive summary is hidden for period selections. Sentiment, area and search filters affect charts and response lists. The website does not generate recommendations.
- Review public prose for identifying details and factual accuracy. Schema validation does not prove anonymity or accurate visual reading.

## Update and deploy

1. Prepare the full cumulative dataset in `.feedback-work/report.json`. Preserve existing IDs and source links; use the private manifest to avoid recounting old scans.
2. Run `npm run publish:report -- .feedback-work/report.json`. Validation happens before the public file is atomically replaced. Empty/invalid input preserves the previous report.
3. Run `npm test` and `npm run build`. Run `npm run test:browser` for material interface/data-shape changes. `REDMONITOR_PREVIEW=1 npm run test:browser` checks the production build.
4. Update relevant dataset reconciliation tests when a new batch changes expected totals. Do not change expectations to hide unexplained mismatches.
5. Review and commit only intended website/report changes. Push to the configured GitHub repository when the task authorizes publishing and repository access is available. Never blindly stage the inbox.
6. Verify deployment before claiming the website is live. If no repository is configured, state that the report is updated locally.
7. Report the distinct-form count, major findings, uncertainties and deployment status.

Placing files in the folder does not trigger processing automatically. The user asks the assistant to process new batches.
