/**
 * Screen-orientation configuration. The game can run in two aspect ratios:
 *   - portrait  (224 x 320) — taller playfield, faithful to upright arcade cabinets
 *   - landscape (320 x 224) — wider playfield, fits desktop monitors and TVs
 *
 * The choice is persisted in localStorage so the page reload that's required
 * to re-init Phaser at a different internal resolution is one-shot.
 *
 * Touch controls (virtual joystick + fire button) have a separate setting:
 *   - 'auto' shows them whenever the device reports touch support
 *   - 'on'   forces them on (useful for testing on a desktop)
 *   - 'off'  hides them entirely
 */

export type ScreenMode = 'portrait' | 'landscape';
export type TouchMode = 'auto' | 'on' | 'off';

const MODE_KEY = 'timepilot.screenMode';
const TOUCH_KEY = 'timepilot.touchMode';

export interface ScreenSize {
  width: number;
  height: number;
}

export const PORTRAIT: ScreenSize = { width: 224, height: 320 };
export const LANDSCAPE: ScreenSize = { width: 320, height: 224 };

/** Auto-detect a sensible default for first-time visitors. */
function defaultMode(): ScreenMode {
  if (typeof window === 'undefined') return 'landscape';
  // Touch devices or narrow windows → portrait by default.
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isNarrow = window.innerWidth < window.innerHeight;
  return isTouch || isNarrow ? 'portrait' : 'landscape';
}

export function getScreenMode(): ScreenMode {
  try {
    const saved = localStorage.getItem(MODE_KEY);
    if (saved === 'portrait' || saved === 'landscape') return saved;
  } catch {
    // localStorage may be unavailable (private mode etc.) — fall through.
  }
  return defaultMode();
}

export function setScreenMode(mode: ScreenMode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Ignore storage errors; mode just won't persist.
  }
}

export function getScreenSize(): ScreenSize {
  return getScreenMode() === 'portrait' ? PORTRAIT : LANDSCAPE;
}

// ---- Touch controls ----

function isTouchCapable(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function getTouchMode(): TouchMode {
  try {
    const saved = localStorage.getItem(TOUCH_KEY);
    if (saved === 'auto' || saved === 'on' || saved === 'off') return saved;
  } catch {
    // ignore
  }
  return 'auto';
}

export function setTouchMode(mode: TouchMode): void {
  try {
    localStorage.setItem(TOUCH_KEY, mode);
  } catch {
    // ignore
  }
}

/** Resolve whether the on-screen joystick + fire button should be shown. */
export function shouldShowTouchControls(): boolean {
  const mode = getTouchMode();
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  return isTouchCapable();
}
