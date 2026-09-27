import { describe, it, expect } from 'vitest'
import {
  addDays,
  addMonths,
  applyAtbBusinessDayRule,
  applyBusinessDayRule,
  isValidIsoDate,
  weekday,
} from './dates'
import { calculateDeadlines } from './deadlines'
import { buildIcs } from './ics'
describe('calendar dates', () => {
  it.each([
    ['2027-02-01', '2027-02-01'],
    ['2026-02-01', '2026-02-02'],
  ])('local filing %s → %s', (date, expected) =>
    expect(applyBusinessDayRule(date).effective).toBe(expected),
  )
  it('extends Saturday local filing under the specific abatement statute', () => {
    const d = applyBusinessDayRule('2025-02-01')
    expect(d.effective).toBe('2025-02-03')
    expect(d.explanation).toContain('§ 59')
    expect(d.explanation).toContain('confirm local office closures')
  })
  it('ATB rule explicitly extends Saturdays', () =>
    expect(applyAtbBusinessDayRule('2025-02-01').effective).toBe('2025-02-03'))
  it('extends holidays', () =>
    expect(applyBusinessDayRule('2026-05-25').effective).toBe('2026-05-26'))
  it('handles Sunday-observed holidays', () =>
    expect(applyBusinessDayRule('2027-07-04').effective).toBe('2027-07-06'))
  it('flags Suffolk closures', () =>
    expect(applyBusinessDayRule('2026-03-17').warnings.length).toBeGreaterThan(0))
  it.each([
    ['2023-11-30', 3, '2024-02-29'],
    ['2024-11-30', 3, '2025-02-28'],
    ['2024-01-31', 1, '2024-02-29'],
    ['2024-02-29', 12, '2025-02-28'],
    ['2026-01-31', 3, '2026-04-30'],
    ['2025-01-01', -12, '2024-01-01'],
  ])('calendar addition %s + %s', (date, n, expected) => expect(addMonths(date, n)).toBe(expected))
  it.each(['', 'not-a-date', '2025-02-29', '2026-04-31', '2026-13-01', '0000-01-01', '2026-01-00'])(
    'rejects %s',
    (date) => expect(isValidIsoDate(date)).toBe(false),
  )
  it('validates leap day', () => expect(isValidIsoDate('2024-02-29')).toBe(true))
  it('day addition crosses year', () => expect(addDays('2026-12-31', 1)).toBe('2027-01-01'))
  it('UTC arithmetic stays calendar-date safe', () => {
    expect(weekday('2026-02-01')).toBe(0)
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09')
  })
})
describe('deadline workflow', () => {
  it('applies the §59 Saturday extension to the displayed abatement deadline', () => {
    expect(calculateDeadlines({ billDueDate: '2025-02-01', fiscalYear: 2025 }).items.find(item => item.id === 'abatement')?.date).toBe('2025-02-03')
  })
  const atb = (input: Parameters<typeof calculateDeadlines>[0]) =>
    calculateDeadlines(input).items.find((i) => i.id === 'atb')
  it('does not guess from fiscal year', () =>
    expect(calculateDeadlines({ fiscalYear: 2027 }).items.every((i) => !i.date)).toBe(true))
  it('uses decision date', () =>
    expect(atb({ decisionDate: '2026-03-02' })?.date).toBe('2026-06-02'))
  it('uses filing +3 months then +3 for deemed denial', () =>
    expect(atb({ filingDate: '2026-02-02' })?.date).toBe('2026-08-03'))
  it('stops inferred dates with written extension', () =>
    expect(atb({ filingDate: '2026-02-02', extensionAgreed: true })?.date).toBeUndefined())
  it('accepts actual decision with extension', () =>
    expect(
      atb({ filingDate: '2026-02-02', extensionAgreed: true, decisionDate: '2026-06-02' })?.date,
    ).toBe('2026-09-02'))
  it('ignores hidden stale decision', () =>
    expect(atb({ decisionReceived: false, decisionDate: '2026-03-02' })?.date).toBeUndefined())
  it('requires action date when decision received', () =>
    expect(atb({ decisionReceived: true, filingDate: '2026-02-02' })?.date).toBeUndefined())
  it('does not restart clock on late decision', () =>
    expect(atb({ filingDate: '2026-02-02', decisionDate: '2026-06-02' })?.date).toBe('2026-08-03'))
  it('rejects decision before filing', () =>
    expect(atb({ filingDate: '2026-02-02', decisionDate: '2026-01-02' })?.date).toBeUndefined())
  it('does not silently fall back from invalid date', () =>
    expect(atb({ filingDate: '2026-02-02', decisionDate: 'invalid' })?.date).toBeUndefined())
  it('warns of late filing', () =>
    expect(
      calculateDeadlines({
        billDueDate: '2026-02-02',
        filingDate: '2026-03-01',
      }).inputWarnings.join(' '),
    ).toContain('after'))
  it('warns about incompatible fiscal year', () =>
    expect(
      calculateDeadlines({ billDueDate: '2026-02-02', fiscalYear: 2027 }).inputWarnings.join(' '),
    ).toContain('differs'))
})
describe('ICS export', () => {
  const ics = buildIcs(
    [
      {
        uid: 'test',
        date: '2026-12-31',
        summary: 'Review, verify; confirm',
        description: 'First line\nSecond \\ line',
        alarmDaysBefore: 7,
      },
    ],
    new Date('2026-09-27T12:00:00Z'),
  )
  it('contains correct all-day dates and exclusive end', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20261231')
    expect(ics).toContain('DTEND;VALUE=DATE:20270101')
  })
  it('escapes punctuation and newline', () => {
    expect(ics).toContain('Review\\, verify\\; confirm')
    expect(ics).toContain('First line\\nSecond \\\\ line')
  })
  it('contains timestamp and reminder', () => {
    expect(ics).toContain('DTSTAMP:20260927T120000Z')
    expect(ics).toContain('TRIGGER:-P7D')
  })
  it('uses CRLF and terminator', () => expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true))
  it('folds UTF-8 lines at 75 bytes', () => {
    const long = buildIcs([
      { uid: 'x', date: '2026-01-01', summary: 'é'.repeat(150), description: 'x' },
    ])
    for (const line of long.split('\r\n'))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
  })
  it('prevents UID line injection', () =>
    expect(
      buildIcs([{ uid: 'x\r\nBAD', date: '2026-01-01', summary: 'x', description: 'x' }]),
    ).toContain('UID:x--BAD@level.local'))
})
