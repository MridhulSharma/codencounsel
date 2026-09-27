# Level repository instructions

Mission: help Suffolk County homeowners understand assessments, review evidence, and prepare for human review of an abatement request. Working data pilot: Allston / 02134 only.

## Architecture

- Vite, React, strict TypeScript, Tailwind, Radix Dialog.
- `PropertySource` in `src/lib/data.ts` abstracts static records. Deterministic analysis: `src/lib/valuation` and `src/lib/deadlines`.
- `scripts/export-data.py` opens `~/Downloads/Copy of 02134.db` read-only. Never move, delete, or commit the original database.
- No backend, model calls, analytics, accounts, owner profiles, or automatic filing. Inputs live in tab memory; preserve clear-session behavior.

## Guardrails

- Never fabricate government data, official URLs, legal rules, comparables, eligibility decisions, or appraisal confidence.
- Never guarantee savings/success, sign forms, file appeals, or make the homeowner's decision.
- Show evidence, calculations, assumptions, missing data, uncertainty, fiscal year, and valuation date. FY2026 records cannot be presented as FY2027 evidence.
- Never export owner names, mailing addresses, grantors/grantees, permit applicants, or free-text permit narratives.
- Centralize legal links/copy in `officialResources.ts`. Verify against official sources and document access limitations.
- ATB local-property appeals are not state-tax small claims; no blanket $65 property filing fee.
- Use calendar-date-safe arithmetic. Keep local and ATB weekend rules distinct. Never infer a confirmed deadline from fiscal year alone.
- Preserve human review and unrestricted access to official resources. Flag complex cases without determining legal eligibility.

## Accessibility and testing

Use semantic HTML, labels, visible focus, live feedback, keyboard autocomplete, meaningful links, chart text equivalents, contrast, responsive overflow handling, and reduced motion. Automated WCAG checks do not justify claiming certification.

```bash
npm ci
npm run dev -- --host 127.0.0.1
npm run export-data -- ~/Downloads/"Copy of 02134.db"
npm test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
git diff --check
```

Browser tests need `npx playwright install chromium`. Verify the entire workflow and print output when shared state or exports change. Add regression tests for valuation, date, and search issues. Ignore databases, node_modules, secrets, builds, and test artifacts. Feature branches only; never force-push.
