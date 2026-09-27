import { describe, it, expect } from 'vitest'
import { createSearchIndex, searchIndex, normalizeAddress, validateParcels } from './data'
const records = [
  { pid: '2100000000', address: '59 BRIGHTON AV 59-3, ALLSTON, MA 02134' },
  { pid: '2100000001', address: '59 BRIGHTON AV 59-4, ALLSTON, MA 02134' },
  { pid: '2100000002', address: '9 Gardner ST 5, ALLSTON, MA 02134' },
]
const index = createSearchIndex(records)
describe('property search', () => {
  it.each([
    '59 brighton',
    '59 BRIGHTON',
    ' 59   Brighton ',
    '59 Brighton Avenue',
    '59 brighton ave',
  ])('normalizes %s', (query) => expect(searchIndex(index, query)).toHaveLength(2))
  it('finds units without matching ZIP-code digits', () => {
    expect(searchIndex(index, '59 brighton unit 59-3')).toHaveLength(1)
    expect(searchIndex(index, '59 brighton unit 59-3')[0]?.pid).toBe('2100000000')
  })
  it('normalizes punctuation and street suffixes', () =>
    expect(normalizeAddress('Gardner Street, Apt 5')).toBe('gardner st 5'))
  it('returns no matches', () => expect(searchIndex(index, 'xyz')).toEqual([]))
  it('does not return the whole index for empty input', () =>
    expect(searchIndex(index, ' ')).toEqual([]))
  it('limits broad results', () =>
    expect(
      searchIndex(
        createSearchIndex(
          Array.from({ length: 100 }, (_, i) => ({ pid: String(i), address: 'Brighton' })),
        ),
        'brighton',
      ),
    ).toHaveLength(12))
  it('finds parcel IDs', () =>
    expect(searchIndex(index, '2100000002')[0]?.address).toContain('Gardner'))
  it('rejects malformed records', () => expect(() => validateParcels([{ pid: 'bad' }])).toThrow())
  it('rejects invalid measurement', () =>
    expect(() => validateParcels([{ ...records[0], livingArea: '100' }])).toThrow())
  it('rejects duplicate parcels', () =>
    expect(() => validateParcels([records[0], records[0]])).toThrow())
})
