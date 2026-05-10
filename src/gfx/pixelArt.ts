import Phaser from 'phaser';

/**
 * Pixel-art sprite system. Each sprite is defined as a small string-grid
 * with one character per pixel. Characters map to a palette of CSS colors;
 * '.' and ' ' are transparent.
 *
 * Sprites are painted onto a HTMLCanvasElement and registered with the
 * Phaser texture manager. For aircraft we pre-render 8 rotated copies and
 * pack them as a spritesheet — the arcade trick that keeps pixel art crisp
 * at every facing direction (much better than letting the GPU rotate it).
 */

export type Palette = Record<string, string>;

export interface PixelSpriteDef {
  /** Each string is one row; each character is one pixel. */
  rows: string[];
  /** Character → CSS colour. Use '.' or ' ' for transparent. */
  palette: Palette;
}

const TRANSPARENT = new Set(['.', ' ']);

/**
 * Normalise a sprite definition: pad shorter rows with '.' (transparent) so
 * every row matches the longest row's width. This means hand-authored sprites
 * can be slightly sloppy on trailing whitespace without breaking the canvas.
 */
function normalise(def: PixelSpriteDef): { rows: string[]; w: number; h: number } {
  const w = def.rows.reduce((m, r) => Math.max(m, r.length), 0);
  const rows = def.rows.map((r) => (r.length >= w ? r.slice(0, w) : r + '.'.repeat(w - r.length)));
  return { rows, w, h: rows.length };
}

function paintSprite(
  ctx: CanvasRenderingContext2D,
  def: PixelSpriteDef,
  ox: number,
  oy: number,
): void {
  const { rows } = normalise(def);
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (TRANSPARENT.has(c)) continue;
      const color = def.palette[c];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

/** Add a single pixel-art sprite to the texture manager. */
export function addPixelTexture(
  scene: Phaser.Scene,
  key: string,
  def: PixelSpriteDef,
): void {
  const { w, h } = normalise(def);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  paintSprite(ctx, def, 0, 0);
  // Remove any prior texture under this key (hot-reload safety).
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

/**
 * Pre-render 8 rotated copies of a top-down sprite (facing UP at frame 0,
 * rotating clockwise: 0=up, 1=up-right, 2=right, 3=down-right, ...).
 * The result is registered as a spritesheet under the given key with frames
 * 0..7 indexed by angle.
 *
 * The source sprite is drawn at full size, the canvas is sized to the
 * diagonal so rotated copies don't clip, and the result is packed as a
 * horizontal strip.
 */
export function addPixelAircraftSheet(
  scene: Phaser.Scene,
  key: string,
  def: PixelSpriteDef,
): void {
  const norm = normalise(def);
  const srcW = norm.w;
  const srcH = norm.h;
  // Per-frame size: large enough to hold the source rotated 45°, with a 1px pad.
  const frameSize = Math.ceil(Math.SQRT2 * Math.max(srcW, srcH)) + 2;

  // First, paint the source onto its own canvas.
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.imageSmoothingEnabled = false;
  paintSprite(srcCtx, def, 0, 0);

  // Then, build the 8-frame strip by rotating + nearest-neighbour sampling.
  const sheet = document.createElement('canvas');
  sheet.width = frameSize * 8;
  sheet.height = frameSize;
  const sheetCtx = sheet.getContext('2d')!;
  sheetCtx.imageSmoothingEnabled = false;

  const srcImg = srcCtx.getImageData(0, 0, srcW, srcH);

  for (let i = 0; i < 8; i++) {
    // Frame i represents heading clockwise from UP.
    const angle = (i * Math.PI) / 4;
    const cx = frameSize / 2;
    const cy = frameSize / 2;
    const cos = Math.cos(-angle);
    const sin = Math.sin(-angle);

    // For each destination pixel, inverse-rotate to source coordinates and
    // copy if opaque. This is per-pixel nearest-neighbour rotation, which
    // gives the crisp pre-rendered look used by arcade games.
    for (let dy = 0; dy < frameSize; dy++) {
      for (let dx = 0; dx < frameSize; dx++) {
        const ux = dx - cx;
        const uy = dy - cy;
        const sx = Math.floor(cos * ux - sin * uy + srcW / 2);
        const sy = Math.floor(sin * ux + cos * uy + srcH / 2);
        if (sx < 0 || sx >= srcW || sy < 0 || sy >= srcH) continue;
        const idx = (sy * srcW + sx) * 4;
        const a = srcImg.data[idx + 3];
        if (a === 0) continue;
        const r = srcImg.data[idx];
        const g = srcImg.data[idx + 1];
        const b = srcImg.data[idx + 2];
        sheetCtx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
        sheetCtx.fillRect(i * frameSize + dx, dy, 1, 1);
      }
    }
  }

  if (scene.textures.exists(key)) scene.textures.remove(key);
  // Phaser's TS signature only lists HTMLImageElement, but the runtime accepts
  // any CanvasImageSource (including HTMLCanvasElement) — that's how its own
  // generateTexture path works internally.
  scene.textures.addSpriteSheet(key, sheet as unknown as HTMLImageElement, {
    frameWidth: frameSize,
    frameHeight: frameSize,
  });
}

/**
 * Convert a heading angle (radians, 0 = right, like Math.cos/sin space) into
 * a frame index 0..7 where 0 = UP, 1 = UP-RIGHT, …, 7 = UP-LEFT.
 */
export function angleToFrame(angleRad: number): number {
  // Normalize so 0 == up, increasing clockwise.
  // angle 0 = right, but UP frame should be index 0 → so up is angle = -PI/2.
  const a = angleRad + Math.PI / 2; // rotate so up=0
  const norm = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return Math.round(norm / (Math.PI / 4)) % 8;
}
