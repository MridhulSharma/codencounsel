# Level

**Understand your property assessment. Build your evidence. Know your deadlines.**

Built for **Code + Counsel — Building Common Ground**, September 27, 2026.

Level is a free, client-side property-tax review worksheet for Suffolk County homeowners. It connects real public records to transparent comparable-sales analysis, deadline planning, Form 128 preparation, and a printable evidence packet. It provides **legal information and document preparation**, not individualized legal advice or an appraisal. It never determines legal eligibility, promises savings, files, or signs anything.

## Run the demo

Requires modern Node.js (tested with 26.9.0) and npm. No API key, account, backend, or local database is needed to run the committed static pilot.

```bash
git switch feat/level-property-tax-tool
npm ci
npm run dev -- --host 127.0.0.1
```

Open **http://127.0.0.1:5173**. Choose **Try a demo property**: **59 Brighton Av, Unit 59-3**, parcel **2100566042**.

Presentation path:

1. Search `59 Brighton Avenue unit 59-3`, or use the demo button.
2. Review the $494,400 FY2026 assessment, property characteristics, and history.
3. Open **Show your work** for five actual sales and the calculation. Change selected comps to see the estimate and packet update.
4. Review assessment ratios and permit context.
5. Continue to **Deadlines**. For an explicitly hypothetical example, enter FY2027, bill due `2027-02-01`, and planned filing `2027-01-29`. Export the calendar. These are demonstration inputs, not database facts.
6. Continue to **Prepare Form 128**, enter an example claimed value and notes, and check an evidence item.
7. Continue to **Packet & review**, inspect the summary, then **Print / Save as PDF**.
8. Read **Before you file**, then open the official form or Boston filing instructions. Level does not submit anything.

The demo was chosen for complete records, not a tax-reduction story. Its model range is **$521,000–$637,000**, central estimate **$579,000**. Its assessment is below that range; the evidence does not support an overvaluation conclusion. The estimate is historical and uncertain.

## Coverage and limits

- **4,428 Allston / ZIP 02134 parcels**, including non-residential records. Automated comps support matching condo, single-, two-, and three-family categories. Other types can use records and preparation without a valuation.
- Latest assessments: **FY2026**, valuation date **January 1, 2025**. The ordinary FY2026 filing window has passed. FY2027 assessment records are not present; later sales are not used to imply current-year evidence.
- Other Boston neighborhoods, Chelsea, Revere, and Winthrop have official-resource links, not searchable datasets.
- Sale screening does not verify arm’s-length status. Current characteristics may differ from sale-time characteristics. Distance uses approximate polygon centers.
- Permit joins use exact parcel IDs. Condo-main permits may not attach to units. Absence of permits is not absence of work.
- No dollar adjustments for renovations, condition, rooms, age, or market movement. The estimate is not an appraisal, equalization study, or legal finding.
- Revised bills, ownership complications, extensions, and office closures need human review.
- Some government sites restrict automated retrieval. Official URLs and alternate directories are provided; external availability is beyond Level's control.

## Architecture

```text
Read-only SQLite (preprocessing only)
  → scripts/export-data.py
  → search.json                              loaded on first search
  → parcels/sales/history/permits/meta.json   loaded on property selection
  → PropertySource interface
  → deterministic analysis + React worksheet
  → local calendar download / browser print
```

Vite, React, strict TypeScript, Tailwind CSS v4, and Radix Dialog. No server, model API, tracking SDK, router, or PDF runtime. Four worksheet steps share in-memory state. Search is debounced, pre-normalized, capped at 12 matches, and handles case, whitespace, punctuation, and common street suffixes. Numeric unit/house tokens cannot match digits inside ZIP codes.

`src/lib/data.ts` defines `PropertySource`: `searchProperties`, `getProperty`, `getAssessmentHistory`, `getSales`, `getPermits`, `getTaxInformation`, and `loadAnalysis`. Future CKAN/municipal adapters implement that contract. Components consume normalized objects, not SQL fields. Public datasets are cached in memory; parcel lookups use a Map.

`src/lib/valuation` contains pure screening, ranking, valuation, ratio, statistics, and permit rules. `src/lib/deadlines` contains date-only arithmetic and RFC 5545 exports. Legal URLs/copy are centralized in `src/lib/legal/officialResources.ts`.

## Reproduce the data

Original: **`~/Downloads/Copy of 02134.db`**, approximately 38 MB, unchanged and uncommitted. Python 3's standard SQLite library is used only during preprocessing.

```bash
ls -lh ~/Downloads/"Copy of 02134.db"
sqlite3 ~/Downloads/"Copy of 02134.db" ".tables"
npm run export-data -- ~/Downloads/"Copy of 02134.db"
```

The exporter opens with `mode=ro`, explicitly maps safe fields, verifies the fiscal year against historical assessment amounts, and writes deterministic compact JSON:

| File                   | Contents                                                       | Approximate uncompressed size |
| ---------------------- | -------------------------------------------------------------- | ----------------------------: |
| search.json            | Address, ID, type                                              |                        368 KB |
| parcels.json           | Public characteristics and tax fields                          |                        2.8 MB |
| sales.json             | 1,428 linked/source-retained sales since 2019, screening flags |                        280 KB |
| history.json           | FY2012–2026 history for 4,428 parcels                          |                        948 KB |
| permits.json           | Structured linked permits since 2016 for 1,248 parcels         |                        892 KB |
| meta.json / audit.json | Provenance, counts, quality audit                              |                         <8 KB |

Tables used for frontend content: `parcel`, `sale`, `assessment_history`, `tax_bill`, `permit`. Other counts are audited, not exported. Missing fields are omitted, not replaced with zero. No owner names, mailing addresses, deed-party names, permit applicants, or free-text descriptions/comments. No SQLite browser runtime. Read [the takeover/data audit](docs/AUDIT.md).

## Comparable methodology

Preprocessing honors `rank_keep = 1`, excludes unlinked/pre-2019 sales, and deduplicates `(pid,date,price)`. Shared deed book/page across parcel IDs flags multi-parcel sales. Overlapping meaningful party-name tokens flag potentially related transfers without exporting names; this can exclude legitimate sales.

Runtime rejects missing/non-positive prices, prices below $10,000 or above $20 million, invalid dates, absent usable area, duplicate transactions, foreclosure/confirmatory/master deeds, multi-parcel flags, possible related parties, low-confidence linkage, and **prices outside $100–$2,500/current recorded sqft**. These are disclosed screening limits, not conclusions about improper transactions. Rejection counts/reasons appear in Show your work.

Candidates must be another parcel with the same `landUse` **and** `landUseDesc`, sold no later than the valuation date. Primary pool: preceding 12 months and area within ±30%. If fewer than three unique parcels qualify, widen to 24 months and ±50%. Exclude distances over two miles when coordinates exist. Keep each parcel's latest eligible sale.

For each available dimension, multiply similarity by weight; divide the sum by available weights. Missing dimensions are omitted:

| Dimension                  | Weight | Similarity                                        |
| -------------------------- | -----: | ------------------------------------------------- |
| Property type              |     25 | 1 if equal; candidate gate also requires equality |
| Living area                |     30 | `max(0,1−difference/(subject_area×0.5))`          |
| Bedrooms                   |      8 | `max(0,1−difference/3)`                           |
| Bathrooms                  |      8 | Full + half×0.5; `max(0,1−difference/2)`          |
| Year built                 |      7 | `max(0,1−difference/100)`                         |
| Lot area, excluding condos |      5 | `max(0,1−difference/subject_lot_area)`            |
| Overall condition          |      5 | 1 if equal, otherwise 0                           |
| Approximate distance       |     12 | `max(0,1−miles/2)`                                |
| Recency                    |     10 | `max(0,1−months/24)`; months = days/30.4375       |

Differences are absolute. Sort by score descending, sale date descending, then parcel ID. Suggest up to five; show up to 15 alternatives. Score ≥0.8: Very similar; ≥0.65: Similar; otherwise Less similar. Scores indicate similarity, not accuracy or legal merit.

## Valuation

Require positive subject area and at least three usable selected sales. Each comp's price/sqft uses sale price divided by recorded parcel living area.

- Central: median price/sqft × subject area, rounded to nearest $1,000.
- Lower: `min(25th percentile,90% of median)×area`, rounded down to $1,000.
- Upper: `max(75th percentile,110% of median)×area`, rounded up to $1,000.
- Percentiles use linear interpolation. The minimum ±10% margin remains even for identical sales; this is not a statistical confidence interval.

Evidence quality is **Limited** if coefficient of variation >0.30, any sale >12 months old, any comp has >2 missing dimensions, or mean similarity <0.65. Otherwise **Strong** requires ≥5 comps, mean similarity ≥0.80, and variation <0.15; otherwise **Moderate**. Variation uses sample standard deviation/mean. All factors are explained on screen.

## Assessment ratios

Subject: same-year assessment / model central estimate. Comp: same-year assessment / actual price. A reference median requires ≥3 same-year assessments with sales within the 12 months before January 1. Older ratios can be shown but are excluded from the reference. Missing/mismatched years or zero/missing denominators produce no ratio.

The different denominator types and unadjusted transaction dates are disclosed. This selected sample is not a municipal assessment-ratio study and does not establish disproportionate assessment.

## Deadlines and legal safeguards

Calendar dates use ISO strings and UTC components, never local-time parsing. Three-month addition clamps to the ending month's last day. Invalid dates are rejected.

- Abatement uses the entered first **actual** bill due date; no inference from fiscal year.
- Local Saturday/Sunday/holiday endings advance to the next standard business day under G.L. c.59 §59. The statute allows the next day a municipal office is open; local/emergency closures must be confirmed.
- Assessor checkpoint: filing +3 nominal calendar months, with closure/extension caveats.
- ATB: action date +3 months, or nominal deemed denial +3 months. Rule 1.36 extends Saturday, Sunday, and legal-holiday endings. A late action does not silently restart the clock. Invalid/inconsistent inputs withhold a calculation.
- Written extensions stop inferred deemed-denial/ATB dates without an actual action date.
- UI warns about forfeited deadlines, continued payment obligations, complex cases, and the need for human review. Official forms only; no identity or signature collected.

The brief's small-claims/$65 shorthand is corrected: local property appeals use formal/informal ATB procedures and assessed-value-based fees. See [legal source review](docs/LEGAL_SOURCES.md).

## Privacy and accessibility

Entries remain in React memory and disappear on reload. No localStorage, sessionStorage, accounts, server profiles, remote photos, analytics, or external fonts. Clear my data clears the session, not downloaded files. Static hosts may retain ordinary request logs. Photos are a checklist item; homeowners attach files separately.

Semantic landmarks, skip link, labeled controls, ARIA autocomplete with arrow/Enter/Escape handling, live announcements, visible focus, keyboard disclosures, Radix dialog focus trapping, underlined links, chart/table equivalents, responsive tables, reduced-motion and print styles target WCAG 2.1 AA. Browser tests exercise 375/768/1024/1440 px and axe checks. This is not accessibility certification or a substitute for real screen-reader/user testing.

## Verification commands

```bash
npm test
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
git diff --check
```

Browser tests start the local server if needed and generate ignored screenshots/PDFs in `test-results/`. Synthetic fixtures test edge cases; real-pilot integration tests verify the demo. No synthetic records ship as public data.

```bash
TZ=America/Los_Angeles npm test -- src/lib/deadlines/deadlines.test.ts
TZ=Asia/Tokyo npm test -- src/lib/deadlines/deadlines.test.ts
```

## Deployment and roadmap

Vercel/Netlify: Vite preset, `npm ci`, `npm run build`, publish `dist`. No secrets, backend, DB upload, or custom route rewrites. Preview with `npm run preview -- --host 127.0.0.1`. Deploy compatibility does not imply a hosted deployment was created.

Next: municipality-specific adapters, stronger sale-linkage validation, source-version manifests, finer data chunks as coverage grows, translations, professional legal/valuation review, and assistive-technology user testing before wider production use.
