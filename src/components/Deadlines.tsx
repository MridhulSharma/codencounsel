import type { DeadlineInputs, DeadlineResult } from '../lib/deadlines/deadlines'
import { publishedBostonDeadline } from '../lib/deadlines/deadlines'
import { buildIcs } from '../lib/deadlines/ics'
import { downloadText } from '../lib/download'
import { longDate, longDateWithWeekday } from '../lib/format'
import { OFFICIAL_LINKS } from '../lib/legal/officialResources'

export function DeadlineCards({ result }: { result: DeadlineResult }) {
  return (
    <>
      <div className="deadline-cards">
        {result.items.map((item) => (
          <article key={item.id}>
            <h3>{item.title}</h3>
            <strong>
              {item.date ? longDateWithWeekday(item.date) : 'More information needed'}
            </strong>
            <p>{item.missing || item.basis}</p>
            {item.detail?.explanation && <p>{item.detail.explanation}</p>}
            {item.detail?.saferDate && (
              <p>Safer filing target: {longDate(item.detail.saferDate)}.</p>
            )}
            {item.warnings.map((w) => (
              <p className="notice" key={w}>
                {w}
              </p>
            ))}
          </article>
        ))}
      </div>
      {result.inputWarnings.map((w) => (
        <p role="alert" className="notice" key={w}>
          {w}
        </p>
      ))}
    </>
  )
}
export function Deadlines({
  input,
  onChange,
  result,
}: {
  input: DeadlineInputs
  onChange: (input: DeadlineInputs) => void
  result: DeadlineResult
}) {
  const events = result.items
    .filter((item) => item.calendar && item.date)
    .map((item) => ({
      uid: `${item.id}-${item.date}`,
      date: item.date!,
      summary: `Level: ${item.title}`,
      description: `Verify with the Board of Assessors, ATB, or a qualified reviewer before relying on this date. ${item.basis} ${item.warnings.join(' ')}`,
      alarmDaysBefore: 7,
    }))
  const published = publishedBostonDeadline(input.fiscalYear)
  return (
    <>
      <p>
        The first <strong>actual</strong> tax bill follows the setting of the tax rate. In Boston it
        is usually the third-quarter bill. Confirm the due date on your bill; this tool never infers
        it from a fiscal year.
      </p>
      <p className="notice">
        Missing a filing deadline can forfeit appeal rights for that tax year. Filing does not pause
        tax collection. Pay the tax as assessed and on time as applicable to preserving appeal
        rights.
      </p>
      <div className="form-grid">
        <label>
          Fiscal year
          <input
            type="number"
            min="2000"
            max="2200"
            value={input.fiscalYear ?? ''}
            onChange={(e) =>
              onChange({
                ...input,
                fiscalYear: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </label>
        <label>
          First actual tax bill due date
          <input
            type="date"
            value={input.billDueDate ?? ''}
            onChange={(e) => onChange({ ...input, billDueDate: e.target.value })}
          />
        </label>
        <label>
          Application filing date (actual or planned)
          <input
            type="date"
            value={input.filingDate ?? ''}
            onChange={(e) => onChange({ ...input, filingDate: e.target.value })}
          />
        </label>
        <label>
          Have you received a decision?
          <select
            value={input.decisionReceived ? 'yes' : 'no'}
            onChange={(e) =>
              onChange({
                ...input,
                decisionReceived: e.target.value === 'yes',
                decisionDate: undefined,
              })
            }
          >
            <option value="no">No / planning ahead</option>
            <option value="yes">Yes, including denial or partial abatement</option>
          </select>
        </label>
        {input.decisionReceived && (
          <label>
            Assessors’ date of action (not mailing date)
            <input
              type="date"
              value={input.decisionDate ?? ''}
              onChange={(e) => onChange({ ...input, decisionDate: e.target.value })}
            />
          </label>
        )}
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={!!input.extensionAgreed}
          onChange={(e) => onChange({ ...input, extensionAgreed: e.target.checked })}
        />
        I agreed in writing to extend the assessors’ decision period.
      </label>
      {published && (
        <p className="small">
          Boston publishes {longDate(published)} for FY{input.fiscalYear}.{' '}
          <a href={OFFICIAL_LINKS.bostonHowToFile.url} target="_blank" rel="noreferrer">
            Check the City’s filing instructions
          </a>{' '}
          and enter your confirmed bill date above.
        </p>
      )}
      <DeadlineCards result={result} />
      <details>
        <summary>Date assumptions and special cases</summary>
        <ul>
          {result.assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <p>
          Omitted or revised bills, uncertain filing dates, office closures, and written extensions
          need individual review. A planned filing date creates planning reminders only.
        </p>
        <a href={OFFICIAL_LINKS.atbRules.url} target="_blank" rel="noreferrer">
          Official ATB time-computation rules
        </a>
      </details>
      <button
        disabled={!events.length}
        onClick={() =>
          downloadText(buildIcs(events), 'level-deadlines.ics', 'text/calendar;charset=utf-8')
        }
      >
        Download calendar reminders (.ics)
      </button>
      <p className="small muted">
        All-day events with a seven-day reminder. Review the dates before importing; calendar apps
        may handle reminders differently.
      </p>
    </>
  )
}
