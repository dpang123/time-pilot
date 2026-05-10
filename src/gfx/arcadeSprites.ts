import Phaser from 'phaser';
import {
  PixelSpriteDef,
  addPixelTexture,
  addPixelAircraftSheet,
} from './pixelArt';

/**
 * Hand-authored pixel-art sprite definitions. All aircraft are drawn from a
 * top-down view facing UP — the addPixelAircraftSheet helper pre-renders 8
 * rotated copies for crisp display at every heading.
 *
 * Palette legend used across sprites:
 *   .   transparent
 *   K   black outline
 *   W   bright white
 *   S   silver / light grey body
 *   D   dark grey shadow
 *   B   cockpit blue
 *   R   red accent / muzzle flash
 *   Y   yellow / engine glow
 *   O   orange explosion
 *   G   green (1940 enemy livery)
 *   g   dark green
 *   M   military grey-green
 *   C   cloud white
 *   c   cloud shadow
 */

// 16x16 player jet — silver fighter facing UP, centred. Inspired by the
// Time Pilot arcade player ship: triangular nose, swept wings, twin tails,
// bright cockpit dot.
export const PLAYER_JET: PixelSpriteDef = {
  palette: {
    K: '#000000',
    W: '#ffffff',
    S: '#cdd2da',
    D: '#5d6573',
    B: '#22b6ff',
    Y: '#ffd23f',
    R: '#ff3b3b',
  },
  rows: [
    '.......KK.......',
    '.......WW.......',
    '......KSSK......',
    '......KSSK......',
    '......KBBK......',
    '.....KSWWSK.....',
    '.....KSWWSK.....',
    'KK..KKSSSSKK..KK',
    'KSKKSSSSSSSSKKSK',
    'KSSSSSSDDSSSSSSK',
    'KKSSSDDDDDDSSSKK',
    '.KKSSDDYYDDSSKK.',
    '..KKSDDYYDDSKK..',
    '...KKDDRRDDKK...',
    '....KKKKKKKK....',
    '......KKKK......',
  ],
};

// 14x14 1940-era enemy fighter — green Zero-style monoplane with a yellow
// nose cowl and red tail flash. Drawn facing UP.
export const ENEMY_1940: PixelSpriteDef = {
  palette: {
    K: '#000000',
    G: '#3aa84a',
    g: '#1f6a2a',
    Y: '#ffd23f',
    W: '#ffffff',
    R: '#cf2424',
  },
  rows: [
    '......KK......',
    '......YY......',
    '.....KYYK.....',
    '.....KGGK.....',
    '.....KGGK.....',
    '.....KGGK.....',
    'KKKKKKGGKKKKKK',
    'KGGGGGGGGGGGGK',
    'KGGGGGgggGGGGK',
    'KKKKKGgggKKKKK',
    '....KKgggKK...',
    '......KGGK....',
    '.....KKRRKK...',
    '......KRRK....',
  ],
};

// 14x14 1910-era biplane — wood-and-canvas with double wings and roundel.
export const ENEMY_1910: PixelSpriteDef = {
  palette: {
    K: '#000000',
    T: '#a4733a', // tan canvas
    t: '#6e4a22', // shadow
    R: '#cf2424',
    W: '#ffffff',
    B: '#1f5fb0', // roundel blue
  },
  rows: [
    '......KK......',
    '......TT......',
    '.....KTTK.....',
    'KKKKKKTTKKKKKK',
    'KTTTTTTTTTTTTK',
    'KTTTBWBTTBWBTK',
    'KKKKKtttKKKKKK',
    '.....KtttK....',
    'KKKKKKtttKKKKK',
    'KTTTTTtttTTTTK',
    'KTTtttTTtttTTK',
    'KKKKKKtttKKKKK',
    '......KRRK....',
    '.......KK.....',
  ],
};

// 14x14 1970-era helicopter — Huey-style, top-down with rotor disk.
export const ENEMY_1970: PixelSpriteDef = {
  palette: {
    K: '#000000',
    M: '#3a7a4a', // olive drab
    m: '#1d4524',
    W: '#ffffff', // rotor blur
    Y: '#ffea00',
    R: '#cf2424',
  },
  rows: [
    'WWWWWWWWWWWWWW',
    '.WWWWWWWWWWWW.',
    '..KKKKKKKKKK..',
    '..KMMMmmMMMK..',
    '..KMmYYYYmMK..',
    '..KMmYWWYmMK..',
    '..KMmYWWYmMK..',
    '..KMmYYYYmMK..',
    '..KMMMmmMMMK..',
    '...KKKMMKKK...',
    '....KKMMKK....',
    '.....KMMK.....',
    '.....KMMK.....',
    '....KKKKKK....',
  ],
};

// 14x14 1982-era jet fighter — F-14 style with twin tails and missile.
export const ENEMY_1982: PixelSpriteDef = {
  palette: {
    K: '#000000',
    S: '#9aa0a8', // gunmetal
    s: '#5a606a',
    B: '#22b6ff',
    Y: '#ffea00',
    R: '#ff3b3b',
  },
  rows: [
    '......KK......',
    '.....KSSK.....',
    '.....KBBK.....',
    '.....KSSK.....',
    '....KSSSSK....',
    'KKKKSSssSSKKKK',
    'KSSSSsKKsSSSSK',
    'KsssssKKsssssK',
    'KKKKsKssKsKKKK',
    '...KsKssKsK...',
    '...KsKssKsK...',
    '...KsKYYKsK...',
    '...KKKYYKKK...',
    '....KKRRKK....',
  ],
};

// 14x14 2001-era UFO — chrome saucer with cyan dome and glowing underside.
export const ENEMY_2001: PixelSpriteDef = {
  palette: {
    K: '#000000',
    C: '#22e6ff', // cyan dome
    c: '#0a8aa6',
    S: '#cdd2da', // chrome
    s: '#5a606a',
    Y: '#ffea00',
    R: '#ff3b3b',
  },
  rows: [
    '..............',
    '......KK......',
    '.....KCCK.....',
    '....KCCCCK....',
    '...KCccccCK...',
    '..KSSSSSSSSK..',
    '.KSSSSSSSSSSK.',
    'KSsssssssssSK',
    'KKsKsKsKsKsKK.',
    '.KYRYRYRYRYRK.',
    '..KKKKKKKKKK..',
    '...K......K...',
    '..............',
    '..............',
  ],
};

// ---------- Motherships ----------
// All motherships are large multi-coloured ships drawn facing UP. They are
// rendered without rotation (they cruise across the screen) so a single
// static texture is enough.

// 1910 mothership — zeppelin/dirigible, 36x18.
export const MOTHER_1910: PixelSpriteDef = {
  palette: {
    K: '#000000',
    T: '#a4733a',
    t: '#6e4a22',
    W: '#ffffff',
    R: '#cf2424',
    Y: '#ffd23f',
  },
  rows: [
    '......KKKKKKKKKKKKKKKKKKKKKK......',
    '....KKTTTTTTTTTTTTTTTTTTTTTTTTKK..',
    '..KKTTTTTTTTTTTTTTTTTTTTTTTTTTTTKK',
    '.KTTTTTTTtttttttttttttttttttTTTTTK',
    'KTTTTttttttttttttttttttttttttttTTK',
    'KTTttttRRRRRRRRRRRRRRRRRRRRttttTTK',
    'KTTttttRWWWRWWWRWWWRWWWRWWWttttTTK',
    'KTTttttRRRRRRRRRRRRRRRRRRRRttttTTK',
    'KTTttttttttttttttttttttttttttttTTK',
    'KTTTttttttttttttttttttttttttttTTTK',
    '.KTTTTttttttttttttttttttttttTTTTK.',
    '..KKTTTTTTTTTTTTTTTTTTTTTTTTTTKK..',
    '....KKTTTTTTTTTTTTTTTTTTTTTTKK....',
    '......KKKKKKKKKKKKKKKKKKKKKK......',
    '..........KK......KK......KK......',
    '..........KYK....KYK....KYK.......',
    '..........KK......KK......KK......',
    '..................................',
  ],
};

// 1940 mothership — B-29-style bomber, 36x20.
export const MOTHER_1940: PixelSpriteDef = {
  palette: {
    K: '#000000',
    S: '#cdd2da',
    s: '#7a808a',
    B: '#22b6ff',
    Y: '#ffd23f',
    R: '#cf2424',
  },
  rows: [
    '................KKKK..............',
    '...............KSSSSK.............',
    '...............KSBBSK.............',
    '...............KSSSSK.............',
    '..............KSSssSSK............',
    '............KKSSssssSSKK..........',
    'KKKKKKKKKKKKSSSssssssSSSKKKKKKKKKKK',
    'KSSSSSSSSSSSssssssssssssSSSSSSSSSSK',
    'KSssssssssssssssssssssssssssssssSSK',
    'KSsYsYsYsYsYsYsssssssYsYsYsYsYsYsSK',
    'KKKKKKKKKKsssssssssssssKKKKKKKKKKKK',
    '..........KsKKKKKKKKKsK...........',
    '..........KsK......KsK............',
    '..........KsK......KsK............',
    '..........KKK......KKK............',
    '..............KKKK................',
    '............KKSSSSKK..............',
    '............KSRRRRSK..............',
    '............KKSSSSKK..............',
    '..............KKKK................',
  ],
};

// 1970 mothership — heavy gunship/transport, 36x18.
export const MOTHER_1970: PixelSpriteDef = {
  palette: {
    K: '#000000',
    M: '#3a7a4a',
    m: '#1d4524',
    Y: '#ffea00',
    R: '#cf2424',
    W: '#ffffff',
  },
  rows: [
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    '.WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW.',
    '..KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK..',
    '..KMMMMMMMMMmmmmmmmmMMMMMMMMMMMK..',
    '..KMMmYYmMMMmYYYYYYmMMMmYYmMMMMK..',
    '..KMMmWWmMMMmWWWWWWmMMMmWWmMMMMK..',
    '..KMMmYYmMMMmWWWWWWmMMMmYYmMMMMK..',
    '..KMMMMMMMMMmmmmmmmmMMMMMMMMMMMK..',
    '..KKKKKKKKKKKMmmmmmMKKKKKKKKKKKK..',
    '...KMMMMMKKKKMRRRRMKKKKKKMMMMMMK..',
    '...KMmmmMK....KKKKK....KMmmmmMK...',
    '...KMmmmMK.............KMmmmmMK...',
    '...KKKKKKK.............KKKKKKKK...',
    '......KKK.................KKK.....',
    '..................................',
    '..................................',
    '..................................',
    '..................................',
  ],
};

// 1982 mothership — wide-body jumbo jet, 36x18.
export const MOTHER_1982: PixelSpriteDef = {
  palette: {
    K: '#000000',
    S: '#cdd2da',
    s: '#7a808a',
    B: '#22b6ff',
    R: '#cf2424',
    Y: '#ffea00',
  },
  rows: [
    '................KKKK..............',
    '...............KSSSSK.............',
    '...............KSBBSK.............',
    '...............KSSSSK.............',
    '..............KSSSSSSK............',
    '..............KSsssssK............',
    'KKKKKKKKKKKKKKKSsssssSKKKKKKKKKKKKK',
    'KSSSSSSSSSSSSSSssssssSSSSSSSSSSSSSK',
    'KSssssssssssssssssssssssssssssssSK.',
    'KKKKKKKKsKKKKKKKKKKKKKKKsKKKKKKKKKK',
    '........KsK............KsK........',
    '........KsK............KsK........',
    '........KKK............KKK........',
    '..............KKKKKKKK............',
    '...........KKSSSSSSSSSSKK.........',
    '...........KSRRRRRRRRRRSK.........',
    '...........KKSSSSSSSSSSKK.........',
    '..............KKKKKKKK............',
  ],
};

// 2001 mothership — alien saucer, 36x18, glowing centre.
export const MOTHER_2001: PixelSpriteDef = {
  palette: {
    K: '#000000',
    C: '#22e6ff',
    c: '#0a8aa6',
    S: '#cdd2da',
    s: '#5a606a',
    Y: '#ffea00',
    R: '#ff3b3b',
    W: '#ffffff',
  },
  rows: [
    '..............KKKKKKKK............',
    '............KKCCCCCCCCKK..........',
    '..........KKCCCCCCCCCCCCKK........',
    '........KKCCCCCWWCWWCCCCCCKK......',
    '......KKSSSSSCCCCCCCCCCCCSSSSKK...',
    '....KKSSSSSSSSSSSSSSSSSSSSSSSSSKKK',
    '..KKSSSSSSSSSSSSSSSSSSSSSSSSSSSSSK',
    'KKSssssssssssssssssssssssssssssssK',
    'KSsKsKsKsKsKsKsKsKsKsKsKsKsKsKsKsK',
    'KSYRYRYRYRYRYRYRYRYRYRYRYRYRYRYRYK',
    'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK',
    '...KKKKKKKKKKKKKKKKKKKKKKKKKKKK...',
    '......KKKKKKKKKKKKKKKKKKKKKK......',
    '...........KKKKKKKKKKKKKK.........',
    '..................................',
    '..................................',
    '..................................',
    '..................................',
  ],
};

// 4x4 player bullet — bright yellow with white core.
export const BULLET_PLAYER: PixelSpriteDef = {
  palette: { W: '#ffffff', Y: '#ffea00' },
  rows: ['.YY.', 'YWWY', 'YWWY', '.YY.'],
};

// 4x4 enemy bullet — red.
export const BULLET_ENEMY: PixelSpriteDef = {
  palette: { R: '#ff3b3b', W: '#ffe1e1' },
  rows: ['.RR.', 'RWWR', 'RWWR', '.RR.'],
};

// 18x10 fluffy cloud — white with pale blue shadow underside.
export const CLOUD: PixelSpriteDef = {
  palette: { C: '#ffffff', c: '#bcd9ec' },
  rows: [
    '....CCCC..CCCC....',
    '..CCCCCCCCCCCCCC..',
    '.CCCCCCCCCCCCCCCC.',
    'CCCCCCCCCCCCCCCCCC',
    'CCCCCCCCCCCCCCCCCC',
    'CCcccCCCCCCCCcccCC',
    '.CcccccccccccccCC.',
    '..CccccccccccccC..',
    '....CcccccccCC....',
    '......CCCCCC......',
  ],
};

// 8x10 parachuting pilot — green chute, lines, tan body.
export const PILOT: PixelSpriteDef = {
  palette: { K: '#000000', G: '#3aa84a', g: '#1f6a2a', T: '#e6b97a', W: '#ffffff' },
  rows: [
    '..GGGG..',
    '.GGGGGG.',
    'GGGGGGGG',
    'gggggggg',
    '.K.WW.K.',
    '..KWWK..',
    '...TT...',
    '...TT...',
    '..T..T..',
    '..K..K..',
  ],
};

// 16x16 explosion frames (4) — classic yellow→orange→red→smoke bloom.
export const EXPLOSION_FRAMES: PixelSpriteDef[] = [
  {
    palette: { Y: '#ffea00', W: '#ffffff' },
    rows: [
      '................',
      '................',
      '................',
      '......YY........',
      '.....YYYY.......',
      '.....YWWY.......',
      '.....YYYY.......',
      '......YY........',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  {
    palette: { Y: '#ffea00', O: '#ff8a1f', W: '#ffffff' },
    rows: [
      '................',
      '................',
      '....OO..OO......',
      '...OYYYYYYO.....',
      '..OYYYYYYYY.....',
      '..YYYWWWYYY.....',
      '..YYWWWWWYY.....',
      '..YYYWWWYYO.....',
      '..OYYYYYYYO.....',
      '...OYYYYYO......',
      '....OO..OO......',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  {
    palette: { O: '#ff8a1f', R: '#cf2424', Y: '#ffd23f' },
    rows: [
      '................',
      '...R..R..R..R...',
      '..ROOOOOOOOOR...',
      '.ROOOOYYYYOOOR..',
      '.OOOYYYYYYYOOR..',
      '.OYYYYRRYYYYOR..',
      '.OYYRRRRRRYYOR..',
      '.OYYRRRRRRYYOR..',
      '.OYYYYRRYYYYO...',
      '.OOOYYYYYYYOO...',
      '.ROOOOYYYYOOR...',
      '..ROOOOOOOOR....',
      '...R..R..R......',
      '................',
      '................',
      '................',
    ],
  },
  {
    palette: { D: '#3a3a3a', d: '#7a7a7a' },
    rows: [
      '................',
      '....dd...dd.....',
      '...dDDdddDDd....',
      '..dDDDDDDDDDd...',
      '..dDDdddddDDd...',
      '..dDdd...ddDd...',
      '..dDd.....dDd...',
      '..dDd.....dDd...',
      '..dDdd...ddDd...',
      '..dDDdddddDDd...',
      '..dDDDDDDDDDd...',
      '...dDDdddDDd....',
      '....dd...dd.....',
      '................',
      '................',
      '................',
    ],
  },
];

/**
 * Register every sprite the game uses with the texture manager.
 * Aircraft (player + per-era enemies) are stored as 8-frame spritesheets.
 * Motherships are stored as static (un-rotated) textures.
 */
export function registerArcadeSprites(scene: Phaser.Scene): void {
  // Aircraft: 8-direction pre-rendered sheets.
  addPixelAircraftSheet(scene, 'player', PLAYER_JET);
  addPixelAircraftSheet(scene, 'enemy1910', ENEMY_1910);
  addPixelAircraftSheet(scene, 'enemy1940', ENEMY_1940);
  addPixelAircraftSheet(scene, 'enemy1970', ENEMY_1970);
  addPixelAircraftSheet(scene, 'enemy1982', ENEMY_1982);
  addPixelAircraftSheet(scene, 'enemy2001', ENEMY_2001);

  // Motherships: large single-frame static sprites.
  addPixelTexture(scene, 'mother1910', MOTHER_1910);
  addPixelTexture(scene, 'mother1940', MOTHER_1940);
  addPixelTexture(scene, 'mother1970', MOTHER_1970);
  addPixelTexture(scene, 'mother1982', MOTHER_1982);
  addPixelTexture(scene, 'mother2001', MOTHER_2001);

  // Static sprites.
  addPixelTexture(scene, 'bullet', BULLET_PLAYER);
  addPixelTexture(scene, 'enemyBullet', BULLET_ENEMY);
  addPixelTexture(scene, 'cloud', CLOUD);
  addPixelTexture(scene, 'pilot', PILOT);

  EXPLOSION_FRAMES.forEach((def, i) => {
    addPixelTexture(scene, `explosion${i}`, def);
  });
}
