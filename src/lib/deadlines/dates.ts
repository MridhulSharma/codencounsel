/**
 * Calendar-date helpers that operate on ISO "YYYY-MM-DD" strings in UTC so a
 * homeowner's local timezone can never shift a legal deadline by a day.
 */

export interface Ymd {
  y: number
  m: number // 1-12
  d: number
}

export function parseIsoDate(iso: string | undefined | null): Ymd | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  if (y < 1900 || y > 2200 || mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null
  return { y, m: mo, d }
}

export function isValidIsoDate(iso: string | undefined | null): iso is string {
  return parseIsoDate(iso) !== null
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export function toIso({ y, m, d }: Ymd): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function toUtc(iso: string): Date {
  const p = parseIsoDate(iso)
  if (!p) throw new Error(`Invalid ISO date: ${iso}`)
  return new Date(Date.UTC(p.y, p.m - 1, p.d))
}

function fromUtc(dt: Date): string {
  return toIso({ y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() })
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(iso: string): number {
  return toUtc(iso).getUTCDay()
}

export function addDays(iso: string, n: number): string {
  const dt = toUtc(iso)
  dt.setUTCDate(dt.getUTCDate() + n)
  return fromUtc(dt)
}

/**
 * Calendar-month addition. When the target month is shorter, the result is
 * clamped to its last day (e.g. Nov 30 + 3 months → Feb 28/29).
 */
export function addMonths(iso: string, n: number): string {
  const p = parseIsoDate(iso)
  if (!p) throw new Error(`Invalid ISO date: ${iso}`)
  const total = p.y * 12 + (p.m - 1) + n
  const y = Math.floor(total / 12)
  const m = (total % 12) + 1
  return toIso({ y, m, d: Math.min(p.d, daysInMonth(y, m)) })
}

/** Whole calendar months from a to b (b later → positive), fractional by day. */
export function monthsBetween(a: string, b: string): number {
  const ms = toUtc(b).getTime() - toUtc(a).getTime()
  return ms / (1000 * 60 * 60 * 24 * 30.4375)
}

export function compareIso(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function nthWeekdayOfMonth(y: number, m: number, dow: number, n: number): string {
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay()
  const day = 1 + ((dow - first + 7) % 7) + (n - 1) * 7
  return toIso({ y, m, d: day })
}

function lastWeekdayOfMonth(y: number, m: number, dow: number): string {
  const last = daysInMonth(y, m)
  const lastDow = new Date(Date.UTC(y, m - 1, last)).getUTCDay()
  return toIso({ y, m, d: last - ((lastDow - dow + 7) % 7) })
}

export interface Holiday {
  date: string
  name: string
}

/**
 * Massachusetts legal holidays (G.L. c. 4, § 7). A fixed-date holiday that
 * falls on a Sunday is observed the following Monday.
 */
export function massachusettsLegalHolidays(y: number): Holiday[] {
  const fixed = (m: number, d: number, name: string): Holiday => {
    let date = toIso({ y, m, d })
    if (weekday(date) === 0) date = addDays(date, 1)
    return { date, name }
  }
  return [
    fixed(1, 1, "New Year's Day"),
    { date: nthWeekdayOfMonth(y, 1, 1, 3), name: 'Martin Luther King Jr. Day' },
    { date: nthWeekdayOfMonth(y, 2, 1, 3), name: "Washington's Birthday" },
    { date: nthWeekdayOfMonth(y, 4, 1, 3), name: "Patriots' Day" },
    { date: lastWeekdayOfMonth(y, 5, 1), name: 'Memorial Day' },
    fixed(6, 19, 'Juneteenth'),
    fixed(7, 4, 'Independence Day'),
    { date: nthWeekdayOfMonth(y, 9, 1, 1), name: 'Labor Day' },
    { date: nthWeekdayOfMonth(y, 10, 1, 2), name: "Columbus Day / Indigenous Peoples' Day" },
    fixed(11, 11, 'Veterans Day'),
    { date: nthWeekdayOfMonth(y, 11, 4, 4), name: 'Thanksgiving Day' },
    fixed(12, 25, 'Christmas Day'),
  ]
}

/** Suffolk County observances; many offices close but they are not statewide legal holidays. */
export function suffolkObservances(y: number): Holiday[] {
  return [
    { date: toIso({ y, m: 3, d: 17 }), name: 'Evacuation Day (Suffolk County)' },
    { date: toIso({ y, m: 6, d: 17 }), name: 'Bunker Hill Day (Suffolk County)' },
  ]
}

export function holidayOn(iso: string): Holiday | undefined {
  const p = parseIsoDate(iso)
  if (!p) return undefined
  return massachusettsLegalHolidays(p.y).find((h) => h.date === iso)
}

export function isBusinessDay(iso: string): boolean {
  const dow = weekday(iso)
  return dow !== 0 && dow !== 6 && !holidayOn(iso)
}

export function previousBusinessDay(iso: string): string {
  let d = addDays(iso, -1)
  while (!isBusinessDay(d)) d = addDays(d, -1)
  return d
}

export function nextBusinessDay(iso: string): string {
  let d = addDays(iso, 1)
  while (!isBusinessDay(d)) d = addDays(d, 1)
  return d
}

export interface AdjustedDeadline {
  /** The date the period ends on its face. */
  nominal: string
  /** Date after applying the context-specific weekend/holiday rule. */
  effective: string
  adjusted: boolean
  explanation?: string
  warnings: string[]
  /** A conservative "file by" date when the effective date is uncertain (e.g. Saturday). */
  saferDate?: string
}

/**
 * Local abatement filing: G.L. c. 59, § 59 expressly includes Saturdays,
 * Sundays, holidays, and authorized municipal closures. Known weekends and
 * statewide holidays are computed; other closures require local confirmation.
 */
export function applyBusinessDayRule(nominal: string): AdjustedDeadline {
  const warnings: string[] = []
  const dow = weekday(nominal)
  const holiday = holidayOn(nominal)
  const p = parseIsoDate(nominal)!
  const observance = suffolkObservances(p.y).find((h) => h.date === nominal)

  if (dow === 0 || dow === 6 || holiday) {
    const effective = nextBusinessDay(nominal)
    const why = holiday
      ? `a legal holiday (${holiday.name})`
      : dow === 6
        ? 'a Saturday'
        : 'a Sunday'
    return {
      nominal,
      effective,
      adjusted: true,
      explanation: `The period ends on ${why}. G.L. c. 59, § 59 allows filing on the next day a municipal office is open. The next standard business day is shown; confirm local office closures.`,
      warnings,
    }
  }
  if (observance) {
    warnings.push(
      `${observance.name} — some Suffolk County offices may be closed. It is not a statewide legal holiday. Confirm office hours, or file by the preceding business day to be safe.`,
    )
    return {
      nominal,
      effective: nominal,
      adjusted: false,
      warnings,
      saferDate: previousBusinessDay(nominal),
    }
  }
  return { nominal, effective: nominal, adjusted: false, warnings }
}

/** ATB Rule 1.36 also includes Saturdays; cite the rule for this context. */
export function applyAtbBusinessDayRule(nominal: string): AdjustedDeadline {
  const result = applyBusinessDayRule(nominal)
  return result.adjusted
    ? {
        ...result,
        explanation:
          'ATB Rule 1.36 moves Saturday, Sunday, and legal-holiday endings to the next business day. Confirm any extraordinary closures.',
      }
    : result
}
