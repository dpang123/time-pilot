export type GraphicsMode = 'classic' | 'modern';

const MODERN_UNLOCK_KEY = 'timepilot.modernUnlocked';

export function getGraphicsMode(): GraphicsMode {
  try {
    const unlocked = sessionStorage.getItem(MODERN_UNLOCK_KEY);
    if (unlocked === '1') return 'modern';
  } catch {
    // ignore storage errors
  }
  return 'classic';
}

export function setGraphicsMode(mode: GraphicsMode): void {
  try {
    if (mode === 'modern') {
      sessionStorage.setItem(MODERN_UNLOCK_KEY, '1');
    } else {
      sessionStorage.removeItem(MODERN_UNLOCK_KEY);
    }
  } catch {
    // ignore storage errors
  }
}
