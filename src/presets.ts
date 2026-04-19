import type { Quote } from './quotes'
import { ESSENTIALS, MINIMAL_2, CUSTOM_1} from './quotes'

export interface QuotePreset {
  id: string
  name: string
  description: string
  quotes: Quote[]
}

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
  {
    id: 'custom1',
    name: 'Custom 1',
    description: "YOU DON\'T NEED OTHER QUOTES, EVER",
    quotes: CUSTOM_1,
  }
]
