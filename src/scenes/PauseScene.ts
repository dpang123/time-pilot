import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { synth } from '../audio/synth';

/**
 * Modal pause overlay launched on top of GameScene.
 * GameScene is paused (physics, timers, input) until this scene closes.
 */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Dim background.
    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
      .setOrigin(0, 0)
      .setDepth(0);

    this.add
      .text(cx, cy - 50, 'PAUSED', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ffff66',
      })
      .setOrigin(0.5);

    const resume = this.makeButton(cx, cy - 8, 'RESUME', () => this.resume());
    const sound = this.makeButton(cx, cy + 18, soundLabel(), () => {
      synth.toggleMute();
      sound.setText(soundLabel());
    });
    this.makeButton(cx, cy + 44, 'QUIT TO MENU', () => this.quit());

    this.add
      .text(cx, GAME_HEIGHT - 14, 'P / ESC  RESUME', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#888888',
      })
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown-P', () => this.resume());
    this.input.keyboard?.on('keydown-ESC', () => this.resume());

    // Suppress focus marker.
    void resume;
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const t = this.add
      .text(x, y, label, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#222244',
        padding: { left: 10, right: 10, top: 4, bottom: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    t.on('pointerover', () => t.setColor('#ffff66'));
    t.on('pointerout', () => t.setColor('#ffffff'));
    t.on('pointerdown', onClick);
    return t;
  }

  private resume(): void {
    this.scene.resume('GameScene');
    this.scene.stop();
  }

  private quit(): void {
    this.scene.stop('GameScene');
    this.scene.start('MenuScene');
  }
}

function soundLabel(): string {
  return `SOUND  ${synth.isMuted() ? 'OFF' : 'ON '}`;
}
