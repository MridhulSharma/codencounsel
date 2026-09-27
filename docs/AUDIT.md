# Takeover and data audit — September 27, 2026

## Repository at takeover

Inspected status, remotes, branches, commit history, staged/unstaged diffs, tracked tree, and untracked files. `main`, `origin/main`, and `feat/level-property-tax-tool` all pointed to `5042e54` (Initial commit), containing only README.md. No Claude commits or staged/modified tracked files. The feature branch was retained. No reset/clean was run.

Claude's untracked work comprised package/lock/config files, Python export script, five JSON files, favicon, data types, format/statistics/permit/date/ICS helpers, and legal resources. Dependencies were installed. The HTML referenced a missing main.tsx; no UI, source adapter, valuation engine, or tests existed. Initial npm test failed: “No test files found.”

Kept and extended useful tooling, SVG, export mapping, and helpers. Corrected fiscal-year verification, permit privacy, legal URLs, date safeguards, and ICS escaping. Added the complete workflow, deterministic analysis, source abstraction, tests, docs, and QA. Regenerated exports from the actual database. No raw database, secrets, or build/test artifacts were committed.

## Dataset

Verified original: `/Users/taswarmahbub/Downloads/Copy of 02134.db`, approximately 38 MB.

SHA-256: `4ec160834d4145008ae5dbbfde3d926b682c589027175489b9b194c13e384b7f`.

Inspected tables, full schema, non-PII representative records, fiscal-year distributions, land-use types, source/deed/linkage groups, and joins. Content tables: `parcel`, `sale`, `assessment_history`, `tax_bill`, `permit`. Join key: `pid`, or `permit.parcel_id = parcel.pid`. Other tables are unnecessary for frontend content.

| Table              | Verified count |
| ------------------ | -------------: |
| parcel             |          4,428 |
| sale               |         11,493 |
| assessment_history |        168,252 |
| tax_bill           |          8,850 |
| owner              |          4,392 |
| permit             |         12,992 |
| zoning             |          2,179 |
| building           |          9,847 |
| title_doc          |         47,196 |

| Quality check                                     | Count |
| ------------------------------------------------- | ----: |
| Duplicate parcel groups                           |     0 |
| Duplicate `(pid,date,price)` sale groups          | 1,275 |
| Unlinked sale IDs                                 | 2,956 |
| Missing prices                                    |   910 |
| Zero/negative prices                              |     0 |
| Sales below $10,000                               | 2,827 |
| SQLite-unparseable dates                          |     0 |
| Missing/non-positive parcel area                  |   394 |
| Missing property type                             |     0 |
| Missing assessment year                           |     0 |
| Duplicate parcel/year history                     |     0 |
| Unmatched non-null permit IDs                     |   924 |
| Linked raw sales outside $100–$2,500/current sqft | 2,466 |
| FY2026 history/parcel assessment mismatch         |     0 |

Counts overlap and are not additive. `audit.json` reproduces most checks. Runtime additionally performs strict calendar validation. Latest raw sale: September 4, 2026; FY2026 analysis excludes sales after January 1, 2025.

Export: 4,428 parcels, 1,428 sales before runtime screening, history for 4,428 parcels, permits for 1,248 parcels. Owner/deed-party names and permit narrative text are omitted. Original remains unchanged.

Demo: `2100566042`, 59 Brighton Av 59-3, a 965-sq-ft condo with consistent assessments and enough same-type nearby sales. Chosen for completeness, without a preferred estimate direction. Its assessment is below the resulting informational range.
