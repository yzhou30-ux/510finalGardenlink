// lib/tileIllustrations.ts
// Maps plant/tile type names to illustration PNG file URLs.
//
// Only keys with actual files in public/illustrations/tiles/ are listed.
// Unrecognised plants fall through to undefined → canvas renders emoji fallback.
//
// To add a new illustration, drop the PNG into public/illustrations/tiles/
// and add the entry here.  The key is matched case-insensitively as a substring
// of the plant name, so "rose" matches "Rose", "miniRose", etc.

const BASE = '/illustrations/tiles'

// ── Available illustrations ────────────────────────────────────────────────────
// Keys are lowercase substrings of a plant name.
// Values are the public URL (served from /public).

// ── Canvas tile illustrations (isometric view with ground base) ──────────────
// Keys are lowercase substrings matched against the plant name.
// Order matters: more-specific keys (e.g. "white rose") must come BEFORE
// their less-specific parent (e.g. "rose") so they win the first-match race.
//
// Filenames with spaces are %-encoded so the browser loads them correctly.
// Unmapped plants (cactus, fern, orchid, …) fall through to undefined → emoji fallback.
const MAP: Record<string, string> = {
  'white rose': `${BASE}/whiteroseground.png`,
  rose:         `${BASE}/roseground.png`,
  pothos:       `${BASE}/Pothosground.png`,
  succulent:    `${BASE}/Succulent1ground.png`,   // Succulent2ground.png available for a second variant
  jasmine:      `${BASE}/jasmine%20ground.png`,
  mint:         `${BASE}/mintground.png`,
  sunflower:    `${BASE}/sunflower%20ground.png`,
  // Add future assets here, e.g.:
  // cactus:    `${BASE}/cactusground.png`,
  // fern:      `${BASE}/fernground.png`,
  // orchid:    `${BASE}/orchidground.png`,
  // basil:     `${BASE}/basilground.png`,
  // lavender:  `${BASE}/lavenderground.png`,
  // tomato:    `${BASE}/tomatoground.png`,
}

// ── Bubble / circular pot illustrations (plant only, no ground base) ─────────
// Used in MyGarden pot circles.  Falls back to MAP variant if no pure asset.
const BUBBLE_MAP: Record<string, string> = {
  rose:      `${BASE}/rosepure.png`,
  jasmine:   `${BASE}/jasminepure.png`,
  mint:      `${BASE}/mintpure.png`,
  sunflower: `${BASE}/sunflowerpure.png`,
  // Succulent pure variant: pure.png exists but filename is ambiguous — add when confirmed
}

// Special tile for the current user's home marker
const ME_URL = `${BASE}/me.png`

// ── Exports ────────────────────────────────────────────────────────────────────

/**
 * Returns the illustration PNG URL for a plant name, or `undefined` if no
 * asset exists yet.  Falls back to emoji rendering in the canvas.
 *
 * @param plantName  e.g. "Rose", "miniRose", "ROSE" — case-insensitive
 */
export function getTileIllustrationUrl(plantName: string): string | undefined {
  const lower = plantName.toLowerCase()
  for (const [key, url] of Object.entries(MAP)) {
    if (lower.includes(key)) return url
  }
  return undefined
}

/**
 * Returns the "me" tile illustration URL.
 * Returns `undefined` if `me.png` has not been added to the assets folder yet.
 */
export function getMeIllustrationUrl(): string | undefined {
  // Flip to `return ME_URL` once public/illustrations/tiles/me.png exists.
  void ME_URL
  return undefined
}

/**
 * Returns the bubble/circle illustration URL for a plant name.
 * Prefers the no-ground "pure" variant (better for circular pots).
 * Falls back to the standard tile illustration, then `undefined`.
 *
 * @param plantName  e.g. "Rose", "miniRose" — case-insensitive
 */
export function getBubbleIllustrationUrl(plantName: string): string | undefined {
  const lower = plantName.toLowerCase()
  for (const [key, url] of Object.entries(BUBBLE_MAP)) {
    if (lower.includes(key)) return url
  }
  // Fall back to standard MAP if no dedicated bubble asset
  return getTileIllustrationUrl(plantName)
}
