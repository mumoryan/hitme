import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import type { Category, Quote } from './quotes'
import { hitMeNow, setVoicePhrase } from './glasses'
import {
  activeQuotes,
  addCollection,
  addCustomQuote,
  allCollections,
  allPresets,
  customQuotes,
  getCalendarUrl,
  getCooldownMs,
  getHistory,
  getPauseUntil,
  isFavorite,
  isDevMode,
  isOptedOut,
  isPaused,
  isPresetEnabled,
  lookupQuote,
  removeCollection,
  removeCustomQuote,
  setCalendarUrl,
  setCooldownMs,
  setDevMode,
  setPauseUntil,
  subscribe,
  toggleFavorite,
  toggleOptOut,
  togglePreset,
  updateCustomQuote,
  type HistoryEntry,
} from './state'
import { fetchUpcomingEvents } from './calendar'
import { getLastHit } from './glasses'
import { hasApiKey } from './ai'

type Tab = 'library' | 'presets' | 'custom' | 'history' | 'settings'

const TABS: { key: Tab; label: string }[] = [
  { key: 'library', label: 'Library' },
  { key: 'presets', label: 'Presets' },
  { key: 'custom', label: 'My Quotes' },
  { key: 'history', label: 'History' },
  { key: 'settings', label: 'Settings' },
]

const CATEGORY_CHIPS: Category[] = ['stoic', 'hustle', 'calm']

let currentTab: Tab = 'library'
let searchQuery = ''
let favoritesOnly = false
const selectedCategories = new Set<Category>()
let formText = ''
let formCategory: Category = 'none'
let formAuthor = ''
let editingId: string | null = null

export function renderPhone(root: HTMLElement, bridge: EvenAppBridge): void {
  root.innerHTML = `
    <header>
      <h1>Hit me!</h1>
      <p class="tagline">Motivational quotes on your G2.</p>
    </header>
    <nav class="tabs" id="tabs"></nav>
    <main class="tab-panels">
      <section id="tab-library" class="panel"></section>
      <section id="tab-presets" class="panel" hidden></section>
      <section id="tab-custom" class="panel" hidden></section>
      <section id="tab-history" class="panel" hidden></section>
      <section id="tab-settings" class="panel" hidden></section>
    </main>
  `
  renderTabs(root, bridge)
  renderLibrary(root)
  renderPresetsTab(root)
  renderCustomTab(root)
  renderHistoryTab(root)
  renderSettings(root, bridge)

  subscribe(() => {
    renderLibraryList(root)
    renderPresetsTab(root)
    renderCustomList(root)
    renderHistoryTab(root)
    renderSettings(root, bridge)
  })
}

function renderTabs(root: HTMLElement, bridge: EvenAppBridge): void {
  const nav = root.querySelector<HTMLElement>('#tabs')!
  nav.innerHTML = TABS
    .map(t => `<button class="tab${t.key === currentTab ? ' is-active' : ''}" data-tab="${t.key}">${t.label}</button>`)
    .join('')
  nav.querySelectorAll<HTMLButtonElement>('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab as Tab
      updateTabVisibility(root)
      renderTabs(root, bridge)
    })
  })
  updateTabVisibility(root)
}

function updateTabVisibility(root: HTMLElement): void {
  for (const t of TABS) {
    const panel = root.querySelector<HTMLElement>(`#tab-${t.key}`)!
    panel.hidden = t.key !== currentTab
  }
}

function filterLibrary(all: Quote[]): Quote[] {
  const q = searchQuery.trim().toLowerCase()
  return all.filter(quote => {
    if (favoritesOnly && !isFavorite(quote.id)) return false
    if (selectedCategories.size > 0 && !selectedCategories.has(quote.category)) return false
    if (q && !quote.text.toLowerCase().includes(q)) return false
    return true
  })
}

function renderLibrary(root: HTMLElement): void {
  const panel = root.querySelector<HTMLElement>('#tab-library')!
  panel.innerHTML = `
    <div class="lib-header">
      <input type="search" class="search" id="lib-search" placeholder="Search quotes..." value="${escapeAttr(searchQuery)}" />
      <button class="primary" id="save-view">Save view as collection</button>
    </div>
    <nav class="filters" id="lib-filters"></nav>
    <section class="quotes" id="lib-quotes"></section>
  `

  const search = panel.querySelector<HTMLInputElement>('#lib-search')!
  search.addEventListener('input', () => {
    searchQuery = search.value
    // Re-render list only; don't disturb focus on the input
    renderLibraryList(root)
  })

  const saveBtn = panel.querySelector<HTMLButtonElement>('#save-view')!
  saveBtn.addEventListener('click', () => {
    const visible = filterLibrary(activeQuotes())
    if (visible.length === 0) {
      window.alert('Nothing in view to save. Adjust filters first.')
      return
    }
    const name = window.prompt(`Save ${visible.length} quote${visible.length === 1 ? '' : 's'} as a collection. Name:`)
    if (name === null) return
    void addCollection(name, visible.map(q => q.id))
  })

  renderLibraryFilters(root)
  renderLibraryList(root)
}

function renderLibraryFilters(root: HTMLElement): void {
  const filters = root.querySelector<HTMLElement>('#lib-filters')
  if (!filters) return
  filters.innerHTML = [
    `<button class="chip${favoritesOnly ? ' is-active' : ''}" data-kind="fav">Favorites</button>`,
    ...CATEGORY_CHIPS.map(c =>
      `<button class="chip${selectedCategories.has(c) ? ' is-active' : ''}" data-kind="cat" data-cat="${c}">${cap(c)}</button>`,
    ),
  ].join('')

  filters.querySelectorAll<HTMLButtonElement>('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.kind === 'fav') {
        favoritesOnly = !favoritesOnly
      } else {
        const cat = btn.dataset.cat as Category
        if (selectedCategories.has(cat)) selectedCategories.delete(cat)
        else selectedCategories.add(cat)
      }
      renderLibraryFilters(root)
      renderLibraryList(root)
    })
  })
}

function renderLibraryList(root: HTMLElement): void {
  const list = root.querySelector<HTMLElement>('#lib-quotes')
  if (!list) return

  const quotes = filterLibrary(activeQuotes())

  if (quotes.length === 0) {
    list.innerHTML = `<p class="empty">No quotes in this view.</p>`
    return
  }

  list.innerHTML = quotes.map(q => {
    const fav = isFavorite(q.id)
    const opted = isOptedOut(q.id)
    return `
      <article class="quote${opted ? ' is-opted-out' : ''}" data-id="${q.id}">
        <p class="text">${escapeHtml(q.text)}</p>
        ${q.author ? `<p class="author">— ${escapeHtml(q.author)}</p>` : ''}
        <footer>
          ${q.category !== 'none' ? `<span class="badge badge-${q.category}">${q.category}</span>` : '<span></span>'}
          <div class="actions">
            <button class="toggle${fav ? ' is-on' : ''}" data-action="fav">${fav ? '★ Good stuff' : '☆ Good stuff'}</button>
            <button class="toggle${opted ? ' is-on' : ''}" data-action="opt">${opted ? "✓ Didn't work" : "× Didn't work"}</button>
          </div>
        </footer>
      </article>
    `
  }).join('')

  list.querySelectorAll<HTMLElement>('.quote').forEach(el => {
    const id = el.dataset.id!
    el.querySelector<HTMLButtonElement>('[data-action="fav"]')!.addEventListener('click', () => {
      void toggleFavorite(id)
    })
    el.querySelector<HTMLButtonElement>('[data-action="opt"]')!.addEventListener('click', () => {
      void toggleOptOut(id)
    })
  })
}

function renderPresetsTab(root: HTMLElement): void {
  const panel = root.querySelector<HTMLElement>('#tab-presets')!
  const builtins = allPresets().map(p => {
    const on = isPresetEnabled(p.id)
    return `
      <article class="preset${on ? ' is-on' : ''}" data-id="${p.id}">
        <div class="preset-main">
          <h3>${escapeHtml(p.name)}</h3>
          <p class="preset-desc">${escapeHtml(p.description)}</p>
          <p class="preset-meta">${p.quotes.length} quote${p.quotes.length === 1 ? '' : 's'}</p>
        </div>
        <label class="switch">
          <input type="checkbox" ${on ? 'checked' : ''} data-id="${p.id}" data-kind="preset" />
          <span class="slider"></span>
        </label>
      </article>
    `
  }).join('')

  const collections = allCollections()
  const collectionsHtml = collections.length === 0
    ? `<p class="hint">No collections yet. Go to Library, filter a view, hit "Save view as collection".</p>`
    : collections.map(c => {
      const on = isPresetEnabled(c.id)
      const resolved = c.quoteIds.filter(id => lookupQuote(id) !== null).length
      return `
        <article class="preset${on ? ' is-on' : ''}" data-id="${c.id}">
          <div class="preset-main">
            <h3>${escapeHtml(c.name)}</h3>
            <p class="preset-meta">${resolved} quote${resolved === 1 ? '' : 's'}</p>
          </div>
          <label class="switch">
            <input type="checkbox" ${on ? 'checked' : ''} data-id="${c.id}" data-kind="preset" />
            <span class="slider"></span>
          </label>
          <button class="toggle danger" data-id="${c.id}" data-kind="delete-collection">Delete</button>
        </article>
      `
    }).join('')

  panel.innerHTML = `
    <p class="hint">Toggle which preset bundles are active. Active bundles feed the quotes that hit you.</p>
    <h2 class="section-title">Built-in presets</h2>
    <div class="presets">${builtins}</div>
    <h2 class="section-title">Your collections</h2>
    <div class="presets">${collectionsHtml}</div>
  `

  panel.querySelectorAll<HTMLInputElement>('input[data-kind="preset"]').forEach(input => {
    input.addEventListener('change', () => {
      void togglePreset(input.dataset.id!)
    })
  })
  panel.querySelectorAll<HTMLButtonElement>('button[data-kind="delete-collection"]').forEach(btn => {
    btn.addEventListener('click', () => {
      void removeCollection(btn.dataset.id!)
    })
  })
}

function renderCustomTab(root: HTMLElement): void {
  const panel = root.querySelector<HTMLElement>('#tab-custom')!
  panel.innerHTML = `
    <form class="custom-form" id="custom-form">
      <textarea name="text" placeholder="Your quote..." maxlength="300" rows="3">${escapeHtml(formText)}</textarea>
      <input name="author" type="text" class="author-input" placeholder="Author (optional)" maxlength="80" value="${escapeAttr(formAuthor)}" />
      <div class="form-row">
        <select name="category">
          <option value="none" ${formCategory === 'none' ? 'selected' : ''}>No category</option>
          <option value="stoic" ${formCategory === 'stoic' ? 'selected' : ''}>Stoic</option>
          <option value="hustle" ${formCategory === 'hustle' ? 'selected' : ''}>Hustle</option>
          <option value="calm" ${formCategory === 'calm' ? 'selected' : ''}>Calm</option>
        </select>
        <button type="submit" class="primary">${editingId ? 'Update' : 'Add quote'}</button>
        ${editingId ? '<button type="button" class="ghost" data-action="cancel">Cancel</button>' : ''}
      </div>
    </form>
    <section class="quotes" id="custom-list"></section>
  `
  wireCustomForm(root)
  renderCustomList(root)
}

function wireCustomForm(root: HTMLElement): void {
  const form = root.querySelector<HTMLFormElement>('#custom-form')!
  const textarea = form.querySelector<HTMLTextAreaElement>('[name="text"]')!
  const select = form.querySelector<HTMLSelectElement>('[name="category"]')!
  const authorInput = form.querySelector<HTMLInputElement>('[name="author"]')!

  textarea.addEventListener('input', () => {
    formText = textarea.value
  })
  select.addEventListener('change', () => {
    formCategory = select.value as Category
  })
  authorInput.addEventListener('input', () => {
    formAuthor = authorInput.value
  })

  form.addEventListener('submit', async e => {
    e.preventDefault()
    const text = formText.trim()
    if (!text) return
    const author = formAuthor.trim() || undefined
    const category = formCategory !== 'none' ? formCategory : undefined
    if (editingId) {
      await updateCustomQuote(editingId, { text, category, author })
    } else {
      await addCustomQuote({ text, category, author })
    }
    resetForm()
    renderCustomTab(root)
  })

  const cancel = form.querySelector<HTMLButtonElement>('[data-action="cancel"]')
  cancel?.addEventListener('click', () => {
    resetForm()
    renderCustomTab(root)
  })
}

function renderCustomList(root: HTMLElement): void {
  const list = root.querySelector<HTMLElement>('#custom-list')
  if (!list) return
  const quotes = customQuotes()

  if (quotes.length === 0) {
    list.innerHTML = `<p class="empty">No custom quotes yet. Add your first above.</p>`
    return
  }

  list.innerHTML = quotes.map(q => `
    <article class="quote" data-id="${q.id}">
      <p class="text">${escapeHtml(q.text)}</p>
      ${q.author ? `<p class="author">— ${escapeHtml(q.author)}</p>` : ''}
      <footer>
        ${q.category !== 'none' ? `<span class="badge badge-${q.category}">${q.category}</span>` : '<span></span>'}
        <div class="actions">
          <button class="toggle" data-action="edit">Edit</button>
          <button class="toggle" data-action="delete">Delete</button>
        </div>
      </footer>
    </article>
  `).join('')

  list.querySelectorAll<HTMLElement>('.quote').forEach(el => {
    const id = el.dataset.id!
    el.querySelector<HTMLButtonElement>('[data-action="edit"]')!.addEventListener('click', () => {
      const q = customQuotes().find(x => x.id === id)
      if (!q) return
      editingId = id
      formText = q.text
      formCategory = q.category ?? 'none'
      formAuthor = q.author ?? ''
      renderCustomTab(root)
    })
    el.querySelector<HTMLButtonElement>('[data-action="delete"]')!.addEventListener('click', () => {
      const wasEditing = editingId === id
      void removeCustomQuote(id)
      if (wasEditing) {
        resetForm()
        renderCustomTab(root)
      }
    })
  })
}

function renderHistoryTab(root: HTMLElement): void {
  const panel = root.querySelector<HTMLElement>('#tab-history')!
  const entries = getHistory()

  if (entries.length === 0) {
    panel.innerHTML = `<p class="empty">No quotes yet. Double-tap your ring to get started.</p>`
    return
  }

  panel.innerHTML = entries.map(e => historyEntryHtml(e)).join('')
}

function historyEntryHtml(e: HistoryEntry): string {
  const calBadge = e.source === 'calendar'
    ? `<span class="badge badge-cal" title="${escapeAttr(e.eventTitle ?? '')}">calendar</span>`
    : e.source === 'voice'
      ? `<span class="badge badge-voice" title="${escapeAttr(e.eventTitle ?? '')}">voice</span>`
      : `<span class="badge badge-random">random</span>`
  const catBadge = e.category !== 'none'
    ? `<span class="badge badge-${e.category}">${e.category}</span>`
    : ''
  const eventLine = (e.source === 'calendar' || e.source === 'voice') && e.eventTitle
    ? `<p class="history-event">${e.source === 'voice' ? 'Voice:' : 'For:'} ${escapeHtml(e.eventTitle)}</p>`
    : ''

  return `
    <article class="history-entry">
      <p class="text">${escapeHtml(e.quoteText)}</p>
      ${e.quoteAuthor ? `<p class="author">— ${escapeHtml(e.quoteAuthor)}</p>` : ''}
      ${eventLine}
      <footer>
        <div class="actions">${calBadge}${catBadge}</div>
        <span class="history-time">${formatTime(e.at)}</span>
      </footer>
    </article>
  `
}

function renderSettings(root: HTMLElement, bridge: EvenAppBridge): void {
  const panel = root.querySelector<HTMLElement>('#tab-settings')!
  const cooldownHours = Math.round(getCooldownMs() / (60 * 60 * 1000) * 10) / 10
  const pauseUntil = getPauseUntil()
  const pauseLabel = !pauseUntil
    ? 'Active'
    : pauseUntil >= Number.MAX_SAFE_INTEGER
      ? 'Paused indefinitely'
      : `Paused until ${formatTime(pauseUntil)}`

  const lastHitLog = getLastHit()
  const lastHitHtml = lastHitLog
    ? `<p class="hint last-hit ${lastHitLog.source !== 'random' ? 'last-hit-cal' : ''}">
        ${lastHitLog.source === 'calendar'
          ? `Last hit: <strong>calendar</strong> — event "${escapeHtml(lastHitLog.eventTitle!)}" → "${escapeHtml(lastHitLog.quoteText.slice(0, 60))}${lastHitLog.quoteText.length > 60 ? '…' : ''}"`
          : lastHitLog.source === 'voice'
            ? `Last hit: <strong>voice</strong> — "${escapeHtml(lastHitLog.eventTitle ?? '')}" → "${escapeHtml(lastHitLog.quoteText.slice(0, 60))}${lastHitLog.quoteText.length > 60 ? '…' : ''}"`
            : `Last hit: <strong>random</strong> — "${escapeHtml(lastHitLog.quoteText.slice(0, 60))}${lastHitLog.quoteText.length > 60 ? '…' : ''}"`
        }
        <span class="last-hit-time">${formatTime(lastHitLog.at.getTime())}</span>
       </p>`
    : ''

  const devMode = isDevMode()

  panel.innerHTML = `
    <h2 class="section-title">Integrations</h2>

    <section class="setting">
      <div class="preset" style="border:none;padding:0;background:none">
        <div class="preset-main">
          <h3 style="margin:0 0 2px">Dev mode</h3>
          <p class="preset-desc">Use fake static calendar instead of your real iCal URL.</p>
        </div>
        <label class="switch">
          <input type="checkbox" id="dev-mode-toggle" ${devMode ? 'checked' : ''} />
          <span class="slider"></span>
        </label>
      </div>
    </section>

    ${devMode ? `
    <section class="setting">
      <h3>Voice Simulator</h3>
      <p class="hint">Simulates "Hey Even, … Hit me" phrases. Voice context is checked before calendar events.</p>
      <div class="form-row wrap" id="voice-presets">
        <button class="toggle" data-phrase="I'm going on a date and I'm a bit nervous. Hit me.">Date night nerves</button>
        <button class="toggle" data-phrase="I'm about to give a big presentation. Hit me.">Public speaking</button>
        <button class="toggle" data-phrase="Just got rejected. Hit me.">Post-rejection</button>
        <button class="toggle" data-phrase="Last set at the gym. Hit me.">Gym last set</button>
        <button class="toggle" data-phrase="Just woke up and need motivation. Hit me.">Morning boost</button>
        <button class="toggle" data-phrase="I'm at a networking event and feeling overwhelmed. Hit me.">Networking overwhelm</button>
        <button class="toggle" data-phrase="Dealing with a really difficult person. Hit me.">Difficult person</button>
        <button class="toggle" data-phrase="Winding down for the night. Hit me.">Bedtime wind-down</button>
      </div>
      <div class="form-row" style="margin-top:10px">
        <input type="text" class="search" id="voice-custom" placeholder="Or type your own context..." style="flex:1" />
        <button class="primary" id="voice-trigger">Trigger</button>
      </div>
    </section>
    ` : ''}

    ${lastHitHtml}

    <section class="setting ${hasApiKey() ? '' : 'setting-warn'}">
      <h3>Claude API ${hasApiKey() ? '✓ connected' : '✗ not configured'}</h3>
      <p class="hint">${hasApiKey()
        ? 'Key loaded from <code>.env.local</code>. Calendar-aware quote selection is active.'
        : 'Add <code>VITE_LLM_API_KEY=sk-ant-…</code> to <code>.env.local</code> and restart the dev server.'
      }</p>
    </section>

    <section class="setting">
      <h3>Google Calendar iCal URL</h3>
      <p class="hint">Paste your calendar's secret iCal address. Find it in Google Calendar → Settings → your calendar → "Secret address in iCal format".</p>
      <input type="text" class="integration-input" id="calendar-url" placeholder="https://calendar.google.com/calendar/ical/..." value="${escapeAttr(getCalendarUrl())}" />
      <div class="form-row" style="margin-top:8px">
        <button class="toggle" id="test-calendar">Test calendar</button>
        <span class="test-result" id="cal-result"></span>
      </div>
    </section>

    <h2 class="section-title">Behaviour</h2>

    <section class="setting">
      <h3>Cooldown</h3>
      <p class="hint">How long before the same quote can hit you again. 0 = no cooldown.</p>
      <div class="form-row">
        <input type="number" id="cooldown-input" min="0" max="168" step="0.5" value="${cooldownHours}" />
        <span class="unit">hours</span>
      </div>
    </section>

    <section class="setting">
      <h3>Pause</h3>
      <p class="hint">Status: <strong>${pauseLabel}</strong></p>
      <div class="form-row wrap">
        <button class="toggle" data-pause="1">Pause 1h</button>
        <button class="toggle" data-pause="4">Pause 4h</button>
        <button class="toggle" data-pause="tomorrow">Until tomorrow</button>
        <button class="toggle" data-pause="forever">Indefinitely</button>
        <button class="toggle" data-pause="resume">Resume</button>
      </div>
      ${isPaused() ? '<p class="hint">Double-taps are ignored until you resume.</p>' : ''}
    </section>

    <section class="setting">
      <h3>Hit me now</h3>
      <p class="hint">Push a new quote to the glasses right now. Bypasses pause.</p>
      <button class="primary" id="hit-now">Hit me now</button>
    </section>
  `

  panel.querySelector<HTMLInputElement>('#dev-mode-toggle')!.addEventListener('change', e => {
    void setDevMode((e.target as HTMLInputElement).checked)
  })

  panel.querySelectorAll<HTMLButtonElement>('#voice-presets [data-phrase]').forEach(btn => {
    btn.addEventListener('click', () => {
      setVoicePhrase(btn.dataset.phrase!)
      void hitMeNow(bridge)
    })
  })

  const voiceCustom = panel.querySelector<HTMLInputElement>('#voice-custom')
  const voiceTrigger = panel.querySelector<HTMLButtonElement>('#voice-trigger')
  if (voiceCustom && voiceTrigger) {
    voiceTrigger.addEventListener('click', () => {
      const phrase = voiceCustom.value.trim()
      if (!phrase) return
      setVoicePhrase(phrase)
      void hitMeNow(bridge)
    })
  }

  const urlInput = panel.querySelector<HTMLInputElement>('#calendar-url')!
  urlInput.addEventListener('blur', () => {
    void setCalendarUrl(urlInput.value)
  })

  const testCalBtn = panel.querySelector<HTMLButtonElement>('#test-calendar')!
  const calResult = panel.querySelector<HTMLElement>('#cal-result')!
  testCalBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim()
    if (!url && !isDevMode()) {
      calResult.textContent = '✗ Enter a URL first (or enable Dev mode)'
      calResult.className = 'test-result test-result-error'
      return
    }
    testCalBtn.disabled = true
    calResult.textContent = 'Checking...'
    calResult.className = 'test-result'
    try {
      const events = await fetchUpcomingEvents(url, undefined, isDevMode())
      calResult.textContent = events.length > 0
        ? `✓ Found ${events.length} event${events.length === 1 ? '' : 's'} in the next 2h`
        : '✓ Connected — no events in the next 2h'
      calResult.className = 'test-result test-result-ok'
    } catch {
      calResult.textContent = '✗ Could not connect (check URL or CORS in browser)'
      calResult.className = 'test-result test-result-error'
    }
    testCalBtn.disabled = false
  })

  const cooldownInput = panel.querySelector<HTMLInputElement>('#cooldown-input')!
  cooldownInput.addEventListener('change', () => {
    const hours = Math.max(0, parseFloat(cooldownInput.value) || 0)
    void setCooldownMs(Math.round(hours * 60 * 60 * 1000))
  })

  panel.querySelectorAll<HTMLButtonElement>('button[data-pause]').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.pause!
      void setPauseUntil(resolvePauseTarget(kind))
    })
  })

  panel.querySelector<HTMLButtonElement>('#hit-now')!.addEventListener('click', () => {
    void hitMeNow(bridge)
  })
}

function resolvePauseTarget(kind: string): number | null {
  const now = Date.now()
  switch (kind) {
    case '1': return now + 60 * 60 * 1000
    case '4': return now + 4 * 60 * 60 * 1000
    case 'tomorrow': {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      d.setHours(6, 0, 0, 0)
      return d.getTime()
    }
    case 'forever': return Number.MAX_SAFE_INTEGER
    case 'resume':
    default:
      return null
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const sameDay = new Date().toDateString() === d.toDateString()
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return sameDay ? time : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`
}

function resetForm(): void {
  editingId = null
  formText = ''
  formCategory = 'none'
  formAuthor = ''
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(s: string): string {
  return escapeHtml(s)
}
