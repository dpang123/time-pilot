import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import {
  getScreenMode,
  setScreenMode,
  ScreenMode,
  getTouchMode,
  setTouchMode,
  TouchMode,
} from '../config/screen';
import { synth } from '../audio/synth';

export class MenuScene extends Phaser.Scene {
  private modeText!: Phaser.GameObjects.Text;
  private touchText!: Phaser.GameObjects.Text;
  private soundText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, GAME_HEIGHT * 0.18, 'TIME PILOT', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#ffff00',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, GAME_HEIGHT * 0.18 + 22, '\u00A9 2026 ARCADE EDITION', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#888888',
      })
      .setOrigin(0.5);

    const startText = this.add
      .text(cx, GAME_HEIGHT * 0.45, 'PRESS SPACE OR TAP TO START', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, GAME_HEIGHT * 0.45 + 22, 'ARROWS  ROTATE     SPACE  FIRE', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, GAME_HEIGHT * 0.45 + 34, 'TOUCH JOYSTICK ON MOBILE', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    // Screen-mode selector (interactive — tap or press M to toggle).
    const mode = getScreenMode();
    this.modeText = this.add
      .text(cx, GAME_HEIGHT - 52, this.formatModeLabel(mode), {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#55ddff',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.modeText.on('pointerdown', (
      _p: Phaser.Input.Pointer,
      _x: number,
      _y: number,
      e: Phaser.Types.Input.EventData,
    ) => {
      e.stopPropagation();
      this.toggleMode();
    });

    // Touch-controls selector (interactive — tap or press T to cycle).
    this.touchText = this.add
      .text(cx, GAME_HEIGHT - 34, this.formatTouchLabel(getTouchMode()), {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#55ff99',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.touchText.on('pointerdown', (
      _p: Phaser.Input.Pointer,
      _x: number,
      _y: number,
      e: Phaser.Types.Input.EventData,
    ) => {
      e.stopPropagation();
      this.cycleTouch();
    });

    // Sound mute toggle.
    this.soundText = this.add
      .text(cx, GAME_HEIGHT - 70, this.formatSoundLabel(synth.isMuted()), {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffcc55',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.soundText.on('pointerdown', (
      _p: Phaser.Input.Pointer,
      _x: number,
      _y: number,
      e: Phaser.Types.Input.EventData,
    ) => {
      e.stopPropagation();
      this.toggleSound();
    });

    this.add
      .text(cx, GAME_HEIGHT - 14, 'L  LEADERBOARD', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#888888',
      })
      .setOrigin(0.5);

    // Blink "press start" text.
    this.tweens.add({
      targets: startText,
      alpha: { from: 1, to: 0.2 },
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
    this.input.keyboard?.on('keydown-L', () => this.scene.start('LeaderboardScene'));
    this.input.keyboard?.on('keydown-M', () => this.toggleMode());
    this.input.keyboard?.on('keydown-T', () => this.cycleTouch());
    this.input.keyboard?.on('keydown-S', () => this.toggleSound());
    // Tap anywhere except the menu toggles starts the game.
    this.input.on(
      'pointerdown',
      (_p: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
        if (
          currentlyOver.includes(this.modeText) ||
          currentlyOver.includes(this.touchText) ||
          currentlyOver.includes(this.soundText)
        ) {
          return;
        }
        this.startGame();
      },
    );
  }

  private startGame(): void {
    synth.unlock();
    this.scene.start('GameScene');
  }

  private formatModeLabel(mode: ScreenMode): string {
    return `MODE  ${mode.toUpperCase()}  (TAP / M)`;
  }

  private formatTouchLabel(mode: TouchMode): string {
    return `TOUCH  ${mode.toUpperCase()}  (TAP / T)`;
  }

  private formatSoundLabel(muted: boolean): string {
    return `SOUND  ${muted ? 'OFF' : 'ON '}  (TAP / S)`;
  }

  private toggleSound(): void {
    synth.unlock();
    const muted = synth.toggleMute();
    this.soundText.setText(this.formatSoundLabel(muted));
    if (!muted) synth.play('1up');
  }

  private cycleTouch(): void {
    const order: TouchMode[] = ['auto', 'on', 'off'];
    const current = getTouchMode();
    const next = order[(order.indexOf(current) + 1) % order.length];
    setTouchMode(next);
    this.touchText.setText(this.formatTouchLabel(next));
  }

  private toggleMode(): void {
    const next: ScreenMode = getScreenMode() === 'portrait' ? 'landscape' : 'portrait';
    setScreenMode(next);
    this.modeText.setText(this.formatModeLabel(next));
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 56, 'RELOADING...', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffff66',
      })
      .setOrigin(0.5);
    // Phaser must re-init at a different internal resolution → reload the page.
    this.time.delayedCall(150, () => window.location.reload());
  }
}
