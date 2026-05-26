// components/AddPot/types.ts

export interface SpeciesSuggestion {
  name: string
  emoji: string
}

export interface NewPotData {
  photoFile: File | null
  photoPreviewUrl: string | null
  name: string
  species: string   // optional — empty string when not provided
  startDate: string // "YYYY-MM-DD"
  emoji: string     // emoji avatar, derived from species suggestion or name
}

export type AddPotStep = 'photo' | 'info' | 'confirm' | 'success'

export interface AddPotFlowProps {
  open: boolean
  onClose: () => void
  /** Called after the pot is successfully created; triggers parent data refresh. */
  onComplete: (newPotId: string, potName: string) => void
}
