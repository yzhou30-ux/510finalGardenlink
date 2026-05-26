// components/MyGarden/types.ts

export interface PlantPot {
  id: string
  name: string
  emoji: string               // placeholder — will be replaced by illustration
  daysSinceStart: number      // days since first record / created
  recordedToday: boolean      // whether the user has logged today
  isArchived?: boolean
}

export interface MyGardenProps {
  pots: PlantPot[]
  onPotTap: (pot: PlantPot) => void      // short press → go to timeline
  onAddPot: () => void                   // tap the + button
  onEditPot: (pot: PlantPot) => void     // edit pot info
  onRenamePot: (pot: PlantPot) => void   // rename pot
  onArchivePot: (pot: PlantPot) => void  // archive (hide, not delete)
}
