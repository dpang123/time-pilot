import Phaser from 'phaser';

/**
 * BootScene runs once at startup. It is intentionally tiny — its only job
 * is to hand off to the PreloadScene which loads/generates assets.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.scene.start('PreloadScene');
  }
}
