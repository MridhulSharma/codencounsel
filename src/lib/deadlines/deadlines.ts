import { BOSTON_PUBLISHED_DEADLINES } from '../legal/officialResources'
import {
  addMonths,
  applyAtbBusinessDayRule,
  applyBusinessDayRule,
  compareIso,
  isValidIsoDate,
  type AdjustedDeadline,
} from './dates'

export interface DeadlineInputs {
  fiscalYear?: number
  /** Due date of the first installment of the actual tax bill, as printed on the bill (user-entered). */
  billDueDate?: string
  /** Date the abatement application was, or will be, filed (user-entered). */
  filingDate?: string
  /** Date of the assessors' written decision, if one was received (user-entered). */
  decisionDate?: string
  /** The homeowner agreed in writing to extend the assessors' three-month period. */
  extensionAgreed?: boolean
  decisionReceived?: boolean
}

export type DeadlineStatus = 'calculated' | 'user-entered' | 'needs-info'

export interface DeadlineItem {
  id: 'abatement' | 'assessor-response' | 'atb'
  title: string
  status: DeadlineStatus
  date?: string
  detail?: AdjustedDeadline
  basis: string
  missing?: string
  warnings: string[]
  /** Include as a calendar event. */
  calendar: boolean
}

export interface DeadlineResult {
  items: DeadlineItem[]
  assumptions: string[]
  inputWarnings: string[]
}

export function publishedBostonDeadline(fy: number | undefined): string | undefined {
  return fy ? BOSTON_PUBLISHED_DEADLINES[fy]?.date : undefined
}

export function calculateDeadlines(input: DeadlineInputs): DeadlineResult {
  const inputWarnings: string[] = []
  const clean = (v: string | undefined, label: string) => {
    if (!v) return undefined
    if (!isValidIsoDate(v)) {
      inputWarnings.push(`The ${label} is not a valid date and was ignored.`)
      return undefined
    }
    return v
  }
  const billDue = clean(input.billDueDate, 'tax bill due date')
  const filing = clean(input.filingDate, 'filing date')
  const decision =
    input.decisionReceived === false ? undefined : clean(input.decisionDate, 'decision date')
  const inconsistent = !!(decision && filing && decision < filing)
  if (inconsistent)
    inputWarnings.push(
      'The decision date precedes the filing date. Correct the dates before relying on an ATB calculation.',
    )
  if (billDue && input.fiscalYear && Number(billDue.slice(0, 4)) !== input.fiscalYear)
    inputWarnings.push(
      'The bill due-date year differs from the fiscal year. Confirm that this is the first actual bill for the year you intend to challenge.',
    )

  const items: DeadlineItem[] = []

  // 1. Abatement filing deadline — tied to the first actual bill's due date.
  if (billDue) {
    const detail = applyBusinessDayRule(billDue)
    items.push({
      id: 'abatement',
      title: 'Abatement application deadline (Form 128)',
      status: 'calculated',
      date: detail.effective,
      detail,
      basis:
        'Based on the due date you entered for the first installment of the actual tax bill (G.L. c. 59, § 59).',
      warnings: [...detail.warnings],
      calendar: true,
    })
    if (filing && compareIso(filing, detail.effective) > 0) {
      inputWarnings.push(
        'The filing date you entered is after the calculated abatement deadline. A late application generally cannot be considered by the assessors. Contact the Board of Assessors or a legal-aid clinic promptly.',
      )
    }
  } else {
    items.push({
      id: 'abatement',
      title: 'Abatement application deadline (Form 128)',
      status: 'needs-info',
      basis:
        'The deadline is the due date of the first installment of the actual (not preliminary) tax bill (G.L. c. 59, § 59).',
      missing: 'Enter the due date printed on your first actual tax bill for this fiscal year.',
      warnings: [],
      calendar: false,
    })
  }

  // 2. Assessors' three-month period.
  let deemedDenial: string | undefined
  if (decision) {
    items.push({
      id: 'assessor-response',
      title: 'Assessors’ decision',
      status: 'user-entered',
      date: decision,
      basis: 'You entered the date of the assessors’ written decision.',
      warnings: [],
      calendar: false,
    })
  } else if (filing && input.extensionAgreed) {
    items.push({
      id: 'assessor-response',
      title: 'Assessors’ response checkpoint',
      status: 'needs-info',
      basis: 'You indicated you agreed in writing to extend the assessors’ three-month period.',
      missing:
        'The deemed-denial date depends on the extension you agreed to. Check the written extension for its end date.',
      warnings: [],
      calendar: false,
    })
  } else if (filing) {
    deemedDenial = addMonths(filing, 3)
    items.push({
      id: 'assessor-response',
      title: 'Assessors’ response checkpoint (deemed denial if no action)',
      status: 'calculated',
      date: deemedDenial,
      basis:
        'Three months after the filing date you entered. If the assessors have not acted by then, the application is deemed denied (G.L. c. 59, § 64), and they should send written notice within ten days (§ 63).',
      warnings: [
        'This is the nominal calendar checkpoint. Office closures or an agreed extension may affect the action period; confirm deemed denial with the assessors. The ATB calculation uses this earlier checkpoint conservatively.',
      ],
      calendar: true,
    })
  } else {
    items.push({
      id: 'assessor-response',
      title: 'Assessors’ response checkpoint',
      status: 'needs-info',
      basis: 'The assessors have three months from the filing date to act (G.L. c. 59, § 64).',
      missing: 'Enter the date you filed, or plan to file, your application.',
      warnings: [],
      calendar: false,
    })
  }

  // 3. Appellate Tax Board.
  const nominalDeemed = filing && !input.extensionAgreed ? addMonths(filing, 3) : undefined
  const lateDecision = decision && nominalDeemed && decision > nominalDeemed
  if (lateDecision)
    inputWarnings.push(
      'The decision came after the nominal three-month period. A later decision may not restart appeal time. The earlier deemed-denial date is used conservatively; obtain professional review.',
    )
  const invalidEntered = inputWarnings.some((w) => w.includes('not a valid date'))
  const atbStart = lateDecision ? nominalDeemed : (decision ?? deemedDenial)
  if (atbStart && !inconsistent && !invalidEntered && !(input.decisionReceived && !decision)) {
    const detail = applyAtbBusinessDayRule(addMonths(atbStart, 3))
    items.push({
      id: 'atb',
      title:
        decision && !lateDecision
          ? 'Appellate Tax Board appeal deadline'
          : 'Appellate Tax Board conservative filing target',
      status: 'calculated',
      date: detail.effective,
      detail,
      basis: decision
        ? 'Three months after the assessors’ decision date you entered (G.L. c. 59, § 64).'
        : 'Three months after the calculated deemed-denial date (G.L. c. 59, § 64). If the assessors decide earlier, recalculate from their decision date.',
      warnings: [...detail.warnings],
      calendar: true,
    })
  } else {
    items.push({
      id: 'atb',
      title: 'Appellate Tax Board appeal deadline',
      status: 'needs-info',
      basis:
        'Three months after the assessors’ decision or the deemed-denial date (G.L. c. 59, § 64).',
      missing: input.extensionAgreed
        ? 'Enter the assessors’ decision date once you receive it, or check your written extension.'
        : 'Enter a filing date or the assessors’ decision date.',
      warnings: [],
      calendar: false,
    })
  }

  const assumptions = [
    'Dates are calculated from the information you entered. Level does not know your actual bill or filing dates.',
    '“Three months” is counted by calendar month; if the ending month is shorter, the last day of that month is used.',
    'Local abatement filing moves Saturday, Sunday, and legal-holiday endings to the next day a municipal office is open (G.L. c. 59, § 59); we show the next standard business day. ATB Rule 1.36 also extends weekends and holidays. Verify emergency and local closures. Deemed denial uses the nominal three-month checkpoint conservatively.',
    'Special rules can apply (for example, exemptions, new owners, or late-issued bills). Verify every date with the Board of Assessors, a legal-aid clinic, or an attorney.',
  ]

  return { items, assumptions, inputWarnings }
}
