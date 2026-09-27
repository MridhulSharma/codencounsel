import type {
  AssessmentHistory,
  DataMeta,
  Parcel,
  Permit,
  PilotData,
  Sale,
  TaxBill,
} from '../types/data'

export type SearchProperty = Pick<Parcel, 'pid' | 'address' | 'landUse'>
export function normalizeAddress(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(avenue|ave)\b/g, 'av')
    .replace(/\bstreet\b/g, 'st')
    .replace(/\broad\b/g, 'rd')
    .replace(/\b(apartment|apt|unit)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}
export function createSearchIndex(parcels: SearchProperty[]) {
  return parcels.map((p) => {
    const normalized = normalizeAddress(`${p.address ?? ''} ${p.pid}`)
    return { property: p, normalized, tokens: new Set(normalized.split(' ')) }
  })
}
export function searchIndex(
  index: ReturnType<typeof createSearchIndex>,
  query: string,
): SearchProperty[] {
  const normalized = normalizeAddress(query)
  if (!normalized) return []
  const tokens = normalized.split(' ')
  // Numeric unit/house tokens must match whole tokens: unit 3 must not match ZIP 02134.
  return index
    .filter((p) =>
      tokens.every((t) => (/^\d+$/.test(t) ? p.tokens.has(t) : p.normalized.includes(t))),
    )
    .sort(
      (a, b) =>
        Number(b.normalized.startsWith(normalized)) - Number(a.normalized.startsWith(normalized)) ||
        a.normalized.localeCompare(b.normalized),
    )
    .slice(0, 12)
    .map((p) => p.property)
}

function record(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
export function validateParcels(raw: unknown): Parcel[] {
  if (!Array.isArray(raw) || !raw.length)
    throw new Error('The property dataset is empty or malformed.')
  const ids = new Set<string>()
  for (const p of raw) {
    if (
      !record(p) ||
      typeof p.pid !== 'string' ||
      !/^\d{10}$/.test(p.pid) ||
      ids.has(p.pid) ||
      typeof p.address !== 'string'
    )
      throw new Error('The property dataset contains an invalid or duplicate record.')
    ids.add(p.pid)
    for (const key of [
      'livingArea',
      'totalValue',
      'landValue',
      'buildingValue',
      'fiscalYear',
      'yearBuilt',
      'bedrooms',
      'fullBaths',
      'halfBaths',
      'lat',
      'lon',
      'landSf',
    ]) {
      if (p[key] !== undefined && (typeof p[key] !== 'number' || !Number.isFinite(p[key])))
        throw new Error('A property measurement is malformed.')
    }
  }
  return raw as Parcel[]
}
async function json(name: string): Promise<unknown> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${name}.json`)
  if (!response.ok)
    throw new Error('Public records could not be loaded. Check your connection and retry.')
  return response.json()
}
export interface PropertySource {
  searchProperties(query: string): Promise<SearchProperty[]>
  getProperty(id: string): Promise<Parcel | undefined>
  getAssessmentHistory(id: string): Promise<AssessmentHistory>
  getSales(): Promise<Sale[]>
  getPermits(id: string): Promise<Permit[]>
  getTaxInformation(id: string): Promise<TaxBill | undefined>
  loadAnalysis(): Promise<PilotData>
}
class StaticPilotSource implements PropertySource {
  private index?: Promise<ReturnType<typeof createSearchIndex>>
  private analysis?: Promise<PilotData>
  async searchProperties(query: string) {
    this.index ??= json('search')
      .then((raw) => createSearchIndex(validateParcels(raw)))
      .catch((error) => {
        this.index = undefined
        throw error
      })
    return searchIndex(await this.index, query)
  }
  loadAnalysis(): Promise<PilotData> {
    this.analysis ??= Promise.all(['parcels', 'sales', 'history', 'permits', 'meta'].map(json))
      .then(([p, s, h, r, m]) => {
        const parcels = validateParcels(p)
        if (
          !Array.isArray(s) ||
          !s.every(
            (v) =>
              record(v) &&
              typeof v.pid === 'string' &&
              typeof v.date === 'string' &&
              typeof v.id === 'number',
          ) ||
          !record(h) ||
          !record(r) ||
          !record(m) ||
          typeof m.latestFiscalYear !== 'number'
        )
          throw new Error('Analysis records are malformed. Please regenerate the public dataset.')
        if (
          !Object.values(h).every(
            (v) =>
              Array.isArray(v) &&
              v.every(
                (x) =>
                  Array.isArray(x) &&
                  x.length === 2 &&
                  x.every((n) => typeof n === 'number' && Number.isFinite(n)),
              ),
          )
        )
          throw new Error('Assessment history is malformed.')
        if (!Object.values(r).every((v) => Array.isArray(v) && v.every(record)))
          throw new Error('Permit records are malformed.')
        const sales = s as Sale[]
        const salesByPid = new Map<string, Sale[]>()
        for (const sale of sales)
          salesByPid.set(sale.pid, [...(salesByPid.get(sale.pid) ?? []), sale])
        return {
          parcels,
          parcelsByPid: new Map(parcels.map((p) => [p.pid, p])),
          sales,
          salesByPid,
          history: h as PilotData['history'],
          permits: r as PilotData['permits'],
          meta: m as unknown as DataMeta,
        }
      })
      .catch((error) => {
        this.analysis = undefined
        throw error
      })
    return this.analysis
  }
  async getProperty(id: string) {
    return (await this.loadAnalysis()).parcelsByPid.get(id)
  }
  async getAssessmentHistory(id: string) {
    return (await this.loadAnalysis()).history[id] ?? []
  }
  async getSales() {
    return (await this.loadAnalysis()).sales
  }
  async getPermits(id: string) {
    return (await this.loadAnalysis()).permits[id] ?? []
  }
  async getTaxInformation(id: string) {
    return (await this.getProperty(id))?.taxBill
  }
}
export const propertySource: PropertySource = new StaticPilotSource()
// Selected for complete records, without regard to the estimate's direction.
export const DEMO_PID = '2100566042'
