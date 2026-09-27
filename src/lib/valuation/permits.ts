import type { Permit } from '../../types/data'
import { addMonths, compareIso } from '../deadlines/dates'

/** Work types that can indicate a change in a property's condition or size. */
const SIGNIFICANT_WORK_TYPES = new Set([
  'INTREN',
  'INTEXT',
  'EXTREN',
  'ADDITION',
  'ERECT',
  'INTDEM',
  'EXTDEM',
  'RAZE',
  'CHGOCC',
  'NROCC',
])
export const SIGNIFICANT_DECLARED_VALUE = 25_000
export const MAJOR_DECLARED_VALUE = 100_000

export function isSignificantPermit(p: Permit): boolean {
  return (
    (p.workType !== undefined && SIGNIFICANT_WORK_TYPES.has(p.workType)) ||
    (p.declaredValue ?? 0) >= SIGNIFICANT_DECLARED_VALUE
  )
}

export function permitsBetween(permits: Permit[] | undefined, from: string, to: string): Permit[] {
  return (permits ?? []).filter(
    (p) =>
      p.issued &&
      compareIso(p.issued, from) >= 0 &&
      compareIso(p.issued, to) <= 0 &&
      isSignificantPermit(p),
  )
}

/**
 * Permits that could mean a comparable's sale price reflects work not captured
 * in its recorded characteristics: 24 months before the sale through the later
 * of the sale date and the valuation date.
 */
export function comparablePermitFlags(
  permits: Permit[] | undefined,
  saleDate: string,
  valuationDate: string,
): Permit[] {
  const end = compareIso(saleDate, valuationDate) > 0 ? saleDate : valuationDate
  return permitsBetween(permits, addMonths(saleDate, -24), end)
}

/** The subject's own significant permits in the three years before the valuation date and after it. */
export function subjectPermitFlags(
  permits: Permit[] | undefined,
  valuationDate: string,
  today: string,
): Permit[] {
  return permitsBetween(permits, addMonths(valuationDate, -36), today)
}

export function describePermit(p: Permit): string {
  const what = p.description || p.permitType || p.workType || 'Permit'
  return what
}
