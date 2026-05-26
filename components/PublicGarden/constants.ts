// components/PublicGarden/constants.ts

// Responsive base tile width
export const BASE_RATIO = 0.22
export const BASE_MIN = 70
export const BASE_MAX = 120

// Diamond aspect ratio (width : height)
export const DIAMOND_ASPECT = 0.55

// Spacing
export const GAP_RATIO = 0.5    // GAP = BASE * 0.5
export const SPREAD = 1.8       // coordinate spread multiplier

// Snap
export const SNAP_THRESHOLD = 0.9   // snap radius = BASE * 0.9
export const SNAP_DURATION = 220    // ms

// Wheel
export const WHEEL_DEBOUNCE = 400   // ms
export const WHEEL_SENSITIVITY = 0.8

// Drag
export const MOVE_THRESHOLD = 4     // px before drag is registered

// Alpha decay
export const ALPHA_MIN = 0.2
export const ALPHA_DECAY = 0.1      // per unit distance from origin

// Bottom sheet
export const SHEET_HEIGHT = 290     // px
export const MAP_COMPRESSED_HEIGHT = 310  // px when sheet is open

// Isometric projection factors (x-axis, y-axis scaling)
export const ISO_X_FACTOR = 0.5
export const ISO_Y_FACTOR = 0.6

// Illustration anchor: diamond center is placed at this fraction down the image height
export const ILLUSTRATION_ANCHOR = 0.65
