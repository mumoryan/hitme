import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import {
  CreateStartUpPageContainer,
  OsEventTypeList,
  TextContainerProperty,
  TextContainerUpgrade,
} from '@evenrealities/even_hub_sdk'
import type { Quote } from './quotes'
import { addToHistory, eligibleQuotes, getCalendarUrl, isDevMode, isPaused, markShown, pickNext, type PickResult } from './state'
import { fetchUpcomingEvents } from './calendar'
import { hasApiKey, pickQuoteByContext } from './ai'

export interface HitLog {
  quoteText: string
  source: 'calendar' | 'random'
  eventTitle?: string
  at: Date
}

let lastHit: HitLog | null = null

export function getLastHit(): HitLog | null {
  return lastHit
}

const CONTAINER_ID = 1
const CONTAINER_NAME = 'quote'
const PLACEHOLDER = 'Hit me!\n\nDouble-tap to summon a quote.'
const RECYCLE_NOTICE = 'Starting fresh...'
const RECYCLE_HOLD_MS = 1200
const PROGRESS_STEPS = 10
const STEP_MS = 1000

let cancelStep: (() => void) | null = null
let runToken = 0

export async function initGlasses(bridge: EvenAppBridge): Promise<void> {
  const text = new TextContainerProperty({
    xPosition: 0,
    yPosition: 0,
    width: 576,
    height: 288,
    borderWidth: 0,
    borderColor: 0,
    paddingLength: 16,
    containerID: CONTAINER_ID,
    containerName: CONTAINER_NAME,
    content: PLACEHOLDER,
    isEventCapture: 1,
  })

  const result = await bridge.createStartUpPageContainer(new CreateStartUpPageContainer({
    containerTotalNum: 1,
    textObject: [text],
  }))

  if (result !== 0) {
    console.error('[glasses] createStartUpPageContainer failed with code', result)
    return
  }

  bridge.onEvenHubEvent(async (event) => {
    if (!event.sysEvent) return
    if (event.sysEvent.eventType !== OsEventTypeList.DOUBLE_CLICK_EVENT) return
    if (isPaused()) return
    await hitMeNow(bridge)
  })
}

async function resolveNextQuote(): Promise<PickResult | null> {
  const calUrl = getCalendarUrl()
  if ((calUrl || isDevMode()) && hasApiKey()) {
    try {
      const events = await fetchUpcomingEvents(calUrl, undefined, isDevMode())
      if (events.length > 0) {
        const eventTitle = events[0].title
        const pool = eligibleQuotes()
        const quote = await pickQuoteByContext(eventTitle, pool)
        if (quote) {
          await markShown(quote.id)
          lastHit = { quoteText: quote.text, source: 'calendar', eventTitle, at: new Date() }
          console.log(`[hitme] calendar-matched quote for "${eventTitle}":`, quote.text)
          void addToHistory({ quoteId: quote.id, quoteText: quote.text, quoteAuthor: quote.author, category: quote.category, source: 'calendar', eventTitle, at: Date.now() })
          return { quote, recycled: false }
        }
      }
    } catch (err) {
      console.warn('[hitme] calendar/AI path failed, falling back to random:', err)
    }
  }
  const result = await pickNext()
  if (result) {
    lastHit = { quoteText: result.quote.text, source: 'random', at: new Date() }
    void addToHistory({ quoteId: result.quote.id, quoteText: result.quote.text, quoteAuthor: result.quote.author, category: result.quote.category, source: 'random', at: Date.now() })
  }
  return result
}

export async function hitMeNow(bridge: EvenAppBridge): Promise<void> {
  cancelStep?.()
  cancelStep = null
  const myToken = ++runToken

  const next = await resolveNextQuote()
  if (myToken !== runToken) return

  if (!next) {
    await updateContent(bridge, 'No quotes available')
    return
  }

  if (next.recycled) {
    await updateContent(bridge, RECYCLE_NOTICE)
    await sleep(RECYCLE_HOLD_MS, myToken)
    if (myToken !== runToken) return
  }

  for (let step = PROGRESS_STEPS; step >= 0; step--) {
    if (myToken !== runToken) return
    if (step === 0) {
      await updateContent(bridge, PLACEHOLDER)
      return
    }
    await updateContent(bridge, formatQuote(next.quote, step))
    await sleep(STEP_MS, myToken)
  }
}

function sleep(ms: number, myToken: number): Promise<void> {
  return new Promise<void>(resolve => {
    const timer = setTimeout(() => {
      if (cancelStep === cancel) cancelStep = null
      resolve()
    }, ms)
    const cancel = () => { clearTimeout(timer); resolve() }
    cancelStep = cancel
    // If already superseded by the time we register, bail immediately
    if (myToken !== runToken) { clearTimeout(timer); cancelStep = null; resolve() }
  })
}

function progressBar(remaining: number, total: number): string {
  return '█'.repeat(remaining) + '░'.repeat(total - remaining)
}

function formatQuote(q: Quote, remaining: number): string {
  const body = q.author ? `${q.text}\n\n— ${q.author}` : q.text
  return `${body}\n\n${progressBar(remaining, PROGRESS_STEPS)}`
}

async function updateContent(bridge: EvenAppBridge, content: string): Promise<void> {
  await bridge.textContainerUpgrade(new TextContainerUpgrade({
    containerID: CONTAINER_ID,
    containerName: CONTAINER_NAME,
    content,
  }))
}
