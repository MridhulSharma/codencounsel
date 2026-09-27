import type { Parcel, PilotData, Sale, Permit } from '../../types/data'
import { addMonths, isValidIsoDate, monthsBetween } from '../deadlines/dates'
import { comparablePermitFlags } from './permits'
import { coefficientOfVariation, haversineMiles, median, quantile, roundTo } from './stats'

const TYPES = new Set(['CD', 'R1', 'R2', 'R3'])
export const positive = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0
export function saleProblems(s: Sale, p?: Parcel): string[] {
  const reasons: string[] = []
  if (!positive(s.price) || s.price < 10_000 || s.price > 20_000_000)
    reasons.push('Missing, nominal, or extreme sale price')
  if (!isValidIsoDate(s.date)) reasons.push('Invalid sale date')
  if (!p || !positive(p.livingArea)) reasons.push('No linked parcel with usable living area')
  if (
    positive(s.price) &&
    positive(p?.livingArea) &&
    (s.price / p.livingArea < 100 || s.price / p.livingArea > 2500)
  )
    reasons.push('Price per square foot outside $100–$2,500 screening range')
  if (s.multiParcel) reasons.push('Multi-parcel deed: price cannot be allocated')
  if (s.namesOverlap)
    reasons.push('Possible related-party transfer (name-token heuristic, not proof)')
  if (
    s.nonMarketDocType ||
    ['FORECLOSURE DEED', 'CONFIRMATORY DEED', 'MASTER DEED'].includes(
      s.docType?.toUpperCase() ?? '',
    )
  )
    reasons.push('Non-standard deed')
  if (s.confidence === 'low') reasons.push('Low-confidence source linkage')
  return reasons
}
export function validSales(sales: Sale[], parcels: Map<string, Parcel>) {
  const seen = new Set<string>()
  const rejected: { sale: Sale; reasons: string[] }[] = []
  const usable: Sale[] = []
  for (const sale of [...sales].sort((a, b) => a.id - b.id)) {
    const key = `${sale.pid}|${sale.date}|${sale.price}`
    const reasons = saleProblems(sale, parcels.get(sale.pid))
    if (seen.has(key)) reasons.push('Duplicate transaction')
    seen.add(key)
    if (reasons.length) rejected.push({ sale, reasons })
    else usable.push(sale)
  }
  return { usable, rejected }
}
export interface Comparison {
  score: number
  reasons: string[]
  missing: string[]
  distance?: number
}
export function compareProperties(
  subject: Parcel,
  comp: Parcel,
  date: string,
  valuationDate: string,
): Comparison {
  let total = 0,
    available = 0
  const reasons: string[] = [],
    missing: string[] = []
  function dimension(
    label: string,
    a: number | undefined,
    b: number | undefined,
    scale: number,
    weight: number,
  ) {
    if (a === undefined || b === undefined || !Number.isFinite(a) || !Number.isFinite(b)) {
      missing.push(label)
      return
    }
    available += weight
    total += weight * Math.max(0, 1 - Math.abs(a - b) / scale)
    reasons.push(`${label}: ${b} versus your ${a}`)
  }
  available += 25
  total += subject.landUse && subject.landUse === comp.landUse ? 25 : 0
  reasons.push(
    subject.landUse === comp.landUse
      ? `Same property type (${comp.landUse})`
      : 'Different property type',
  )
  dimension('Living area', subject.livingArea, comp.livingArea, (subject.livingArea || 1) * 0.5, 30)
  dimension('Bedrooms', subject.bedrooms, comp.bedrooms, 3, 8)
  const baths = (p: Parcel) =>
    p.fullBaths === undefined || p.halfBaths === undefined
      ? undefined
      : p.fullBaths + p.halfBaths * 0.5
  dimension('Bathrooms', baths(subject), baths(comp), 2, 8)
  dimension('Year built', subject.yearBuilt, comp.yearBuilt, 100, 7)
  if (subject.landUse !== 'CD')
    dimension('Lot square feet', subject.landSf, comp.landSf, subject.landSf || 1, 5)
  if (subject.overallCondition && comp.overallCondition) {
    available += 5
    total += subject.overallCondition === comp.overallCondition ? 5 : 0
    reasons.push(`Condition: ${comp.overallCondition} versus your ${subject.overallCondition}`)
  } else missing.push('Condition')
  let distance: number | undefined
  if (
    [subject.lat, subject.lon, comp.lat, comp.lon].every(
      (n) => typeof n === 'number' && Number.isFinite(n),
    )
  ) {
    distance = haversineMiles(subject.lat!, subject.lon!, comp.lat!, comp.lon!)
    available += 12
    total += 12 * Math.max(0, 1 - distance / 2)
    reasons.push(`About ${distance.toFixed(2)} miles away (approximate polygon center)`)
  } else missing.push('Distance')
  if (isValidIsoDate(date) && isValidIsoDate(valuationDate)) {
    const age = Math.abs(monthsBetween(date, valuationDate))
    available += 10
    total += 10 * Math.max(0, 1 - age / 24)
    reasons.push(`${Math.round(age)} months from valuation date`)
  } else missing.push('Sale timing')
  return { score: total / available, reasons, missing, distance }
}
export interface Comparable extends Comparison {
  parcel: Parcel
  sale: Sale
  ppsf: number
  permits: Permit[]
}
export function rankComparables(subject: Parcel, data: PilotData) {
  const valuationDate = subject.fiscalYear ? `${subject.fiscalYear - 1}-01-01` : undefined
  const { usable, rejected } = validSales(data.sales, data.parcelsByPid)
  if (!valuationDate || !positive(subject.livingArea) || !TYPES.has(subject.landUse ?? ''))
    return {
      comps: [] as Comparable[],
      candidates: [] as Comparable[],
      rejected,
      valuationDate,
      widened: false,
    }
  const candidates: Comparable[] = []
  for (const sale of usable) {
    const parcel = data.parcelsByPid.get(sale.pid)!
    if (
      parcel.pid === subject.pid ||
      parcel.landUse !== subject.landUse ||
      parcel.landUseDesc !== subject.landUseDesc ||
      sale.date > valuationDate ||
      sale.date < addMonths(valuationDate, -24)
    )
      continue
    const areaRatio = parcel.livingArea! / subject.livingArea
    if (areaRatio < 0.5 || areaRatio > 1.5) continue
    const comparison = compareProperties(subject, parcel, sale.date, valuationDate)
    if (comparison.distance !== undefined && comparison.distance > 2) continue
    candidates.push({
      ...comparison,
      parcel,
      sale,
      ppsf: sale.price! / parcel.livingArea!,
      permits: comparablePermitFlags(data.permits[parcel.pid], sale.date, valuationDate),
    })
  }
  // One transaction per property; select latest eligible sale before ranking.
  const latest = new Map<string, Comparable>()
  for (const c of candidates.sort(
    (a, b) => b.sale.date.localeCompare(a.sale.date) || a.sale.id - b.sale.id,
  ))
    if (!latest.has(c.parcel.pid)) latest.set(c.parcel.pid, c)
  const ordered = [...latest.values()].sort(
    (a, b) =>
      b.score - a.score ||
      b.sale.date.localeCompare(a.sale.date) ||
      a.parcel.pid.localeCompare(b.parcel.pid),
  )
  const subjectArea = subject.livingArea
  const recent = ordered.filter(
    (c) =>
      c.sale.date >= addMonths(valuationDate, -12) &&
      Math.abs(c.parcel.livingArea! / subjectArea - 1) <= 0.3,
  )
  const widened = recent.length < 3
  const pool = widened ? ordered : recent
  return {
    comps: pool.slice(0, 5),
    candidates: pool.slice(0, 15),
    rejected,
    valuationDate,
    widened,
  }
}
export function estimateValue(
  area: number | undefined,
  comps: Pick<Comparable, 'ppsf' | 'score' | 'missing' | 'sale'>[],
  valuationDate?: string,
) {
  const usable = comps.filter((c) => positive(c.ppsf))
  if (!positive(area) || usable.length < 3) return undefined
  const prices = usable.map((c) => c.ppsf)
  const midpoint = median(prices)!
  const central = roundTo(midpoint * area, 1000)
  // At least ±10% even for identical sales; quartile dispersion is descriptive,
  // not a calibrated statistical confidence interval or appraisal adjustment.
  const low = Math.floor((Math.min(quantile(prices, 0.25)!, midpoint * 0.9) * area) / 1000) * 1000
  const high = Math.ceil((Math.max(quantile(prices, 0.75)!, midpoint * 1.1) * area) / 1000) * 1000
  const dispersion = coefficientOfVariation(prices) ?? 0
  const averageScore = usable.reduce((sum, c) => sum + c.score, 0) / usable.length
  const missing = usable.some((c) => c.missing.length > 2)
  const older = !valuationDate || usable.some((c) => monthsBetween(c.sale.date, valuationDate) > 12)
  const quality =
    dispersion > 0.3 || older || missing || averageScore < 0.65
      ? 'Limited'
      : usable.length >= 5 && averageScore >= 0.8 && dispersion < 0.15
        ? 'Strong'
        : 'Moderate'
  return {
    central,
    low,
    high,
    medianPpsf: midpoint,
    dispersion,
    quality,
    explanation: `${usable.length} sales; ${Math.round(averageScore * 100)}% average similarity; ${Math.round(dispersion * 100)}% price-per-square-foot variation.${older ? ' Sales extend beyond 12 months.' : ''}${missing ? ' Several comparison fields are missing.' : ''} Evidence quality is a screening label, not a probability of accuracy.`,
  }
}
export function assessmentRatio(
  assessment: number | undefined,
  value: number | undefined,
  fiscalYear?: number,
  comparisonYear?: number,
) {
  return positive(assessment) &&
    positive(value) &&
    fiscalYear !== undefined &&
    fiscalYear === comparisonYear
    ? assessment / value
    : undefined
}
export function ratioAnalysis(subject: Parcel, comps: Comparable[], central?: number) {
  const subjectRatio = assessmentRatio(
    subject.totalValue,
    central,
    subject.fiscalYear,
    subject.fiscalYear,
  )
  const rows = comps.map((c) => ({
    pid: c.parcel.pid,
    address: c.parcel.address,
    ratio: assessmentRatio(
      c.parcel.totalValue,
      c.sale.price,
      subject.fiscalYear,
      c.parcel.fiscalYear,
    ),
    date: c.sale.date,
  }))
  const aligned = rows.filter(
    (r) =>
      r.ratio !== undefined &&
      subject.fiscalYear !== undefined &&
      r.date >= `${subject.fiscalYear - 2}-01-01` &&
      r.date <= `${subject.fiscalYear - 1}-01-01`,
  )
  return {
    subjectRatio,
    rows,
    reference: aligned.length >= 3 ? median(aligned.map((r) => r.ratio!)) : undefined,
    referenceCount: aligned.length,
  }
}
