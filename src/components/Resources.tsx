import { LAST_REVIEWED, LEGAL_RULES, OFFICIAL_LINKS } from '../lib/legal/officialResources'
import { longDate } from '../lib/format'

export function Resources() {
  return (
    <section id="resources" className="resources">
      <h2>Understand your next steps</h2>
      <p>
        Legal information for Suffolk County homeowners. Local data coverage is currently limited to
        Allston / 02134.
      </p>
      <div className="resource-grid">
        {LEGAL_RULES.map((rule) => (
          <details key={rule.id}>
            <summary>{rule.title}</summary>
            <p>{rule.body}</p>
            <p className="small">
              Sources:{' '}
              {rule.sources.map((id) => (
                <a key={id} href={OFFICIAL_LINKS[id].url} target="_blank" rel="noreferrer">
                  {OFFICIAL_LINKS[id].label}
                </a>
              ))}
            </p>
          </details>
        ))}
      </div>
      <details>
        <summary>Fair cash value, evidence, and appeal fees</summary>
        <p>
          Fair cash value is the amount a willing buyer would pay a willing seller. A comparable
          sale is a recent sale of a similar property. Overvaluation concerns value on January 1
          before the fiscal year; evidence should address that date.
        </p>
        <p>
          Local property-tax appeals use the ATB’s formal or informal procedures. The fee depends on
          assessed value. The approximately $65 small-claims fee sometimes mentioned applies to a
          different category of tax appeal; do not assume it applies to your property.
        </p>
        <a href={OFFICIAL_LINKS.fees.url} target="_blank" rel="noreferrer">
          Check the official ATB fee schedule
        </a>{' '}
        ·{' '}
        <a href={OFFICIAL_LINKS.atbFiling.url} target="_blank" rel="noreferrer">
          Local real estate tax appeal forms
        </a>
      </details>
      <h3>Your local assessing office</h3>
      <div className="municipal-links">
        {(['bostonHowToFile', 'chelsea', 'revere', 'winthrop'] as const).map((id) => (
          <a key={id} href={OFFICIAL_LINKS[id].url} target="_blank" rel="noreferrer">
            {OFFICIAL_LINKS[id].publisher}
          </a>
        ))}
      </div>
      <p className="small muted">
        Last reviewed: {longDate(LAST_REVIEWED)}. Government pages and requirements may change. Some
        sites restrict automated access; always confirm with the authority.
      </p>
    </section>
  )
}
