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
// Unrecognised plants fall back to generalground.png (see getTileIllustrationUrl).
const MAP: Record<string, string> = {
  'white rose': `${BASE}/whiteroseground.png`,
  rose:         `${BASE}/roseground.png`,
  pothos:       `${BASE}/Pothosground.png`,
  succulent:    `${BASE}/Succulent1ground.png`,   // Succulent2ground.png available as a second variant
  jasmine:      `${BASE}/jasmine%20ground.png`,
  mint:         `${BASE}/mintground.png`,
  sunflower:    `${BASE}/sunflower%20ground.png`,
  cactus:       `${BASE}/cactusground.png`,
  orchid:       `${BASE}/orchidground.png`,
  // Add future assets here, e.g.:
  // fern:      `${BASE}/fernground.png`,
  // basil:     `${BASE}/basilground.png`,
  // lavender:  `${BASE}/lavenderground.png`,
  // tomato:    `${BASE}/tomatoground.png`,
}

// Fallback illustration for plants that don't match any named entry.
// Used when the user hasn't identified their plant or it doesn't fit a category.
const GENERAL_GROUND = `${BASE}/generalground.png`
const GENERAL_PURE   = `${BASE}/general.png`

// ── Bubble / circular pot illustrations (plant only, no ground base) ─────────
// Used in MyGarden pot circles.  Falls back to MAP variant if no pure asset.
const BUBBLE_MAP: Record<string, string> = {
  rose:      `${BASE}/rosepure.png`,
  jasmine:   `${BASE}/jasminepure.png`,
  mint:      `${BASE}/mintpure.png`,
  sunflower: `${BASE}/sunflowerpure.png`,
  cactus:    `${BASE}/cactuspure.png`,
  // Succulent pure variant: pure.png exists but filename is ambiguous — add when confirmed
}

// Special tiles
const ME_URL    = `${BASE}/metiler.png`
const EVENT_URL = `${BASE}/eventpicnictier.png`

// ── Exports ────────────────────────────────────────────────────────────────────

/**
 * Returns the illustration PNG URL for a plant name.
 * Falls back to the generic "general" ground tile for unrecognised plants
 * (e.g. users who haven't identified their plant or use a non-standard name).
 *
 * Pass `allowGeneral = false` only when you explicitly want `undefined`
 * instead of the fallback (e.g. to detect "no specific match" upstream).
 *
 * @param plantName  e.g. "Rose", "miniRose", "ROSE" — case-insensitive
 */
export function getTileIllustrationUrl(
  plantName: string,
  allowGeneral = true,
): string | undefined {
  const lower = plantName.toLowerCase()
  for (const [key, url] of Object.entries(MAP)) {
    if (lower.includes(key)) return url
  }
  return allowGeneral ? GENERAL_GROUND : undefined
}

/** Returns the "me" home-marker tile illustration URL. */
export function getMeIllustrationUrl(): string {
  return ME_URL
}

/** Returns the community-event tile illustration URL. */
export function getEventIllustrationUrl(): string {
  return EVENT_URL
}

/**
 * Returns the bubble/circle illustration URL for a plant name.
 * Prefers the no-ground "pure" variant (better for circular pots).
 * Falls back to the standard tile illustration, then to general.png.
 *
 * @param plantName  e.g. "Rose", "miniRose" — case-insensitive
 */
export function getBubbleIllustrationUrl(plantName: string): string {
  const lower = plantName.toLowerCase()
  for (const [key, url] of Object.entries(BUBBLE_MAP)) {
    if (lower.includes(key)) return url
  }
  // Try the ground-tile MAP next (no dedicated pure asset)
  return getTileIllustrationUrl(plantName, false) ?? GENERAL_PURE
}
