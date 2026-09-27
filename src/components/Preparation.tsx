import type { Parcel } from '../types/data'
import type { Comparable } from '../lib/valuation/engine'
import { money, shortAddress } from '../lib/format'
import { OFFICIAL_LINKS } from '../lib/legal/officialResources'

export const CHECKLIST = [
  'Confirm the public property record',
  'Obtain 3–5 comparable sale records',
  'Gather dated condition photos',
  'Collect repair estimates or other condition evidence',
  'Confirm bill, payment, and filing dates',
  'Review the official form and signature requirements',
]
export interface PreparationState {
  address: string
  pid: string
  fiscalYear: string
  assessment: string
  claimedValue: string
  ground: string
  explanation: string
  condition: string
  checks: string[]
  complexities: string[]
}
export function preparationWarnings(state: PreparationState): string[] {
  const warnings: string[] = []
  if (!state.address.trim() || !state.pid.trim())
    warnings.push(
      'Enter the property address and parcel ID before transferring this summary to the official form.',
    )
  const fy = Number(state.fiscalYear)
  if (!Number.isInteger(fy) || fy < 2000 || fy > 2200)
    warnings.push('Enter a valid four-digit preparation fiscal year.')
  if (
    !state.assessment ||
    !Number.isFinite(Number(state.assessment)) ||
    Number(state.assessment) < 0
  )
    warnings.push('Confirm a non-negative assessment amount.')
  if (
    state.claimedValue &&
    (!Number.isFinite(Number(state.claimedValue)) || Number(state.claimedValue) <= 0)
  )
    warnings.push('The claimed fair cash value must be a positive amount. Review it before filing.')
  return warnings
}
export function initialPreparation(p: Parcel): PreparationState {
  return {
    address: shortAddress(p.address),
    pid: p.pid,
    fiscalYear: String(p.fiscalYear ?? ''),
    assessment: String(p.totalValue ?? ''),
    claimedValue: '',
    ground: 'Undecided — discuss with a reviewer',
    explanation: '',
    condition: '',
    checks: [],
    complexities: [],
  }
}
export function Preparation({
  state,
  onChange,
  comps,
}: {
  state: PreparationState
  onChange: (state: PreparationState) => void
  comps: Comparable[]
}) {
  function field(
    key: keyof Pick<
      PreparationState,
      'address' | 'pid' | 'fiscalYear' | 'assessment' | 'claimedValue' | 'explanation' | 'condition'
    >,
    value: string,
  ) {
    onChange({ ...state, [key]: value })
  }
  return (
    <>
      <p>
        This is your <strong>Form 128 preparation summary</strong>, not an official application.
        Review and edit every field. No applicant identity or signature is collected, and nothing is
        submitted.
      </p>
      {preparationWarnings(state).map((w) => (
        <p className="notice" role="alert" key={w}>
          {w}
        </p>
      ))}
      <div className="form-grid">
        <label>
          Property address
          <input value={state.address} onChange={(e) => field('address', e.target.value)} />
        </label>
        <label>
          Parcel ID
          <input value={state.pid} onChange={(e) => field('pid', e.target.value)} />
        </label>
        <label>
          Preparation fiscal year
          <input
            type="number"
            min="2000"
            max="2200"
            value={state.fiscalYear}
            onChange={(e) => field('fiscalYear', e.target.value)}
          />
        </label>
        <label>
          Assessment to enter on official form ($)
          <input
            type="number"
            min="0"
            value={state.assessment}
            onChange={(e) => field('assessment', e.target.value)}
          />
        </label>
        <label>
          Your claimed fair cash value ($)
          <input
            type="number"
            min="1"
            value={state.claimedValue}
            onChange={(e) => field('claimedValue', e.target.value)}
            aria-describedby="claimed-help"
          />
        </label>
        <label>
          Ground to discuss
          <select
            value={state.ground}
            onChange={(e) => onChange({ ...state, ground: e.target.value })}
          >
            <option>Undecided — discuss with a reviewer</option>
            <option>Overvaluation</option>
            <option>Disproportionate assessment</option>
            <option>Both — discuss with a reviewer</option>
            <option>Record / classification issue — professional review</option>
          </select>
        </label>
      </div>
      <p id="claimed-help" className="small muted">
        You choose your claimed value. It is not filled from the model. Editing these preparation
        fields does not change the public-record analysis.
      </p>
      <label>
        Your explanation
        <textarea
          rows={4}
          value={state.explanation}
          onChange={(e) => field('explanation', e.target.value)}
          placeholder="Explain the evidence you want a reviewer to consider."
        />
      </label>
      <label>
        Condition notes and public-record corrections
        <textarea
          rows={4}
          value={state.condition}
          onChange={(e) => field('condition', e.target.value)}
          placeholder="Describe specific conditions, when they existed, and evidence you can provide. Avoid private personal details."
        />
      </label>
      <fieldset>
        <legend>Your evidence checklist</legend>
        {CHECKLIST.map((item) => (
          <label className="check" key={item}>
            <input
              type="checkbox"
              checked={state.checks.includes(item)}
              onChange={(e) =>
                onChange({
                  ...state,
                  checks: e.target.checked
                    ? [...state.checks, item]
                    : state.checks.filter((c) => c !== item),
                })
              }
            />
            {item}
          </label>
        ))}
      </fieldset>
      <p>
        Keep photos on your device and attach them yourself when appropriate. Level does not select,
        upload, or store photo files. Date photos and explain how they reflect condition at the
        relevant valuation date.
      </p>
      <p>
        Selected evidence:{' '}
        {comps.length
          ? comps
              .map((c) => `${shortAddress(c.parcel.address)} (${money(c.sale.price)})`)
              .join('; ')
          : 'No comparable sales selected.'}
      </p>
      <fieldset>
        <legend>Does your case include any of these?</legend>
        {[
          'Unusual ownership or a trust',
          'Major renovations',
          'Property classification dispute',
          'Public records appear inconsistent',
        ].map((item) => (
          <label className="check" key={item}>
            <input
              type="checkbox"
              checked={state.complexities.includes(item)}
              onChange={(e) =>
                onChange({
                  ...state,
                  complexities: e.target.checked
                    ? [...state.complexities, item]
                    : state.complexities.filter((c) => c !== item),
                })
              }
            />
            {item}
          </label>
        ))}
      </fieldset>
    </>
  )
}
export function Review({ flags }: { flags: string[] }) {
  return (
    <section className="review-panel">
      <h2>Before you file</h2>
      <p>
        Ask a navigator or legal clinic to review your evidence and dates. An attorney can help with
        unusual ownership, classification, renovations, multiple units, or appeal procedure. You
        remain in control of whether and how to proceed.
      </p>
      {flags.length > 0 && (
        <>
          <h3>Questions for your reviewer</h3>
          <ul>
            {flags.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </>
      )}
      <p>
        Confirm your fiscal year, actual bill, payment requirements, claimed value, and application
        deadline. Respond to assessors’ information or inspection requests promptly; failure to
        cooperate can affect appeal rights.
      </p>
      <div className="actions">
        <a className="button" href={OFFICIAL_LINKS.form128.url} target="_blank" rel="noreferrer">
          Continue to official Form 128
        </a>
        <a
          className="button secondary"
          href={OFFICIAL_LINKS.bostonHowToFile.url}
          target="_blank"
          rel="noreferrer"
        >
          Boston filing instructions
        </a>
      </div>
      <p className="small">
        Official resources open in a new tab. Complete, sign, and file the official application
        yourself with the local Board of Assessors. Level cannot file or sign for you.
      </p>
      <p>
        <a href={OFFICIAL_LINKS.forms.url} target="_blank" rel="noreferrer">
          Find Form 128 in the DOR forms directory
        </a>{' '}
        ·{' '}
        <a href={OFFICIAL_LINKS.massLegalHelp.url} target="_blank" rel="noreferrer">
          Find legal help
        </a>
      </p>
    </section>
  )
}
