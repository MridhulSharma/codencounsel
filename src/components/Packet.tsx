import type { Parcel, PilotData } from '../types/data'
import type { Comparable } from '../lib/valuation/engine'
import type { PreparationState } from './Preparation'
import type { DeadlineInputs, DeadlineResult } from '../lib/deadlines/deadlines'
import { CHECKLIST, Review } from './Preparation'
import { Calculation, CompDetails, Estimate, Ratios } from './Comparables'
import { History, PermitList, PropertyFacts } from './Records'
import { DeadlineCards } from './Deadlines'
import { OFFICIAL_LINKS } from '../lib/legal/officialResources'
import { longDate, money, shortAddress } from '../lib/format'

export function Packet({
  parcel,
  data,
  comps,
  date,
  prep,
  deadlineInput,
  deadlines,
  flags,
}: {
  parcel: Parcel
  data: PilotData
  comps: Comparable[]
  date?: string
  prep: PreparationState
  deadlineInput: DeadlineInputs
  deadlines: DeadlineResult
  flags: string[]
}) {
  return (
    <article className="packet">
      <div className="no-print packet-toolbar">
        <div>
          <h2>Your evidence packet</h2>
          <p>Review below, then use Print → Save as PDF. Add your own dated photos separately.</p>
        </div>
        <button onClick={() => window.print()}>Print / Save as PDF</button>
      </div>
      <header className="packet-cover">
        <span className="brand">Level</span>
        <h2>Property assessment review</h2>
        <p>
          {shortAddress(parcel.address)} · Parcel {parcel.pid}
        </p>
        <p>
          Historical public-record analysis: FY{parcel.fiscalYear ?? 'unverified'}, valuation date{' '}
          {longDate(date)}.
        </p>
        <p>
          Prepared {new Date().toLocaleDateString('en-US')}. Legal information and document
          preparation only. Not an appraisal, legal advice, an official form, or a submitted
          application. No outcome or tax reduction is guaranteed.
        </p>
      </header>
      <section>
        <h2>Public property record</h2>
        <p>Recorded assessment: {money(parcel.totalValue)}</p>
        <PropertyFacts parcel={parcel} />
        <p>
          Source: {data.meta.source}. Independently verify all public records. No owner names are
          included.
        </p>
      </section>
      <section>
        <h2>Assessment history</h2>
        <History history={data.history[parcel.pid] ?? []} />
      </section>
      <Estimate parcel={parcel} comps={comps} date={date} />
      <section>
        <h2>Selected sales and show your work</h2>
        <CompDetails comps={comps} />
        <Calculation parcel={parcel} comps={comps} date={date} />
      </section>
      <section>
        <h2>Assessment ratio analysis</h2>
        <Ratios parcel={parcel} comps={comps} date={date} />
      </section>
      <section>
        <h2>Subject permit context</h2>
        <PermitList permits={data.permits[parcel.pid] ?? []} />
        <p>
          Permits do not prove completed work. Condo-unit joins may not include permits linked to
          the main parcel.
        </p>
      </section>
      <section>
        <h2>Your Form 128 preparation summary</h2>
        <dl className="facts">
          {[
            ['Address', prep.address],
            ['Parcel ID', prep.pid],
            ['Preparation fiscal year', prep.fiscalYear],
            [
              'Entered assessment',
              prep.assessment ? money(Number(prep.assessment)) : 'Not entered',
            ],
            [
              'Claimed fair cash value',
              prep.claimedValue
                ? money(Number(prep.claimedValue))
                : 'Not entered — homeowner decision',
            ],
            ['Ground to discuss', prep.ground],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || 'Not entered'}</dd>
            </div>
          ))}
        </dl>
        <h3>Your explanation</h3>
        <p className="preserve-text">{prep.explanation || 'Not entered.'}</p>
        <h3>Condition notes and corrections</h3>
        <p className="preserve-text">{prep.condition || 'Not entered.'}</p>
        <ul>
          {CHECKLIST.map((item) => (
            <li key={item}>
              {prep.checks.includes(item) ? 'Checked' : 'Not yet checked'}: {item}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Dates to confirm</h2>
        <p>
          Deadline fiscal year: {deadlineInput.fiscalYear ?? 'not entered'}. Bill due:{' '}
          {longDate(deadlineInput.billDueDate)}. Filed / planned:{' '}
          {longDate(deadlineInput.filingDate)}. Decision: {longDate(deadlineInput.decisionDate)}.
          Written extension: {deadlineInput.extensionAgreed ? 'yes' : 'not indicated'}.
        </p>
        <DeadlineCards result={deadlines} />
        <ul>
          {deadlines.assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </section>
      <Review flags={flags} />
      <section>
        <h2>Official resources</h2>
        <ul className="print-links">
          {(
            [
              'form128',
              'bostonHowToFile',
              'atbGuide',
              'atbFiling',
              'fees',
              'atbRules',
              'mglC59s59',
              'mglC59s64',
            ] as const
          ).map((id) => (
            <li key={id}>
              {OFFICIAL_LINKS[id].label}:{' '}
              <a href={OFFICIAL_LINKS[id].url}>{OFFICIAL_LINKS[id].url}</a>
            </li>
          ))}
        </ul>
        <p>
          Resources last reviewed September 27, 2026. This preparation packet must be reviewed and
          transferred to the official form. Level has not filed, signed, or decided legal
          eligibility.
        </p>
      </section>
    </article>
  )
}
