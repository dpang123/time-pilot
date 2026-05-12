import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { LeaderboardScene } from './scenes/LeaderboardScene';
import { PauseScene } from './scenes/PauseScene';
import { getScreenSize } from './config/screen';
import { getGraphicsMode } from './config/graphics';

// Internal game resolution — chosen at boot from the user's saved screen mode.
// Game logic reads these via the GAME_WIDTH / GAME_HEIGHT exports.
const size = getScreenSize();
export const GAME_WIDTH = size.width;
export const GAME_HEIGHT = size.height;
const graphicsMode = getGraphicsMode();
const modern = graphicsMode === 'modern';

if (typeof document !== 'undefined') {
  document.body.classList.toggle('modern-graphics', modern);
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // WebGL with Canvas fallback
  parent: 'game',
  backgroundColor: '#000000',
  pixelArt: !modern,
  roundPixels: !modern,
  antialias: modern,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  input: {
    gamepad: true,
    activePointers: 3,
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  scene: [
    BootScene,
    PreloadScene,
    MenuScene,
    GameScene,
    GameOverScene,
    LeaderboardScene,
    PauseScene,
  ],
};

new Phaser.Game(config);
