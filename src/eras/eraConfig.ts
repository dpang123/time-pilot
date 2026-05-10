/**
 * Per-era game configuration. Each era has its own enemy roster, mothership,
 * sky palette, and difficulty parameters. Eras advance in order; after the
 * fifth era the game loops back to era 1 with stronger difficulty.
 */

export interface EraConfig {
  /** Display label, e.g. "1910". */
  label: string;
  /** Texture key of the standard enemy aircraft (8-frame sheet). */
  enemyKey: string;
  /** Texture key of the mothership (static sprite). */
  motherKey: string;
  /** Sky background colour (top of the sky). */
  skyColor: number;
  /** Cloud tint multiplier applied via Phaser setTint (use 0xffffff for plain white). */
  cloudTint: number;
  /** Number of standard kills required before the mothership appears. */
  killsForMother: number;
  /** Standard enemy linear speed (px/sec). */
  enemySpeed: number;
  /** Mean enemy spawn interval (ms). */
  spawnIntervalMs: number;
  /** Mothership hit points. */
  motherHp: number;
  /** Mothership cruise speed (px/sec). */
  motherSpeed: number;
}

export const ERAS: EraConfig[] = [
  {
    label: '1910',
    enemyKey: 'enemy1910',
    motherKey: 'mother1910',
    skyColor: 0xc7d8e6, // hazy pale sky
    cloudTint: 0xffffff,
    killsForMother: 12,
    enemySpeed: 45,
    spawnIntervalMs: 1500,
    motherHp: 6,
    motherSpeed: 26,
  },
  {
    label: '1940',
    enemyKey: 'enemy1940',
    motherKey: 'mother1940',
    skyColor: 0x3399cc, // bright blue sky
    cloudTint: 0xffffff,
    killsForMother: 16,
    enemySpeed: 60,
    spawnIntervalMs: 1300,
    motherHp: 8,
    motherSpeed: 32,
  },
  {
    label: '1970',
    enemyKey: 'enemy1970',
    motherKey: 'mother1970',
    skyColor: 0x6da66d, // jungle green
    cloudTint: 0xe6f0e6,
    killsForMother: 20,
    enemySpeed: 70,
    spawnIntervalMs: 1100,
    motherHp: 10,
    motherSpeed: 36,
  },
  {
    label: '1982',
    enemyKey: 'enemy1982',
    motherKey: 'mother1982',
    skyColor: 0x4466aa, // deep cold blue
    cloudTint: 0xddddee,
    killsForMother: 24,
    enemySpeed: 90,
    spawnIntervalMs: 950,
    motherHp: 12,
    motherSpeed: 42,
  },
  {
    label: '2001',
    enemyKey: 'enemy2001',
    motherKey: 'mother2001',
    skyColor: 0x000022, // night/space
    cloudTint: 0x6677aa,
    killsForMother: 28,
    enemySpeed: 105,
    spawnIntervalMs: 850,
    motherHp: 16,
    motherSpeed: 48,
  },
];

/** Apply a per-loop difficulty multiplier so the second loop is harder. */
export function eraForLoop(index: number, loop: number): EraConfig {
  const base = ERAS[index];
  if (loop === 0) return base;
  const factor = 1 + Math.min(loop, 3) * 0.18;
  return {
    ...base,
    enemySpeed: Math.round(base.enemySpeed * factor),
    spawnIntervalMs: Math.max(450, Math.round(base.spawnIntervalMs / factor)),
    motherHp: Math.round(base.motherHp * factor),
    motherSpeed: Math.round(base.motherSpeed * factor),
  };
}
