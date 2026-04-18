import type { Quote } from './quotes'
import { ESSENTIALS_50 } from './quotes'

export interface QuotePreset {
  id: string
  name: string
  description: string
  quotes: Quote[]
}

const MINIMAL_2: Quote[] = [
  { id: 'm01', category: 'hustle', text: 'Start. Figure it out on the way.' },
  { id: 'm02', category: 'calm', text: 'This moment is all there is.' },
]

export const PRESETS: QuotePreset[] = [
  {
    id: 'essentials',
    name: 'Essentials 50',
    description: 'Fifty core quotes across stoic, hustle, and calm.',
    quotes: ESSENTIALS_50,
  },
  {
    id: 'minimal',
    name: 'Minimal 2',
    description: "Two quotes. That's the whole preset.",
    quotes: MINIMAL_2,
  },
]
