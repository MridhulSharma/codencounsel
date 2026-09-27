import { describe, it, expect } from 'vitest'
import type { Parcel, PilotData, Sale } from '../../types/data'
import {
  assessmentRatio,
  compareProperties,
  estimateValue,
  rankComparables,
  ratioAnalysis,
  saleProblems,
  validSales,
  type Comparable,
} from './engine'
import { comparablePermitFlags } from './permits'
const p: Parcel = {
  pid: '1',
  address: 'Test subject',
  landUse: 'CD',
  landUseDesc: 'RESIDENTIAL CONDO',
  livingArea: 1000,
  bedrooms: 2,
  fullBaths: 1,
  halfBaths: 0,
  yearBuilt: 1920,
  landSf: 3000,
  overallCondition: 'Average',
  lat: 42.35,
  lon: -71.13,
  totalValue: 600000,
  fiscalYear: 2026,
}
const s: Sale = {
  id: 1,
  pid: '2',
  date: '2024-10-01',
  price: 500000,
  confidence: 'high',
  docType: 'UNIT DEED',
}
const other: Parcel = { ...p, pid: '2' }
const date = '2025-01-01'
const score = (overrides: Partial<Parcel>, saleDate = s.date) =>
  compareProperties(p, { ...other, ...overrides }, saleDate, date).score
function comp(ppsf = 500, id = 2): Comparable {
  return {
    parcel: { ...other, pid: String(id) },
    sale: { ...s, id, pid: String(id), price: ppsf * 1000 },
    ppsf,
    score: 0.9,
    reasons: [],
    missing: [],
    permits: [],
  }
}
function dataset(parcels: Parcel[], sales: Sale[]): PilotData {
  return {
    parcels,
    parcelsByPid: new Map(parcels.map((p) => [p.pid, p])),
    sales,
    salesByPid: new Map(),
    history: {},
    permits: {},
    meta: { source: 'test', latestFiscalYear: 2026, counts: {} },
  }
}
describe('transparent ranking', () => {
  it('prefers matching property type', () =>
    expect(score({})).toBeGreaterThan(score({ landUse: 'R1' })))
  it('prefers closer area', () =>
    expect(score({ livingArea: 1050 })).toBeGreaterThan(score({ livingArea: 1400 })))
  it('prefers closer bedrooms', () =>
    expect(score({ bedrooms: 2 })).toBeGreaterThan(score({ bedrooms: 4 })))
  it('prefers closer bathrooms', () =>
    expect(score({ fullBaths: 1 })).toBeGreaterThan(score({ fullBaths: 3 })))
  it('prefers closer age', () =>
    expect(score({ yearBuilt: 1920 })).toBeGreaterThan(score({ yearBuilt: 2020 })))
  it('prefers recent sales', () =>
    expect(score({}, '2024-12-01')).toBeGreaterThan(score({}, '2023-06-01')))
  it('handles missing fields without NaN', () => {
    const c = compareProperties(
      { pid: '1', livingArea: 1000 },
      { pid: '2', livingArea: 1000 },
      s.date,
      date,
    )
    expect(c.score).toBeGreaterThan(0)
    expect(c.missing).toContain('Bedrooms')
  })
  it('does not rank the subject itself', () =>
    expect(rankComparables(p, dataset([p], [{ ...s, pid: '1' }])).comps).toEqual([]))
  it('excludes mismatched types', () =>
    expect(rankComparables(p, dataset([p, { ...other, landUse: 'R1' }], [s])).comps).toEqual([]))
  it('excludes sales after valuation date', () =>
    expect(rankComparables(p, dataset([p, other], [{ ...s, date: '2025-02-01' }])).comps).toEqual(
      [],
    ))
  it('excludes sales older than 24 months', () =>
    expect(rankComparables(p, dataset([p, other], [{ ...s, date: '2022-12-31' }])).comps).toEqual(
      [],
    ))
  it('ties break deterministically by parcel ID', () => {
    const d = dataset([p, other, { ...other, pid: '3' }], [{ ...s, id: 3, pid: '3' }, s])
    expect(rankComparables(p, d).comps.map((c) => c.parcel.pid)).toEqual(['2', '3'])
  })
  it('widens only if fewer than three close recent sales', () =>
    expect(rankComparables(p, dataset([p, other], [s])).widened).toBe(true))
  it('uses only one sale per parcel', () =>
    expect(
      rankComparables(p, dataset([p, other], [s, { ...s, id: 2, date: '2024-11-01' }])).comps,
    ).toHaveLength(1))
  it('does not estimate unsupported commercial property', () =>
    expect(rankComparables({ ...p, landUse: 'C' }, dataset([p, other], [s])).comps).toEqual([]))
})
describe('sale screening', () => {
  it.each([0, undefined, -1, 1, 9999, Infinity, NaN])('rejects unusable price %s', (price) =>
    expect(saleProblems({ ...s, price }, other).length).toBeGreaterThan(0),
  )
  it('accepts a plausible sale without claiming verified market status', () =>
    expect(saleProblems(s, other)).toEqual([]))
  it.each(['2024-02-30', 'bad', '2024-13-01'])('rejects invalid date %s', (date) =>
    expect(saleProblems({ ...s, date }, other)).toContain('Invalid sale date'),
  )
  it('deduplicates transactions', () =>
    expect(validSales([s, { ...s, id: 5 }], new Map([['2', other]])).usable).toHaveLength(1))
  it('flags price-per-sqft outliers', () =>
    expect(saleProblems({ ...s, price: 9000000 }, other).join(' ')).toContain('screening range'))
  it.each(['multiParcel', 'namesOverlap', 'nonMarketDocType'] as const)('rejects %s', (flag) =>
    expect(saleProblems({ ...s, [flag]: true }, other).length).toBeGreaterThan(0),
  )
  it('rejects missing sqft', () =>
    expect(saleProblems(s, { ...other, livingArea: undefined }).length).toBeGreaterThan(0))
  it('rejects unlinked sale', () => expect(saleProblems(s).length).toBeGreaterThan(0))
})
describe('informational valuation', () => {
  it('uses median ppsf times area', () =>
    expect(estimateValue(1000, [comp(400), comp(500), comp(600)], date)?.central).toBe(500000))
  it('requires three comps', () =>
    expect(estimateValue(1000, [comp(), comp()], date)).toBeUndefined())
  it('identical comps retain uncertainty', () => {
    const v = estimateValue(1000, [comp(), comp(), comp()], date)!
    expect(v.low).toBe(450000)
    expect(v.high).toBe(550000)
  })
  it('wide dispersion lowers quality', () =>
    expect(estimateValue(1000, [comp(100), comp(500), comp(1500)], date)?.quality).toBe('Limited'))
  it.each([undefined, 0, -10, NaN, Infinity])('does not estimate area %s', (area) =>
    expect(estimateValue(area, [comp(), comp(), comp()], date)).toBeUndefined(),
  )
  it('rejects missing price-per-sqft', () =>
    expect(estimateValue(1000, [comp(NaN), comp(), comp()], date)).toBeUndefined())
  it('rounds to thousand', () =>
    expect(estimateValue(1031, [comp(501), comp(501), comp(501)], date)?.central).toBe(517000))
  it('five similar recent comps can be strong evidence', () =>
    expect(
      estimateValue(
        1000,
        Array.from({ length: 5 }, () => comp()),
        date,
      )?.quality,
    ).toBe('Strong'))
  it('older comps are limited evidence', () =>
    expect(
      estimateValue(
        1000,
        Array.from({ length: 5 }, () => ({ ...comp(), sale: { ...s, date: '2023-02-01' } })),
        date,
      )?.quality,
    ).toBe('Limited'))
})
describe('ratios', () => {
  it('calculates assessment/value', () =>
    expect(assessmentRatio(600000, 500000, 2026, 2026)).toBe(1.2))
  it.each([0, undefined, NaN])('rejects denominator %s', (v) =>
    expect(assessmentRatio(600000, v, 2026, 2026)).toBeUndefined(),
  )
  it('rejects missing assessment', () =>
    expect(assessmentRatio(undefined, 500000, 2026, 2026)).toBeUndefined())
  it('rejects mismatched years', () =>
    expect(assessmentRatio(600000, 500000, 2026, 2025)).toBeUndefined())
  it('rejects missing years', () => expect(assessmentRatio(600000, 500000)).toBeUndefined())
  it('needs three timing-aligned ratios for median', () =>
    expect(ratioAnalysis(p, [comp(), comp(500, 3)], 500000).reference).toBeUndefined())
  it('calculates a reference only from preceding 12 months', () => {
    const cs = [comp(), comp(500, 3), comp(500, 4)]
    expect(ratioAnalysis(p, cs, 500000).reference).toBe(1.2)
    expect(
      ratioAnalysis(
        p,
        cs.map((c) => ({ ...c, sale: { ...c.sale, date: '2023-01-01' } })),
        500000,
      ).reference,
    ).toBeUndefined()
  })
})
describe('permit context', () => {
  it('includes significant work without inferring completion', () =>
    expect(
      comparablePermitFlags(
        [{ issued: '2024-01-01', workType: 'INTREN', status: 'ISSUED' }],
        s.date,
        date,
      ),
    ).toHaveLength(1))
  it('ignores unrelated time windows and minor work', () =>
    expect(
      comparablePermitFlags(
        [
          { issued: '2010-01-01', workType: 'INTREN' },
          { issued: '2024-01-01', workType: 'GAS', declaredValue: 100 },
        ],
        s.date,
        date,
      ),
    ).toEqual([]))
})
