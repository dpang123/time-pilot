import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { registerArcadeSprites } from '../gfx/arcadeSprites';
import { registerModernSprites } from '../gfx/modernSprites';

/**
 * PreloadScene generates all placeholder textures procedurally (no external
 * asset files needed for Phase 1/2). Real pixel-art atlases will be loaded
 * here in Phase 4.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // Loading bar (covers the brief moment of texture generation).
    const barWidth = 160;
    const barHeight = 6;
    const barX = (GAME_WIDTH - barWidth) / 2;
    const barY = GAME_HEIGHT / 2 + 16;

    const bg = this.add.rectangle(barX, barY, barWidth, barHeight, 0x222222).setOrigin(0, 0);
    const fg = this.add.rectangle(barX, barY, 0, barHeight, 0x55ff55).setOrigin(0, 0);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 8, 'LOADING', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.load.on('progress', (p: number) => {
      fg.width = barWidth * p;
    });

    this.load.once('complete', () => {
      bg.destroy();
      fg.destroy();
    });

    // No external assets yet — just a tick to ensure the loader fires.
    this.load.image('__noop', this.textures.getBase64('__DEFAULT'));
  }

  create(): void {
    // Register every pixel-art sprite used by the game.
    registerArcadeSprites(this);
    // Register higher-fidelity vector-style textures for Modern mode.
    registerModernSprites(this);
    this.scene.start('MenuScene');
  }
}
