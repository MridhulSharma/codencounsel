import type { Parcel } from '../types/data'
import type { Comparable } from '../lib/valuation/engine'
import { estimateValue, ratioAnalysis } from '../lib/valuation/engine'
import { longDate, money, pct, ratio, shortAddress, sqft } from '../lib/format'
import { PermitList } from './Records'

export function Estimate({
  parcel,
  comps,
  date,
}: {
  parcel: Parcel
  comps: Comparable[]
  date?: string
}) {
  const estimate = estimateValue(parcel.livingArea, comps, date)
  return (
    <section className="estimate-panel" aria-labelledby="estimate-title">
      <div>
        <p className="small">Informational estimate · FY{parcel.fiscalYear ?? 'not recorded'}</p>
        <h2 id="estimate-title">What do the sales suggest?</h2>
        {estimate ? (
          <>
            <p className="value-range">
              {money(estimate.low)} – {money(estimate.high)}
            </p>
            <p>
              Central estimate {money(estimate.central)} · {comps.length} comparable sales
            </p>
            <p>
              {parcel.totalValue && parcel.totalValue > estimate.high
                ? 'The selected sales suggest a range below the recorded assessment.'
                : parcel.totalValue && parcel.totalValue < estimate.low
                  ? 'The recorded assessment is below this informational range.'
                  : 'The available evidence does not show a clear difference between the assessment and this range.'}
            </p>
            <p>
              Assessment minus central estimate:{' '}
              {money((parcel.totalValue ?? NaN) - estimate.central)} (
              {pct(parcel.totalValue ? parcel.totalValue / estimate.central - 1 : undefined)} of the
              central estimate). This is not a tax-savings calculation.
            </p>
            <p>
              <strong>Evidence quality: {estimate.quality}</strong>
            </p>
            <p className="small">{estimate.explanation}</p>
          </>
        ) : (
          <p>
            Not enough evidence to estimate a range. A supported residential type, usable living
            area, a verified assessment year, and at least three selected sales are required. A
            navigator or assessor can help locate additional records.
          </p>
        )}
        <p className="small">
          Not an appraisal or a prediction of an abatement. Values refer to {longDate(date)}; they
          are not today’s market value.
        </p>
      </div>
    </section>
  )
}
export function CompDetails({ comps }: { comps: Comparable[] }) {
  return (
    <div className="comp-list">
      {comps.map((c) => (
        <article className="comp" key={c.sale.id}>
          <div className="comp-heading">
            <div>
              <h3>{shortAddress(c.parcel.address)}</h3>
              <p className="small muted">
                {c.score >= 0.8 ? 'Very similar' : c.score >= 0.65 ? 'Similar' : 'Less similar'} ·
                Parcel {c.parcel.pid}
              </p>
            </div>
            <strong>{money(c.sale.price)}</strong>
          </div>
          <p>
            {longDate(c.sale.date)} · {sqft(c.parcel.livingArea)} · {money(c.ppsf)}/sq ft
          </p>
          <p className="small">
            Source: {c.sale.source || 'Not recorded'}
            {c.sale.deedRef ? `; deed ${c.sale.deedRef}` : ''}. Source linkage:{' '}
            {c.sale.confidence || 'not recorded'}; arm’s-length status is not verified.
          </p>
          <ul className="differences">
            {c.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {c.missing.length > 0 && (
            <p className="small">Missing comparison fields: {c.missing.join(', ')}.</p>
          )}
          {c.permits.length > 0 && (
            <aside className="notice">
              <strong>Permit activity to review</strong>
              <p>
                Linked permits may indicate work. They do not establish completed renovations or
                condition at the sale.
              </p>
              <PermitList permits={c.permits} />
            </aside>
          )}
        </article>
      ))}
    </div>
  )
}
export function Calculation({
  parcel,
  comps,
  date,
}: {
  parcel: Parcel
  comps: Comparable[]
  date?: string
}) {
  const v = estimateValue(parcel.livingArea, comps, date)
  return (
    <div className="calculation">
      <h3>The calculation</h3>
      {v ? (
        <>
          <p>
            Median comparable sale price per square foot ({money(v.medianPpsf)}) × your recorded
            living area ({sqft(parcel.livingArea)}) = {money(v.central)}, rounded to the nearest
            $1,000. Displayed price per square foot is rounded; the calculation uses full precision.
          </p>
          <p>
            Lower bound: the smaller of the 25th percentile or 90% of median price per square foot,
            multiplied by your area and rounded down to $1,000. Upper bound: the larger of the 75th
            percentile or 110% of the median, multiplied by your area and rounded up.
          </p>
        </>
      ) : (
        <p>No calculation is made with fewer than three usable sales.</p>
      )}
      <p>
        No dollar adjustments are made for condition, rooms, age, or market movement. Current
        recorded area may differ from area at sale. The range describes variation plus a minimum 10%
        margin; it is not a statistical confidence interval. Condo land area is not used in ranking.
      </p>
    </div>
  )
}
export function Ratios({
  parcel,
  comps,
  date,
}: {
  parcel: Parcel
  comps: Comparable[]
  date?: string
}) {
  const value = estimateValue(parcel.livingArea, comps, date)
  const analysis = ratioAnalysis(parcel, comps, value?.central)
  return (
    <>
      <p>
        Disproportionate assessment means assessment at a higher proportion of value than relevant
        other properties. These exploratory ratios compare the same fiscal year, with different
        kinds of value evidence.
      </p>
      <div className="metrics">
        <div>
          <span>Your assessment ÷ central estimate</span>
          <strong>{ratio(analysis.subjectRatio)}</strong>
        </div>
        <div>
          <span>Median comparable assessment ÷ sale price</span>
          <strong>{ratio(analysis.reference)}</strong>
        </div>
      </div>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Assessment ratios">
        <table>
          <caption>FY{parcel.fiscalYear ?? 'unverified'} assessment-to-sale ratios</caption>
          <thead>
            <tr>
              <th scope="col">Comparable</th>
              <th scope="col">Sale date</th>
              <th scope="col">Ratio</th>
            </tr>
          </thead>
          <tbody>
            {analysis.rows.map((r) => (
              <tr key={r.pid}>
                <th scope="row">{shortAddress(r.address)}</th>
                <td>{longDate(r.date)}</td>
                <td>{ratio(r.ratio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        {analysis.reference === undefined
          ? 'No reference median: at least three sales in the 12 months before the valuation date with matching assessment years are needed.'
          : `The reference uses ${analysis.referenceCount} same-year assessments and sales within the preceding 12 months.`}
      </p>
      <p className="notice">
        Sale prices are not adjusted to the valuation date. Your denominator is a model estimate;
        comparable denominators are transaction prices. This small, selected sample is not a
        municipal equalization study and does not establish disproportionate assessment or legal
        eligibility.
      </p>
    </>
  )
}
