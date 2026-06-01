// lib/store.ts — Zustand global store
// Lightweight client-side state for values that need to be shared between
// components without a prop-drill or a server round-trip.
//
// Currently tracks:
//   city  — the user's selected city, kept in sync with profiles.city after
//            a save so the community garden layout can read it immediately.
import { create } from 'zustand'

interface GardenStore {
  /**
   * User's city displayName (e.g. "San Francisco, CA").
   * Empty string means "not set".
   * Initialised to '' — server components read city directly from the DB;
   * this store is updated after the user saves a new city in Settings.
   */
  city: string

  /** Update city after a successful DB write. */
  setCity: (city: string) => void

  /**
   * ID of the last pot the user was viewing on the Timeline.
   * Empty string means "not set" (user hasn't visited Timeline yet this session).
   * Written by TimelineClientPage on every pot selection so FloatingTabBar can
   * pre-select the same pot when navigating to the camera page.
   */
  lastViewedPotId: string

  /** Called by TimelineClientPage whenever the active pot changes. */
  setLastViewedPotId: (potId: string) => void
}

export const useGardenStore = create<GardenStore>((set) => ({
  city: '',
  setCity: (city) => set({ city }),
  lastViewedPotId: '',
  setLastViewedPotId: (potId) => set({ lastViewedPotId: potId }),
}))
