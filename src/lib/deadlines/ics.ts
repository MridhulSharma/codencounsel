import { addDays } from './dates'

export interface CalendarEvent {
  uid: string
  date: string // ISO all-day date
  summary: string
  description: string
  /** Days before the event to show a reminder. */
  alarmDaysBefore?: number
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

/** Fold lines longer than 75 octets per RFC 5545 §3.1. */
function fold(line: string): string {
  const bytes = new TextEncoder()
  if (bytes.encode(line).length <= 75) return line
  const out: string[] = []
  let current = ''
  for (const ch of line) {
    const limit = out.length === 0 ? 75 : 74
    if (bytes.encode(current + ch).length > limit) {
      out.push(current)
      current = ch
    } else {
      current += ch
    }
  }
  out.push(current)
  return out.join('\r\n ')
}

const compact = (iso: string) => iso.replace(/-/g, '')

export function buildIcs(events: CalendarEvent[], now: Date = new Date()): string {
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Level//Property Tax Deadlines//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid.replace(/[^a-zA-Z0-9_-]/g, '-')}@level.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(e.date)}`,
      `DTEND;VALUE=DATE:${compact(addDays(e.date, 1))}`,
      `SUMMARY:${escapeText(e.summary)}`,
      `DESCRIPTION:${escapeText(e.description)}`,
      'TRANSP:TRANSPARENT',
    )
    if (e.alarmDaysBefore && e.alarmDaysBefore > 0) {
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeText(e.summary)}`,
        `TRIGGER:-P${e.alarmDaysBefore}D`,
        'END:VALARM',
      )
    }
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}
