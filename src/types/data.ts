/**
 * Shapes of the static pilot data written by scripts/export-data.py.
 * Every field that may be absent in the public record is optional: a missing
 * value means "not recorded", never zero.
 */

export interface TaxBill {
  year: number
  grossTax?: number
  residentialExemption?: number
  cpa?: number
  totalBilled?: number
}

export interface Parcel {
  pid: string
  address?: string
  streetNumber?: string
  streetName?: string
  unit?: string
  zip?: string
  landUse?: string
  landUseDesc?: string
  buildingType?: string
  condoMainId?: string
  resUnits?: number
  landSf?: number
  grossArea?: number
  livingArea?: number
  yearBuilt?: number
  yearRemodeled?: number
  bedrooms?: number
  fullBaths?: number
  halfBaths?: number
  totalRooms?: number
  overallCondition?: string
  interiorCondition?: string
  exteriorCondition?: string
  landValue?: number
  buildingValue?: number
  totalValue?: number
  grossTax?: number
  /** Fiscal year of the assessed values on this record. */
  fiscalYear?: number
  lat?: number
  lon?: number
  taxBill?: TaxBill
}

export interface Sale {
  id: number
  pid: string
  /** ISO date, YYYY-MM-DD */
  date: string
  price?: number
  docType?: string
  source?: string
  confidence?: string
  /** Registry of Deeds book/page reference when available. */
  deedRef?: string
  /** One deed conveyed several parcels, so the price is not attributable to one. */
  multiParcel?: boolean
  /** Grantor and grantee share a surname/entity token — possibly not arm's-length. */
  namesOverlap?: boolean
  /** Foreclosure, confirmatory, or master deed. */
  nonMarketDocType?: boolean
}

export interface Permit {
  number?: string
  workType?: string
  permitType?: string
  description?: string
  declaredValue?: number
  /** ISO date */
  issued?: string
  status?: string
}

/** [fiscalYear, assessedValue] pairs, ascending by year. */
export type AssessmentHistory = Array<[number, number]>

export interface DataMeta {
  source: string
  latestFiscalYear: number
  latestSaleDate?: string
  counts: Record<string, number>
}

export interface PilotData {
  meta: DataMeta
  parcels: Parcel[]
  parcelsByPid: Map<string, Parcel>
  sales: Sale[]
  salesByPid: Map<string, Sale[]>
  history: Record<string, AssessmentHistory>
  permits: Record<string, Permit[]>
}
