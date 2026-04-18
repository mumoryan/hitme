// Fake Google Calendar ICS for dev/sim testing.
// All times are relative to Date.now() so events are always upcoming.

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function mins(n: number): number {
  return n * 60 * 1000
}

function hours(n: number): number {
  return n * 60 * 60 * 1000
}

function days(n: number): number {
  return n * 24 * 60 * 60 * 1000
}

interface EventDef {
  title: string
  startOffset: number  // ms from now
  duration: number     // ms
}

const EVENTS: EventDef[] = [
  // --- Today: within the 2h window (always testable on first double-tap) ---
  { title: 'Team standup',                          startOffset: -mins(20),  duration: mins(30) },
  { title: 'Networking event with investors',        startOffset: mins(45),   duration: hours(1) },
  { title: '1:1 with manager',                      startOffset: hours(1.5), duration: mins(30) },

  // --- Today: later ---
  { title: 'Gym session',                           startOffset: hours(3),   duration: hours(1) },
  { title: 'Product demo prep',                     startOffset: hours(5),   duration: hours(2) },

  // --- Tomorrow ---
  { title: 'Job interview at Series A startup',     startOffset: days(1),                duration: hours(1.5) },
  { title: 'Coffee chat with design lead',          startOffset: days(1) + hours(3),     duration: mins(45) },
  { title: 'Evening run',                           startOffset: days(1) + hours(6),     duration: hours(1) },

  // --- Day 2 ---
  { title: 'Product review with stakeholders',      startOffset: days(2),                duration: hours(2) },
  { title: 'Dentist appointment',                   startOffset: days(2) + hours(3),     duration: hours(1) },
  { title: 'Dinner with old friends',               startOffset: days(2) + hours(7),     duration: hours(2) },

  // --- Day 3 ---
  { title: 'Public speaking workshop',              startOffset: days(3),                duration: hours(3) },
  { title: 'Quarterly planning review',             startOffset: days(3) + hours(4),     duration: hours(1.5) },
  { title: 'Date night',                            startOffset: days(3) + hours(7),     duration: hours(2.5) },

  // --- Day 4 ---
  { title: 'Yoga and meditation session',           startOffset: days(4),                duration: hours(1) },
  { title: 'Creative brainstorm with product team', startOffset: days(4) + hours(2),     duration: hours(1.5) },
  { title: 'Mentor meeting',                        startOffset: days(4) + hours(5),     duration: hours(1) },

  // --- Day 5 ---
  { title: 'Project deadline: MVP launch',          startOffset: days(5),                duration: hours(1) },
  { title: 'Phone call with mom',                   startOffset: days(5) + hours(3),     duration: mins(45) },
  { title: 'Team celebration dinner',               startOffset: days(5) + hours(7),     duration: hours(2) },

  // --- Day 6 ---
  { title: 'TypeScript deep dive study session',    startOffset: days(6),                duration: hours(2) },
  { title: 'Cold water swim',                       startOffset: days(6) + hours(3),     duration: mins(45) },
  { title: 'Weekly retrospective',                  startOffset: days(6) + hours(5),     duration: hours(1) },

  // --- Day 7 ---
  { title: 'Pitch deck review with co-founder',     startOffset: days(7),                duration: hours(2) },
  { title: 'Hiking trip with friends',              startOffset: days(7) + hours(3),     duration: hours(4) },
]

export function generateDevIcs(): string {
  const now = Date.now()
  const vevents = EVENTS.map((e, i) => {
    const start = new Date(now + e.startOffset)
    const end = new Date(now + e.startOffset + e.duration)
    return [
      'BEGIN:VEVENT',
      `UID:dev-${i}@hitme.local`,
      `SUMMARY:${e.title}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      'END:VEVENT',
    ].join('\r\n')
  }).join('\r\n')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hitme Dev//EN',
    vevents,
    'END:VCALENDAR',
  ].join('\r\n')
}
