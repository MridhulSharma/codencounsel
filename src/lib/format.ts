/** Display helpers. Every function returns a readable fallback instead of NaN/undefined. */
import { isValidIsoDate } from './deadlines/dates'

export const NOT_RECORDED = 'Not recorded'

const usd0 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})
const usd2 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const int = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const dec1 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

export function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

export function money(v: number | undefined | null, fallback = NOT_RECORDED): string {
  return isNum(v) ? usd0.format(v) : fallback
}

export function moneyCents(v: number | undefined | null, fallback = NOT_RECORDED): string {
  return isNum(v) ? usd2.format(v) : fallback
}

export function count(v: number | undefined | null, fallback = NOT_RECORDED): string {
  return isNum(v) ? int.format(v) : fallback
}

export function sqft(v: number | undefined | null, fallback = NOT_RECORDED): string {
  return isNum(v) && v > 0 ? `${int.format(v)} sq ft` : fallback
}

export function oneDecimal(v: number | undefined | null, fallback = NOT_RECORDED): string {
  return isNum(v) ? dec1.format(v) : fallback
}

/** Signed percentage such as "+18.4%" from a ratio change (0.184). */
export function pctChange(v: number | undefined | null, fallback = '—'): string {
  if (!isNum(v)) return fallback
  const p = v * 100
  const sign = p > 0 ? '+' : p < 0 ? '−' : ''
  return `${sign}${dec1.format(Math.abs(p))}%`
}

export function pct(v: number | undefined | null, fallback = '—'): string {
  return isNum(v) ? `${dec1.format(v * 100)}%` : fallback
}

export function ratio(v: number | undefined | null, fallback = '—'): string {
  return isNum(v) ? v.toFixed(2) : fallback
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** "February 1, 2027" from an ISO date string; timezone-independent. */
export function longDate(iso: string | undefined | null, fallback = NOT_RECORDED): string {
  if (!isValidIsoDate(iso)) return fallback
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null
  if (!m) return fallback
  const month = MONTHS[Number(m[2]) - 1]
  if (!month) return fallback
  return `${month} ${Number(m[3])}, ${m[1]}`
}

export function longDateWithWeekday(
  iso: string | undefined | null,
  fallback = NOT_RECORDED,
): string {
  if (!isValidIsoDate(iso)) return fallback
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) : null
  if (!m) return fallback
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  if (Number.isNaN(d.getTime())) return fallback
  return `${WEEKDAYS[d.getUTCDay()]}, ${longDate(iso)}`
}

/** Title-case an all-caps municipal string ("16-18 WADSWORTH ST" → "16-18 Wadsworth St"). */
export function titleCase(s: string | undefined | null): string {
  if (!s) return ''
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\bMa\b/g, 'MA')
}

/** Strip the municipal code prefix: "G - Good" → "Good", "CV - Conventional" → "Conventional". */
export function codeLabel(s: string | undefined | null, fallback = NOT_RECORDED): string {
  if (!s) return fallback
  const parts = s.split(' - ')
  return (parts.length > 1 ? parts.slice(1).join(' - ') : s).trim() || fallback
}

export function shortAddress(address: string | undefined | null): string {
  if (!address) return 'Address not recorded'
  return titleCase(address.replace(/,\s*ALLSTON,\s*MA\s*\d{5}\s*$/i, '').trim())
}
