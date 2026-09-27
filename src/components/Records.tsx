import type { AssessmentHistory, Parcel, Permit } from '../types/data'
import { codeLabel, count, longDate, money, pctChange, sqft } from '../lib/format'

export function PropertyFacts({ parcel: p }: { parcel: Parcel }) {
  const facts = [
    ['Parcel ID', p.pid],
    ['Property type', p.landUseDesc],
    ['Living area', sqft(p.livingArea)],
    ['Lot area', sqft(p.landSf)],
    ['Bedrooms', count(p.bedrooms)],
    ['Full / half baths', `${count(p.fullBaths)} / ${count(p.halfBaths)}`],
    ['Year built', p.yearBuilt ? String(p.yearBuilt) : undefined],
    ['Units', count(p.resUnits)],
    ['Condition', codeLabel(p.overallCondition)],
    ['Land assessment', money(p.landValue)],
    ['Building assessment', money(p.buildingValue)],
    ['Gross tax (before exemptions)', money(p.taxBill?.grossTax ?? p.grossTax)],
  ]
  return (
    <dl className="facts">
      {facts.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || 'Not recorded'}</dd>
        </div>
      ))}
    </dl>
  )
}
export function History({ history }: { history: AssessmentHistory }) {
  if (!history.length) return <p>No assessment history is recorded for this parcel.</p>
  const max = Math.max(...history.map((h) => h[1]), 1)
  return (
    <>
      <div className="history-chart" aria-hidden="true">
        {history.slice(-8).map(([year, value]) => (
          <div className="bar-column" key={year}>
            <div className="bar" style={{ height: `${Math.max(2, (value / max) * 100)}%` }} />
            <span>{String(year).slice(2)}</span>
          </div>
        ))}
      </div>
      <p className="small muted">
        An assessment is the value used to calculate property tax. An increase alone does not
        establish overvaluation.
      </p>
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Assessment history table"
      >
        <table>
          <caption>
            Recorded assessments, FY{history[0]?.[0]}–FY{history.at(-1)?.[0]}
          </caption>
          <thead>
            <tr>
              <th scope="col">Fiscal year</th>
              <th scope="col">Assessment</th>
              <th scope="col">Annual change</th>
              <th scope="col">Change %</th>
            </tr>
          </thead>
          <tbody>
            {[...history].reverse().map(([year, value]) => {
              const previous = history.find((h) => h[0] === year - 1)?.[1]
              return (
                <tr key={year}>
                  <th scope="row">FY{year}</th>
                  <td>{money(value)}</td>
                  <td>{previous === undefined ? 'Not available' : money(value - previous)}</td>
                  <td>
                    {previous && previous > 0 ? pctChange(value / previous - 1) : 'Not available'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
export function PermitList({ permits }: { permits: Permit[] }) {
  return permits.length ? (
    <ul className="permit-list">
      {permits.slice(0, 8).map((p, i) => (
        <li key={`${p.number}-${i}`}>
          <strong>{p.number || 'Permit'}</strong> —{' '}
          {p.permitType || p.workType || 'Work type not recorded'}, {longDate(p.issued)}. Declared
          value {money(p.declaredValue)}; status {p.status || 'not recorded'}.
        </li>
      ))}
    </ul>
  ) : (
    <p>No linked permit information in the exported period. This does not mean no work occurred.</p>
  )
}
