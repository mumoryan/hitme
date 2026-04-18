import Anthropic from '@anthropic-ai/sdk'
import type { Quote } from './quotes'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined

export function hasApiKey(): boolean {
  return !!API_KEY
}

function client(): Anthropic {
  return new Anthropic({ apiKey: API_KEY!, dangerouslyAllowBrowser: true })
}

export async function pickQuoteByContext(
  context: string,
  quotes: Quote[],
): Promise<Quote | null> {
  if (quotes.length === 0 || !API_KEY) return null

  const c = client()

  const quoteList = quotes
    .map(q => `${q.id}: ${q.text}`)
    .join('\n')

  const response = await c.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 32,
    messages: [
      {
        role: 'user',
        content: `Context: "${context}"

Pick the single most motivating/relevant quote ID for someone in this situation. Return only the ID, nothing else.

Quotes:
${quoteList}`,
      },
    ],
  })

  const rawId = response.content[0]?.type === 'text'
    ? response.content[0].text.trim()
    : null

  if (!rawId) return null
  return quotes.find(q => q.id === rawId) ?? null
}
