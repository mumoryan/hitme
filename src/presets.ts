import type { Quote } from './quotes'
import { ESSENTIALS } from './quotes'

export interface QuotePreset {
  id: string
  name: string
  description: string
  quotes: Quote[]
}

const MINIMAL_2: Quote[] = [
  { id: 'min01', category: 'hustle', text: 'Start. Figure it out on the way.' },
  { id: 'min02', category: 'calm', text: 'This moment is all there is.' },
]

export const PRESETS: QuotePreset[] = [
  {
    id: 'essentials',
    name: 'Essentials',
    description: 'Core quotes across stoic, hustle, calm, and situational scenarios.',
    quotes: ESSENTIALS,
  },
  {
    id: 'minimal',
    name: 'Minimal 2',
    description: "Two quotes. That's the whole preset.",
    quotes: MINIMAL_2,
  },
]
