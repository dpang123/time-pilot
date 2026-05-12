export type GraphicsMode = 'classic' | 'modern';

const GRAPHICS_KEY = 'timepilot.graphicsMode';

export function getGraphicsMode(): GraphicsMode {
  try {
    const saved = localStorage.getItem(GRAPHICS_KEY);
    if (saved === 'classic' || saved === 'modern') return saved;
  } catch {
    // ignore storage errors
  }
  return 'modern';
}

export function setGraphicsMode(mode: GraphicsMode): void {
  try {
    localStorage.setItem(GRAPHICS_KEY, mode);
  } catch {
    // ignore storage errors
  }
}
