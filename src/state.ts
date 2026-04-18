import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import type { Category, Quote } from './quotes'
import { PRESETS, type QuotePreset } from './presets'

const STORAGE_KEY = 'hitme:state:v0'
const DEFAULT_COOLDOWN_MS = 24 * 60 * 60 * 1000

export interface Collection {
  id: string
  name: string
  quoteIds: string[]
}

interface Persisted {
  favorites: Record<string, true>
  optOuts: Record<string, true>
  lastShown: Record<string, number>
  enabledPresets: Record<string, true>
  customQuotes: Quote[]
  collections: Collection[]
  cooldownMs: number
  pauseUntil: number | null
}

function defaultState(): Persisted {
  return {
    favorites: {},
    optOuts: {},
    lastShown: {},
    enabledPresets: { essentials: true },
    customQuotes: [],
    collections: [],
    cooldownMs: DEFAULT_COOLDOWN_MS,
    pauseUntil: null,
  }
}

let state: Persisted = defaultState()
let bridge: EvenAppBridge | null = null
const listeners = new Set<() => void>()

export async function initState(b: EvenAppBridge): Promise<void> {
  bridge = b
  const raw = await b.getLocalStorage(STORAGE_KEY)
  if (raw) {
    try {
      state = { ...defaultState(), ...JSON.parse(raw) }
    } catch {
      state = defaultState()
    }
  }
}

async function save(): Promise<void> {
  if (!bridge) return
  await bridge.setLocalStorage(STORAGE_KEY, JSON.stringify(state))
}

function emit(): void {
  for (const fn of listeners) fn()
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export function lookupQuote(id: string): Quote | null {
  for (const preset of PRESETS) {
    const hit = preset.quotes.find(q => q.id === id)
    if (hit) return hit
  }
  return state.customQuotes.find(q => q.id === id) ?? null
}

export function activeQuotes(): Quote[] {
  const seen = new Set<string>()
  const out: Quote[] = []
  const add = (q: Quote) => {
    if (seen.has(q.id)) return
    seen.add(q.id)
    out.push(q)
  }
  for (const preset of PRESETS) {
    if (state.enabledPresets[preset.id]) preset.quotes.forEach(add)
  }
  for (const col of state.collections) {
    if (!state.enabledPresets[col.id]) continue
    for (const qid of col.quoteIds) {
      const q = lookupQuote(qid)
      if (q) add(q)
    }
  }
  state.customQuotes.forEach(add)
  return out
}

export function isFavorite(id: string): boolean {
  return state.favorites[id] === true
}

export function isOptedOut(id: string): boolean {
  return state.optOuts[id] === true
}

export async function toggleFavorite(id: string): Promise<void> {
  if (state.favorites[id]) delete state.favorites[id]
  else state.favorites[id] = true
  await save()
  emit()
}

export async function toggleOptOut(id: string): Promise<void> {
  if (state.optOuts[id]) delete state.optOuts[id]
  else state.optOuts[id] = true
  await save()
  emit()
}

export function allPresets(): QuotePreset[] {
  return PRESETS
}

export function isPresetEnabled(id: string): boolean {
  return state.enabledPresets[id] === true
}

export async function togglePreset(id: string): Promise<void> {
  if (state.enabledPresets[id]) delete state.enabledPresets[id]
  else state.enabledPresets[id] = true
  await save()
  emit()
}

export function allCollections(): Collection[] {
  return state.collections.slice()
}

function newCollectionId(): string {
  return `col_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

export async function addCollection(name: string, quoteIds: string[]): Promise<Collection> {
  const deduped = Array.from(new Set(quoteIds))
  const col: Collection = {
    id: newCollectionId(),
    name: name.trim() || 'Untitled collection',
    quoteIds: deduped,
  }
  state.collections.push(col)
  state.enabledPresets[col.id] = true
  await save()
  emit()
  return col
}

export async function removeCollection(id: string): Promise<void> {
  state.collections = state.collections.filter(c => c.id !== id)
  delete state.enabledPresets[id]
  await save()
  emit()
}

export function customQuotes(): Quote[] {
  return state.customQuotes.slice()
}

function newCustomId(): string {
  return `cust_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export async function addCustomQuote(data: { text: string; category: Category }): Promise<Quote> {
  const quote: Quote = {
    id: newCustomId(),
    text: data.text.trim(),
    category: data.category,
  }
  state.customQuotes.push(quote)
  await save()
  emit()
  return quote
}

export async function updateCustomQuote(id: string, data: { text: string; category: Category }): Promise<void> {
  const existing = state.customQuotes.find(q => q.id === id)
  if (!existing) return
  existing.text = data.text.trim()
  existing.category = data.category
  await save()
  emit()
}

export async function removeCustomQuote(id: string): Promise<void> {
  state.customQuotes = state.customQuotes.filter(q => q.id !== id)
  delete state.favorites[id]
  delete state.optOuts[id]
  delete state.lastShown[id]
  for (const col of state.collections) {
    col.quoteIds = col.quoteIds.filter(x => x !== id)
  }
  await save()
  emit()
}

export function getCooldownMs(): number {
  return state.cooldownMs
}

export async function setCooldownMs(ms: number): Promise<void> {
  state.cooldownMs = Math.max(0, ms | 0)
  await save()
  emit()
}

export function getPauseUntil(): number | null {
  return state.pauseUntil
}

export function isPaused(): boolean {
  return state.pauseUntil !== null && Date.now() < state.pauseUntil
}

export async function setPauseUntil(ts: number | null): Promise<void> {
  state.pauseUntil = ts
  await save()
  emit()
}

export interface PickResult {
  quote: Quote
  recycled: boolean
}

export async function pickNext(): Promise<PickResult | null> {
  const active = activeQuotes()
  const eligible = active.filter(q => !state.optOuts[q.id])
  if (eligible.length === 0) return null

  const cutoff = Date.now() - state.cooldownMs
  let pool = eligible.filter(q => (state.lastShown[q.id] ?? 0) < cutoff)
  let recycled = false
  if (pool.length === 0) {
    for (const q of eligible) delete state.lastShown[q.id]
    pool = eligible
    recycled = true
  }

  const quote = pool[Math.floor(Math.random() * pool.length)]!
  state.lastShown[quote.id] = Date.now()
  await save()
  emit()
  return { quote, recycled }
}
