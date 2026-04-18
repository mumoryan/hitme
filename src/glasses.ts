import emoticonText from '../public/emoticon-faces.txt?raw'
import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import {
  CreateStartUpPageContainer,
  OsEventTypeList,
  TextContainerProperty,
  TextContainerUpgrade,
} from '@evenrealities/even_hub_sdk'
import type { Category, Quote } from './quotes'
import { addToHistory, eligibleQuotes, getCalendarUrl, isDevMode, isPaused, markShown, pickNext, type PickResult } from './state'
import { fetchUpcomingEvents } from './calendar'
import { hasApiKey, pickQuoteByContext } from './ai'

export interface HitLog {
  quoteText: string
  source: 'calendar' | 'random' | 'voice'
  eventTitle?: string
  at: Date
}

let lastHit: HitLog | null = null
let pendingVoicePhrase: string | null = null

export function getLastHit(): HitLog | null {
  return lastHit
}

export function setVoicePhrase(phrase: string): void {
  pendingVoicePhrase = phrase.trim() || null
}

const CONTAINER_ID = 1
const CONTAINER_NAME = 'quote'

// Parse emoticon list: strip BOM, trailing descriptions, and anything too long to be a face
const ALL_EMOTICONS = emoticonText
  .replace(/^\uFEFF/, '')
  .split('\n')
  .map(line => (line.split(/\s{2,}/)[0] ?? '').trim())
  .filter(e => e.length > 0 && e.length <= 15)

function buildPlaceholder(): string {
  const emoticon = ALL_EMOTICONS[Math.floor(Math.random() * ALL_EMOTICONS.length)] ?? '( o_o )'
  const title = '\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000\u3000ＨＩＴ　ＭＥ！'
  const footer = '                        Double-tap your ring for motivation!'
  const pad = Math.max(0, Math.round((42 - emoticon.length) / 2))
  const centeredEmoticon = ' '.repeat(pad) + emoticon
  return [title, '', centeredEmoticon, '', footer].join('\n')
}

const RECYCLE_NOTICE = '→  All caught up.\n   Starting fresh...'
const RECYCLE_HOLD_MS = 1500

// 176 sub-char steps × 40ms = 7 040ms total; 8 sub-levels per bar position
const PROGRESS_STEPS = 176
const STEP_MS = 40
const BAR_CHARS = 22
// left-block partials: index 0 = ▏ (1/8) … index 6 = ▉ (7/8)
const PARTIAL_BLOCKS = ['▏', '▎', '▍', '▌', '▋', '▊', '▉'] as const

const SPRITE_FRAMES: Record<Category, readonly string[]> = {
  stoic:  ['◆', '◇', '◈', '◇'],  // slow diamond pulse
  hustle: ['★', '☆', '★', '★'],  // star blink
  calm:   ['○', '◌', '●', '◌'],  // breathing circle
  none:   ['◇', '◇', '◈', '◇'],  // subtle diamond
}

let cancelStep: (() => void) | null = null
let runToken = 0

export async function initGlasses(bridge: EvenAppBridge): Promise<void> {
  const text = new TextContainerProperty({
    xPosition: 0,
    yPosition: 0,
    width: 576,
    height: 288,
    borderWidth: 2,
    borderColor: 13,
    borderRadius: 6,
    paddingLength: 20,
    containerID: CONTAINER_ID,
    containerName: CONTAINER_NAME,
    content: buildPlaceholder(),
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

  void updateContent(bridge, buildPlaceholder())
}

async function resolveNextQuote(): Promise<PickResult | null> {
  // Voice phrase takes highest priority
  if (pendingVoicePhrase && hasApiKey()) {
    const phrase = pendingVoicePhrase
    pendingVoicePhrase = null
    try {
      const pool = eligibleQuotes()
      const quote = await pickQuoteByContext(phrase, pool)
      if (quote) {
        await markShown(quote.id)
        lastHit = { quoteText: quote.text, source: 'voice', eventTitle: phrase, at: new Date() }
        console.log(`[hitme] voice-matched quote for "${phrase}":`, quote.text)
        void addToHistory({ quoteId: quote.id, quoteText: quote.text, quoteAuthor: quote.author, category: quote.category, source: 'voice', eventTitle: phrase, at: Date.now() })
        return { quote, recycled: false }
      }
    } catch (err) {
      console.warn('[hitme] voice/AI path failed, falling back to calendar/random:', err)
    }
  }

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
    void updateContent(bridge, buildPlaceholder())
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
      void updateContent(bridge, buildPlaceholder())
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

function progressBar(remaining: number): string {
  const fullChars = Math.floor(remaining / 8)
  const subLevel = remaining % 8  // 0 = no partial, 1–7 = partial block index
  const partial = subLevel > 0 ? PARTIAL_BLOCKS[subLevel - 1] : ''
  const emptyChars = BAR_CHARS - fullChars - (subLevel > 0 ? 1 : 0)
  return '━'.repeat(fullChars) + partial + '─'.repeat(emptyChars)
}

function categorySprite(category: Category, remaining: number): string {
  const frames = SPRITE_FRAMES[category]
  const frame = Math.floor(remaining / 8) % frames.length
  return frames[frame]!
}

function formatQuote(q: Quote, remaining: number): string {
  const sprite = categorySprite(q.category, remaining)
  const body = q.author
    ? `\u201c${q.text}\u201d\n\n  \u2014 ${q.author}`
    : `\u201c${q.text}\u201d`
  return `${sprite}  ${body}\n\n${progressBar(remaining)}`
}

async function updateContent(bridge: EvenAppBridge, content: string): Promise<void> {
  await bridge.textContainerUpgrade(new TextContainerUpgrade({
    containerID: CONTAINER_ID,
    containerName: CONTAINER_NAME,
    content,
  }))
}
