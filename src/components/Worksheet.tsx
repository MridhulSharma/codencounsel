import { useMemo, useRef, useState } from 'react'
import type { Parcel, PilotData } from '../types/data'
import { rankComparables, estimateValue } from '../lib/valuation/engine'
import { money, shortAddress, longDate, pctChange } from '../lib/format'
import { calculateDeadlines, type DeadlineInputs } from '../lib/deadlines/deadlines'
import { initialPreparation, preparationWarnings, Preparation, Review } from './Preparation'
import { PropertyFacts, History, PermitList } from './Records'
import { Calculation, CompDetails, Estimate, Ratios } from './Comparables'
import { Deadlines } from './Deadlines'
import { Packet } from './Packet'

const STEPS = ['Property & evidence', 'Deadlines', 'Prepare Form 128', 'Packet & review'] as const
export function Worksheet({ parcel, data }: { parcel: Parcel; data: PilotData }) {
  const ranking = useMemo(() => rankComparables(parcel, data), [parcel, data])
  const [selected, setSelected] = useState(() => ranking.comps.map((c) => c.sale.id))
  const [step, setStep] = useState(0)
  const [prep, setPrep] = useState(() => initialPreparation(parcel))
  const [deadlineInput, setDeadlineInput] = useState<DeadlineInputs>({
    fiscalYear: parcel.fiscalYear,
    decisionReceived: false,
  })
  const title = useRef<HTMLHeadingElement>(null)
  const comps = useMemo(
    () => ranking.candidates.filter((c) => selected.includes(c.sale.id)),
    [ranking, selected],
  )
  const estimate = estimateValue(parcel.livingArea, comps, ranking.valuationDate)
  const deadlines = calculateDeadlines(deadlineInput)
  const history = data.history[parcel.pid] ?? []
  const last = history.at(-1),
    previous = history.at(-2)
  const flags = [...prep.complexities, ...preparationWarnings(prep)]
  if (!['CD', 'R1'].includes(parcel.landUse ?? '') || (parcel.resUnits ?? 0) > 1)
    flags.push(
      'Multiple units or a complex property type: a simple sales model may not capture income or mixed uses.',
    )
  if (!estimate || estimate.quality === 'Limited')
    flags.push(
      'Limited comparable evidence or substantial uncertainty: request additional sales or a professional valuation.',
    )
  if ((parcel.yearRemodeled ?? 0) >= (parcel.fiscalYear ?? 2026) - 3)
    flags.push('A recent remodel year is recorded. Confirm the work and relevant condition date.')
  if (comps.some((c) => c.permits.length > 0))
    flags.push(
      'One or more comparables have permit activity. Review whether work affects comparability.',
    )
  if (
    prep.pid !== parcel.pid ||
    prep.address !== shortAddress(parcel.address) ||
    Number(prep.assessment) !== parcel.totalValue
  )
    flags.push(
      'Preparation fields differ from the public record. Explain corrections; the valuation still uses the original record.',
    )
  if (
    Number(prep.fiscalYear) !== parcel.fiscalYear ||
    deadlineInput.fiscalYear !== parcel.fiscalYear
  )
    flags.push(
      'Preparation or deadline fiscal year differs from the dataset. Historical analysis cannot establish a later year’s fair cash value.',
    )
  function go(next: number) {
    setStep(next)
    setTimeout(() => {
      title.current?.focus()
      title.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
    }, 0)
  }
  return (
    <div className="worksheet">
      <header className="property-header">
        <div>
          <span className="pill">Boston · Allston / 02134 pilot</span>
          <h1>{shortAddress(parcel.address)}</h1>
          <p>
            Parcel {parcel.pid} · {parcel.landUseDesc || 'Property type not recorded'}
          </p>
        </div>
        <div className="assessment">
          <span>Recorded FY{parcel.fiscalYear ?? 'unverified'} assessment</span>
          <strong>{money(parcel.totalValue)}</strong>
          <small>Valuation date: {longDate(ranking.valuationDate)}</small>
        </div>
      </header>
      <div className="notice stale-notice">
        This dataset ends at FY2026. Its usual filing period has passed. Use this as a historical
        evidence demonstration; verify current assessments and deadlines before preparing a real
        application.
      </div>
      <nav className="step-nav no-print" aria-label="Assessment review steps">
        {STEPS.map((label, i) => (
          <button key={label} aria-current={step === i ? 'step' : undefined} onClick={() => go(i)}>
            <span>{i + 1}</span>
            {label}
          </button>
        ))}
      </nav>
      <h2 className="step-title no-print" ref={title} tabIndex={-1}>
        {STEPS[step]}
      </h2>
      {step === 0 && (
        <>
          <div className="overview-grid">
            <section className="surface">
              <h2>Your property, on record</h2>
              <PropertyFacts parcel={parcel} />
              <details>
                <summary>Does this information look correct?</summary>
                <p>
                  Public-record errors may be worth investigating, but do not automatically prove
                  entitlement to an abatement. Record discrepancies in your preparation notes and
                  contact the assessors. This analysis continues to use the recorded
                  characteristics.
                </p>
              </details>
            </section>
            <section className="surface">
              <h2>How your assessment changed</h2>
              {last && previous && previous[1] > 0 && last[0] === previous[0] + 1 && (
                <p className="history-change">
                  {pctChange(last[1] / previous[1] - 1)}{' '}
                  <span>
                    from FY{previous[0]} to FY{last[0]}
                  </span>
                </p>
              )}
              <History history={history} />
            </section>
          </div>
          <section className="section-space">
            <div className="section-heading">
              <div>
                <h2>Comparable sales</h2>
                <p>
                  Similar homes can help you understand fair cash value: the price a willing buyer
                  would pay a willing seller.
                </p>
              </div>
              <span className="pill">{comps.length} selected</span>
            </div>
            <p>
              Sales are screened before ranking. We use the 12 months before{' '}
              {longDate(ranking.valuationDate)} and the same residential type, prioritizing similar
              size and nearby properties.
            </p>
            {ranking.widened && (
              <p className="notice">
                Fewer than three close matches were available. The search widened to 24 months and
                ±50% living area; older or less similar sales reduce evidence quality.
              </p>
            )}
            {ranking.candidates.length ? (
              <details>
                <summary>Review or change selected comparables</summary>
                <p>
                  Select up to five. At least three are needed for an estimate. Changing the
                  evidence changes your results and packet.
                </p>
                <fieldset>
                  <legend>Candidate sales</legend>
                  {ranking.candidates.map((c) => (
                    <label className="check" key={c.sale.id}>
                      <input
                        type="checkbox"
                        checked={selected.includes(c.sale.id)}
                        disabled={!selected.includes(c.sale.id) && selected.length >= 5}
                        onChange={(e) =>
                          setSelected((ids) =>
                            e.target.checked
                              ? [...ids, c.sale.id]
                              : ids.filter((id) => id !== c.sale.id),
                          )
                        }
                      />
                      {shortAddress(c.parcel.address)} · {longDate(c.sale.date)} ·{' '}
                      {money(c.sale.price)}
                    </label>
                  ))}
                </fieldset>
                <button
                  className="secondary"
                  onClick={() => setSelected(ranking.comps.map((c) => c.sale.id))}
                >
                  Restore suggested comparables
                </button>
              </details>
            ) : (
              <p className="notice">
                No suitable sales found. Complex types, missing area, or limited records can prevent
                analysis. Search another property or gather records with a reviewer.
              </p>
            )}
            <Estimate parcel={parcel} comps={comps} date={ranking.valuationDate} />
            <details className="show-work">
              <summary>Show your work</summary>
              <CompDetails comps={comps} />
              <Calculation parcel={parcel} comps={comps} date={ranking.valuationDate} />
              <h3>How sales are ranked</h3>
              <p>
                Same type: weight 25; living area: 30; bedrooms: 8; bathrooms: 8; year built: 7; lot
                area for non-condos: 5; recorded condition: 5; approximate distance: 12; recency:
                10. Missing dimensions are omitted and remaining weights are normalized. Scores rank
                similarity, not legal merit or model accuracy.
              </p>
              <p>
                One sale per comparable property. Primary size band is ±30%; the wider band is ±50%.
                Distance, where available, is limited to two miles. No sales after the valuation
                date are used.
              </p>
              <details>
                <summary>Sale screening and excluded records ({ranking.rejected.length})</summary>
                <p>
                  Exclusions include missing/nominal prices, invalid dates, missing area, duplicate
                  transactions, multi-parcel deeds, potentially related parties, non-standard deeds,
                  low-confidence linkage, and prices outside $100–$2,500 per recorded square foot.
                  These are cautious screening choices, not findings that a sale was improper.
                </p>
                <p>
                  Preprocessing also omits unlinked sales, source-marked duplicates, and pre-2019
                  transactions. Name overlap is a heuristic that can exclude legitimate sales.
                </p>
                <ul>
                  {Object.entries(
                    ranking.rejected.reduce<Record<string, number>>((counts, r) => {
                      for (const reason of r.reasons) counts[reason] = (counts[reason] ?? 0) + 1
                      return counts
                    }, {}),
                  ).map(([reason, n]) => (
                    <li key={reason}>
                      {reason}: {n} records
                    </li>
                  ))}
                </ul>
                <p>Counts overlap when a record has multiple issues.</p>
              </details>
            </details>
          </section>
          <section className="surface section-space">
            <h2>Assessment ratios: another question to explore</h2>
            <Ratios parcel={parcel} comps={comps} date={ranking.valuationDate} />
          </section>
          <section className="section-space">
            <details>
              <summary>Permit context for your property</summary>
              <PermitList permits={data.permits[parcel.pid] ?? []} />
              <p>
                Linked records since 2016. Permits may indicate activity, not completed renovations.
                Condo permits may be linked to a different main parcel.
              </p>
            </details>
          </section>
        </>
      )}
      {step === 1 && (
        <section className="surface">
          <Deadlines input={deadlineInput} onChange={setDeadlineInput} result={deadlines} />
        </section>
      )}
      {step === 2 && (
        <section className="surface">
          <Preparation state={prep} onChange={setPrep} comps={comps} />
        </section>
      )}
      {step === 3 && (
        <Packet
          parcel={parcel}
          data={data}
          comps={comps}
          date={ranking.valuationDate}
          prep={prep}
          deadlineInput={deadlineInput}
          deadlines={deadlines}
          flags={flags}
        />
      )}
      {step < 3 && (
        <div className="next-step no-print">
          <p>Your notes stay in this tab. Reloading or clearing ends this session.</p>
          <button onClick={() => go(step + 1)}>Continue to {STEPS[step + 1]}</button>
        </div>
      )}
      {step === 2 && <Review flags={flags} />}
    </div>
  )
}
