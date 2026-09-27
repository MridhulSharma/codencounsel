/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import type { PilotData } from '../types/data'
import { DEMO_PID, validateParcels } from './data'
import { rankComparables, estimateValue, ratioAnalysis } from './valuation/engine'
const read = (name: string) =>
  JSON.parse(readFileSync(new URL(`../../public/data/${name}.json`, import.meta.url), 'utf8'))
const parcels = validateParcels(read('parcels'))
const data: PilotData = {
  parcels,
  parcelsByPid: new Map(parcels.map((p) => [p.pid, p])),
  sales: read('sales'),
  salesByPid: new Map(),
  history: read('history'),
  permits: read('permits'),
  meta: read('meta'),
}
describe('real pilot integration', () => {
  it('loads the audited count', () => expect(parcels).toHaveLength(4428))
  it('latest assessments align with history', () => {
    for (const p of parcels) {
      expect(data.history[p.pid]?.find((h) => h[0] === p.fiscalYear)?.[1]).toBe(p.totalValue)
    }
  })
  it('demo produces five real comps and a conservative range', () => {
    const p = data.parcelsByPid.get(DEMO_PID)!
    const ranking = rankComparables(p, data)
    expect(ranking.comps).toHaveLength(5)
    const v = estimateValue(p.livingArea, ranking.comps, ranking.valuationDate)!
    expect(v.low).toBe(521000)
    expect(v.high).toBe(637000)
    expect(p.totalValue).toBeLessThan(v.low)
    expect(ratioAnalysis(p, ranking.comps, v.central).reference).toBeGreaterThan(0)
  })
  it('exports no owner or permit narrative fields', () => {
    for (const name of ['parcels', 'sales', 'permits', 'search'])
      expect(
        readFileSync(new URL(`../../public/data/${name}.json`, import.meta.url), 'utf8'),
      ).not.toMatch(
        /"(?:owner_name|assessor_owner|grantor|grantee|applicant|mail_street_address|description|comments)"\s*:/,
      )
  })
  it('has no non-finite serialized numbers', () => {
    for (const name of ['parcels', 'sales', 'history', 'permits'])
      expect(
        readFileSync(new URL(`../../public/data/${name}.json`, import.meta.url), 'utf8'),
      ).not.toMatch(/:\s*(?:NaN|Infinity)/)
  })
})
