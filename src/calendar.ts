export interface CalendarEvent {
  title: string
  start: Date
  end: Date
}

export async function fetchUpcomingEvents(
  icalUrl: string,
  windowMs = 2 * 60 * 60 * 1000,
  devMode = false,
): Promise<CalendarEvent[]> {
  if (devMode) {
    const { generateDevIcs } = await import('./dev-calendar')
    return parseIcs(generateDevIcs(), windowMs)
  }
  const res = await fetch(icalUrl)
  if (!res.ok) throw new Error(`Calendar fetch failed: ${res.status}`)
  const text = await res.text()
  return parseIcs(text, windowMs)
}

function parseIcs(ics: string, windowMs: number): CalendarEvent[] {
  const now = Date.now()
  const windowEnd = now + windowMs
  const events: CalendarEvent[] = []

  // Unfold lines (continuation lines start with a space or tab)
  const unfolded = ics.replace(/\r?\n[ \t]/g, '')
  const lines = unfolded.split(/\r?\n/)

  let inEvent = false
  let summary = ''
  let dtStart: Date | null = null
  let dtEnd: Date | null = null
  let isRecurring = false

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      summary = ''
      dtStart = null
      dtEnd = null
      isRecurring = false
      continue
    }
    if (line === 'END:VEVENT') {
      inEvent = false
      if (!isRecurring && summary && dtStart && dtEnd) {
        // Include if event overlaps [now, windowEnd]
        if (dtStart.getTime() < windowEnd && dtEnd.getTime() > now) {
          events.push({ title: summary, start: dtStart, end: dtEnd })
        }
      }
      continue
    }
    if (!inEvent) continue

    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx)
    const value = line.slice(colonIdx + 1)

    const baseKey = key.split(';')[0]

    if (baseKey === 'SUMMARY') {
      summary = value
    } else if (baseKey === 'RRULE') {
      isRecurring = true
    } else if (baseKey === 'DTSTART') {
      dtStart = parseIcsDate(key, value)
    } else if (baseKey === 'DTEND') {
      dtEnd = parseIcsDate(key, value)
    }
  }

  // Sort by start time so callers get the soonest event first
  events.sort((a, b) => a.start.getTime() - b.start.getTime())
  return events
}

function parseIcsDate(key: string, value: string): Date | null {
  // All-day event: DTSTART;VALUE=DATE:20260418
  const isDate = key.includes('VALUE=DATE') || /^\d{8}$/.test(value.trim())
  if (isDate) {
    const v = value.trim()
    const year = parseInt(v.slice(0, 4), 10)
    const month = parseInt(v.slice(4, 6), 10) - 1
    const day = parseInt(v.slice(6, 8), 10)
    const d = new Date(year, month, day, 0, 0, 0)
    return isNaN(d.getTime()) ? null : d
  }

  // UTC datetime: DTSTART:20260418T180000Z
  if (value.endsWith('Z')) {
    const d = new Date(
      `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`,
    )
    return isNaN(d.getTime()) ? null : d
  }

  // Local datetime (no timezone): DTSTART:20260418T180000
  // Treat as local time
  if (/^\d{8}T\d{6}$/.test(value.trim())) {
    const v = value.trim()
    const d = new Date(
      parseInt(v.slice(0, 4), 10),
      parseInt(v.slice(4, 6), 10) - 1,
      parseInt(v.slice(6, 8), 10),
      parseInt(v.slice(9, 11), 10),
      parseInt(v.slice(11, 13), 10),
      parseInt(v.slice(13, 15), 10),
    )
    return isNaN(d.getTime()) ? null : d
  }

  return null
}
