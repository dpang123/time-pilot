import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { angleToFrame } from '../gfx/pixelArt';
import { shouldShowTouchControls } from '../config/screen';
import { getGraphicsMode, setGraphicsMode } from '../config/graphics';
import { createVirtualControls, VirtualControls } from '../input/VirtualControls';
import { ERAS, EraConfig, eraForLoop } from '../eras/eraConfig';
import { synth } from '../audio/synth';
import { startSession, SessionToken } from '../net/leaderboard';

// ---- Tunable constants ----
const PLAYER_SPEED = 90; // px/sec — apparent world scroll speed
const ROT_SPEED = 4; // radians/sec
const FIRE_RATE_MS = 220;
const BULLET_SPEED = 220;
const BULLET_LIFE_MS = 700;
const ENEMY_BULLET_SPEED = 130;
const RESPAWN_INVULN_MS = 1500;
const STARTING_LIVES = 3;

const SCORE_ENEMY = 100;
const SCORE_MOTHER = 5000;
const SCORE_PILOT = 1500;

const PILOT_DRIFT_SPEED = 25;
const PILOT_LIFE_MS = 9000;
const PILOT_SPAWN_CHANCE = 0.18; // chance of pilot bailing out per kill

const FIRST_EXTRA_LIFE = 10000;
const EXTRA_LIFE_INTERVAL = 50000;

interface Bullet extends Phaser.Physics.Arcade.Image {
  bornAt: number;
}

interface Pilot extends Phaser.Physics.Arcade.Image {
  bornAt: number;
}

interface MothershipSprite extends Phaser.Physics.Arcade.Image {
  hp: number;
  cruiseVx: number;
  cruiseVy: number;
  lastShotAt: number;
}

interface EnemySprite extends Phaser.Physics.Arcade.Image {
  spawnAt: number;
  lastShotAt: number;
}

interface ModernGrade {
  multiplyColor: number;
  multiplyAlpha: number;
  addColor: number;
  addAlpha: number;
  tintColor: number;
  tintAlpha: number;
  pulseAmplitude: number;
}

interface ModernCameraProfile {
  hitShakeScale: number;
  motherShakeScale: number;
  playerShakeScale: number;
  bossZoom: number;
}

export class GameScene extends Phaser.Scene {
  // Era state
  private eraIndex = 0;
  private loop = 0;
  private era!: EraConfig;
  private mothershipSpawned = false;
  private mothershipDefeated = false;
  private transitioning = false;

  // Player state
  private player!: Phaser.Physics.Arcade.Image;
  private playerAngle = -Math.PI / 2;
  private lastFireAt = 0;
  private invulnUntil = 0;
  private nextExtraLifeAt = FIRST_EXTRA_LIFE;

  // Groups
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private pilots!: Phaser.Physics.Arcade.Group;
  private mothership: MothershipSprite | null = null;

  // Background
  private clouds: Phaser.GameObjects.Image[] = [];
  private modernBackdrop: Phaser.GameObjects.Rectangle[] = [];
  private modernNebula: Phaser.GameObjects.Ellipse[] = [];
  private modernLightBands: Phaser.GameObjects.Rectangle[] = [];
  private speedLines: Phaser.GameObjects.Rectangle[] = [];
  private playerGlow: Phaser.GameObjects.Image | null = null;
  private modernHudGlow: Phaser.GameObjects.Rectangle | null = null;
  private modernHudBottomGlow: Phaser.GameObjects.Rectangle | null = null;
  private cinematicFlash: Phaser.GameObjects.Rectangle | null = null;
  private modernGradeMultiply: Phaser.GameObjects.Rectangle | null = null;
  private modernGradeAdd: Phaser.GameObjects.Rectangle | null = null;
  private modernGradeTint: Phaser.GameObjects.Rectangle | null = null;
  private cinematicBarTop: Phaser.GameObjects.Rectangle | null = null;
  private cinematicBarBottom: Phaser.GameObjects.Rectangle | null = null;
  private modernMotes: Phaser.GameObjects.Image[] = [];

  // Run stats
  private score = 0;
  private lives = STARTING_LIVES;
  private kills = 0;

  // HUD
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private eraText!: Phaser.GameObjects.Text;
  private killBarBg!: Phaser.GameObjects.Rectangle;
  private killBarFg!: Phaser.GameObjects.Rectangle;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private touch?: VirtualControls;

  private spawnTimer!: Phaser.Time.TimerEvent;

  // Leaderboard session token + run start timestamp for duration sanity check.
  private session: SessionToken | null = null;
  private runStartedAt = 0;

  private modernMode = false;
  private lastTrailAt = 0;
  private engineTrailTint = 0x8cefff;
  private playerShotTint = 0xb7ffff;
  private enemyShotTint = 0xff9f9f;
  private muzzleFlashTint = 0x8cefff;
  private hitFlashTint = 0x8ecfff;
  private debrisTint = 0xa3daff;
  private motherHitTint = 0xffb89a;
  private muzzleFlashMs = 80;
  private hitFlashMs = 70;
  private motherHitFlashMs = 90;
  private explosionBloomTint = 0xaedfff;
  private explosionBloomMs = 220;
  private gradeAddBaseAlpha = 0.055;
  private gradePulseAmplitude = 0.012;
  private hitShakeScale = 1;
  private motherShakeScale = 1;
  private playerShakeScale = 1;
  private bossZoom = 1.03;

  private currentEnemyKey = '';
  private currentMotherKey = '';

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.modernMode = getGraphicsMode() === 'modern';
    if (this.modernMode && !this.textures.exists('fxGlow')) {
      this.createGlowTexture('fxGlow', '#8cecff', 96);
    }
    if (this.modernMode && !this.textures.exists('fxRing')) {
      this.createRingTexture('fxRing', '#9edfff', 128);
    }

    // Reset run state.
    this.eraIndex = 0;
    this.loop = 0;
    this.score = 0;
    this.lives = STARTING_LIVES;
    this.invulnUntil = 0;
    this.lastFireAt = 0;
    this.playerAngle = -Math.PI / 2;
    this.nextExtraLifeAt = FIRST_EXTRA_LIFE;
    this.mothership = null;
    this.mothershipSpawned = false;
    this.mothershipDefeated = false;
    this.transitioning = false;
    this.kills = 0;
    this.lastTrailAt = 0;

    if (this.modernMode) {
      this.applyModernSmoothing();
      this.createModernBackdrop();
      this.createSpeedLines();
      this.createModernGradeOverlays();
      this.createCinematicBars();
      this.cinematicFlash = this.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x77d9ff, 0)
        .setDepth(2500)
        .setBlendMode(Phaser.BlendModes.ADD);
    }

    // Build clouds (re-tinted per era).
    this.clouds = [];
    const cloudKey = this.modernMode ? 'modernCloud' : 'cloud';
    for (let i = 0; i < 14; i++) {
      const c = this.add.image(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, GAME_HEIGHT),
        cloudKey,
      );
      const depth = Phaser.Math.FloatBetween(0.3, 1.0);
      c.setScale(this.modernMode ? depth * 0.48 : depth);
      c.setAlpha(0.5 + depth * 0.3);
      c.setData('parallax', depth);
      this.clouds.push(c);
    }

    // Player jet — locked at screen centre with 8-frame heading sheet.
    this.player = this.physics.add.image(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      this.modernMode ? 'modernPlayer' : 'player',
      0,
    );
    this.player.setCollideWorldBounds(false).setDepth(50);
    if (this.modernMode) {
      this.player.setScale(0.44);
      this.player.setTint(0xd8f0ff);
      this.playerGlow = this.add
        .image(this.player.x, this.player.y, 'fxGlow')
        .setDepth(49)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.45)
        .setScale(0.48);
    }
    (this.player.body as Phaser.Physics.Arcade.Body).setCircle(8, 0, 0);
    if (!this.modernMode) {
      this.player.setFrame(angleToFrame(this.playerAngle));
    } else {
      this.player.setRotation(this.playerAngle + Math.PI / 2);
    }

    // Groups.
    this.bullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 32 });
    this.enemies = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image });
    this.enemyBullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 48 });
    this.pilots = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image });

    // Collisions.
    this.physics.add.overlap(this.bullets, this.enemies, (b, e) =>
      this.onBulletHitEnemy(b as Bullet, e as EnemySprite),
    );
    this.physics.add.overlap(this.player, this.enemies, (_p, e) =>
      this.onPlayerHit(e as Phaser.Physics.Arcade.Image),
    );
    this.physics.add.overlap(this.player, this.enemyBullets, (_p, b) =>
      this.onPlayerHit(b as Phaser.Physics.Arcade.Image),
    );
    this.physics.add.overlap(this.player, this.pilots, (_p, pi) =>
      this.onPlayerCollectPilot(pi as Pilot),
    );

    // HUD.
    this.scoreText = this.add
      .text(4, 4, 'SCORE 0', { fontFamily: 'monospace', fontSize: '10px', color: '#ffffff' })
      .setScrollFactor(0)
      .setDepth(1000);
    this.livesText = this.add
      .text(GAME_WIDTH - 4, 4, `LIVES ${this.lives}`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffffff',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1000);
    this.eraText = this.add
      .text(GAME_WIDTH / 2, 4, '', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffff66',
      })
      .setOrigin(0.5, 0)
      .setDepth(1000);
    this.killBarBg = this.add
      .rectangle(GAME_WIDTH - 4, GAME_HEIGHT - 4, 60, 4, 0x222222)
      .setOrigin(1, 1)
      .setDepth(1000);
    this.killBarFg = this.add
      .rectangle(GAME_WIDTH - 4 - 60, GAME_HEIGHT - 4, 0, 4, 0xffaa00)
      .setOrigin(0, 1)
      .setDepth(1000);

    if (this.modernMode) {
      this.scoreText.setFontFamily('Trebuchet MS').setFontSize('11px');
      this.livesText.setFontFamily('Trebuchet MS').setFontSize('11px');
      this.eraText.setFontFamily('Trebuchet MS').setFontSize('11px');
      this.scoreText.setStyle({ fontStyle: 'bold' });
      this.livesText.setStyle({ fontStyle: 'bold' });
      this.eraText.setStyle({ fontStyle: 'bold' });
      this.scoreText.setColor('#e6f4ff');
      this.livesText.setColor('#e6f4ff');
      this.eraText.setColor('#8cf0ff');
      this.scoreText.setShadow(0, 0, '#58cfff', 6, true, true);
      this.livesText.setShadow(0, 0, '#58cfff', 6, true, true);
      this.eraText.setShadow(0, 0, '#58cfff', 8, true, true);
      this.modernHudGlow = this.add
        .rectangle(GAME_WIDTH / 2, 14, GAME_WIDTH - 8, 22, 0x2ea3ff, 0.1)
        .setDepth(900)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.modernHudBottomGlow = this.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 8, GAME_WIDTH - 8, 16, 0x2ea3ff, 0.09)
        .setDepth(900)
        .setBlendMode(Phaser.BlendModes.ADD);
    }

    // Input.
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.fireKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    if (shouldShowTouchControls()) {
      this.touch = createVirtualControls(this);
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.touch?.destroy();
      this.spawnTimer?.remove(false);
      this.playerGlow?.destroy();
      this.modernHudGlow?.destroy();
      this.modernHudBottomGlow?.destroy();
      this.modernGradeMultiply?.destroy();
      this.modernGradeAdd?.destroy();
      this.modernGradeTint?.destroy();
      this.cinematicBarTop?.destroy();
      this.cinematicBarBottom?.destroy();
      this.modernMotes.forEach((m) => m.destroy());
      this.modernBackdrop.forEach((b) => b.destroy());
      this.modernNebula.forEach((n) => n.destroy());
      this.modernLightBands.forEach((b) => b.destroy());
      this.speedLines.forEach((s) => s.destroy());
      this.cinematicFlash?.destroy();
    });

    // Start the first era.
    this.startEra(0, 0);

    // Make sure audio is unlocked the first time the player taps/clicks/keys.
    this.input.once('pointerdown', () => synth.unlock());
    this.input.keyboard?.once('keydown', () => synth.unlock());

    // Pause menu (P or ESC).
    const tryPause = () => {
      if (this.scene.isPaused()) return;
      this.scene.launch('PauseScene');
      this.scene.pause();
    };
    this.input.keyboard?.on('keydown-P', tryPause);
    this.input.keyboard?.on('keydown-ESC', tryPause);

    // Hidden function: Enable modern mode (Q key or top-left touch).
    this.input.keyboard?.on('keydown-Q', () => this.enableModernMode());
    
    // Top-left corner touch detection for modern mode.
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const cornerSize = 80; // 80x80px corner area
      if (pointer.x < cornerSize && pointer.y < cornerSize) {
        this.enableModernMode();
      }
    });

    // Small marker for the hidden top-left activation area.
    this.add.circle(10, 10, 2, 0xff2f2f, 0.95).setScrollFactor(0).setDepth(1200);

    // Kick off a leaderboard session in the background. If the API isn't
    // reachable (offline / dev without `vercel dev`) we just won't be able
    // to submit — game still plays normally.
    this.runStartedAt = Date.now();
    this.session = null;
    void startSession().then((s) => {
      this.session = s;
    });
  }

  // ---------- Era control ----------

  private startEra(index: number, loop: number): void {
    this.eraIndex = index;
    this.loop = loop;
    this.era = eraForLoop(index, loop);
    this.kills = 0;
    this.mothership = null;
    this.mothershipSpawned = false;
    this.mothershipDefeated = false;
    this.transitioning = false;
    this.currentEnemyKey = this.modernMode ? this.modernEnemyKey(index) : this.era.enemyKey;
    this.currentMotherKey = this.modernMode ? this.modernMotherKey(index) : this.era.motherKey;

    // Apply era look.
    this.cameras.main.setBackgroundColor(this.era.skyColor);
    for (const c of this.clouds) c.setTint(this.era.cloudTint);
    if (this.modernMode) {
      const tint = this.era.skyColor;
      this.modernBackdrop[0]?.setFillStyle(tint, 0.26);
      this.modernBackdrop[1]?.setFillStyle(0x091324, 0.34);
      this.modernLightBands.forEach((b, i) => {
        b.setFillStyle(tint, i % 2 === 0 ? 0.085 : 0.06);
      });
      this.modernNebula.forEach((n, i) => {
        n.setFillStyle(i % 2 === 0 ? tint : 0x57b7ff, i % 2 === 0 ? 0.18 : 0.12);
      });
      this.modernMotes.forEach((m) => {
        m.setTint(this.modernMoteTint(index));
      });
      this.engineTrailTint = this.modernTrailTint(index);
      this.playerShotTint = this.modernPlayerShotTint(index);
      this.enemyShotTint = this.modernEnemyShotTint(index);
      this.muzzleFlashTint = this.modernMuzzleFlashTint(index);
      this.hitFlashTint = this.modernHitFlashTint(index);
      this.debrisTint = this.modernDebrisTint(index);
      this.motherHitTint = this.modernMotherHitTint(index);
      this.explosionBloomTint = this.modernExplosionTint(index);
      this.muzzleFlashMs = this.modernMuzzleFlashMs(index);
      this.hitFlashMs = this.modernHitFlashMs(index);
      this.motherHitFlashMs = this.modernMotherHitFlashMs(index);
      this.explosionBloomMs = this.modernExplosionBloomMs(index);
      this.applyModernGrade(index);
      this.applyModernCameraProfile(index);
      this.setBossCinematicMode(false);
    }

    // Recreate spawn timer with era cadence.
    this.spawnTimer?.remove(false);
    this.spawnTimer = this.time.addEvent({
      delay: this.era.spawnIntervalMs,
      loop: true,
      callback: () => this.spawnEnemy(),
    });

    // Show "YEAR 19xx" banner.
    this.eraText.setText(`YEAR ${this.era.label}${loop > 0 ? `  LOOP ${loop + 1}` : ''}`);
    const banner = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `YEAR  ${this.era.label}`, {
        fontFamily: this.modernMode ? 'Trebuchet MS' : 'monospace',
        fontSize: this.modernMode ? '22px' : '24px',
        color: this.modernMode ? '#9cefff' : '#ffff66',
      })
      .setOrigin(0.5)
      .setDepth(1500);
    if (this.modernMode) {
      banner.setStroke('#041220', 5);
      banner.setShadow(0, 0, '#59d7ff', 12, true, true);
    }
    this.tweens.add({
      targets: banner,
      alpha: { from: 1, to: 0 },
      duration: 1800,
      onComplete: () => banner.destroy(),
    });
    synth.play('eraStart');
  }

  private advanceEra(): void {
    if (this.transitioning) return;
    this.transitioning = true;
    if (this.modernMode) this.setBossCinematicMode(false);
    // Stop spawning during the transition.
    this.spawnTimer?.remove(false);
    // Clear any leftover enemies / bullets / pilots from this era.
    this.enemies.clear(true, true);
    this.enemyBullets.clear(true, true);
    this.pilots.clear(true, true);
    this.mothership = null;

    this.time.delayedCall(1200, () => {
      const next = (this.eraIndex + 1) % ERAS.length;
      const nextLoop = next === 0 ? this.loop + 1 : this.loop;
      this.startEra(next, nextLoop);
    });
  }

  // ---------- Per-frame update ----------

  override update(_time: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    const now = this.time.now;

    // Player rotation: keyboard.
    if (this.cursors.left?.isDown) this.playerAngle -= ROT_SPEED * dt;
    if (this.cursors.right?.isDown) this.playerAngle += ROT_SPEED * dt;
    // Touch joystick.
    if (this.touch && this.touch.magnitude > 0.15) {
      const target = this.touch.angle;
      const diff = Phaser.Math.Angle.Wrap(target - this.playerAngle);
      const step = ROT_SPEED * 1.4 * dt * this.touch.magnitude;
      if (Math.abs(diff) <= step) this.playerAngle = target;
      else this.playerAngle += Math.sign(diff) * step;
    }
    // Gamepad: left stick aims, right stick or face buttons fire.
    let gamepadFire = false;
    const pads = this.input.gamepad?.gamepads ?? [];
    const pad = pads.find((g) => g && g.connected);
    if (pad) {
      const lx = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
      const ly = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
      const mag = Math.hypot(lx, ly);
      if (mag > 0.25) {
        const target = Math.atan2(ly, lx);
        const diff = Phaser.Math.Angle.Wrap(target - this.playerAngle);
        const step = ROT_SPEED * 1.4 * dt * Math.min(1, mag);
        if (Math.abs(diff) <= step) this.playerAngle = target;
        else this.playerAngle += Math.sign(diff) * step;
      }
      // Any face button or right trigger fires.
      gamepadFire =
        pad.buttons.some((b, i) => i < 8 && b.pressed) || (pad.buttons[7]?.value ?? 0) > 0.3;
    }
    if (this.modernMode) {
      this.player.setRotation(this.playerAngle + Math.PI / 2);
    } else {
      this.player.setFrame(angleToFrame(this.playerAngle));
    }
    if (this.modernMode && this.playerGlow) {
      this.playerGlow.setPosition(this.player.x, this.player.y);
      this.playerGlow.setScale(0.46 + Math.sin(now / 120) * 0.03);
      this.playerGlow.setAlpha(0.42 + Math.sin(now / 160) * 0.08);
    }

    // World scroll velocity (opposite of player heading).
    const vx = -Math.cos(this.playerAngle) * PLAYER_SPEED;
    const vy = -Math.sin(this.playerAngle) * PLAYER_SPEED;

    if (this.modernMode && now - this.lastTrailAt > 45) {
      this.spawnContrail();
      this.lastTrailAt = now;
    }
    if (this.modernMode) {
      this.updateSpeedLines(dt);
      this.updateModernMotes(dt, vx, vy, now);
      if (this.modernGradeAdd) {
        this.modernGradeAdd.alpha =
          this.gradeAddBaseAlpha + Math.sin(now / 320 + this.eraIndex * 0.8) * this.gradePulseAmplitude;
      }
    }

    // Parallax clouds.
    for (const c of this.clouds) {
      const p = c.getData('parallax') as number;
      c.x += vx * p * dt;
      c.y += vy * p * dt;
      this.wrapInPlayfield(c, 18);
    }

    // Enemies: world-scroll + simple home-on-player AI.
    this.enemies.getChildren().forEach((obj) => {
      const e = obj as EnemySprite;
      e.x += vx * dt;
      e.y += vy * dt;
      if (e.x < -64 || e.x > GAME_WIDTH + 64 || e.y < -64 || e.y > GAME_HEIGHT + 64) {
        e.destroy();
        return;
      }
      const angleToPlayer = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
      if (this.modernMode) {
        e.setRotation(angleToPlayer + Math.PI / 2);
      } else {
        e.setFrame(angleToFrame(angleToPlayer));
      }
      const body = e.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(
        Math.cos(angleToPlayer) * this.era.enemySpeed,
        Math.sin(angleToPlayer) * this.era.enemySpeed,
      );
      // Era-flavoured firing: 1970+ enemies occasionally fire at the player.
      if (this.eraIndex >= 2 && now - e.lastShotAt > 1800 + Math.random() * 1500) {
        this.fireEnemyShot(e.x, e.y, angleToPlayer);
        e.lastShotAt = now;
      }
    });

    // Enemy bullets: world-scroll + lifetime.
    this.enemyBullets.getChildren().forEach((obj) => {
      const b = obj as Bullet;
      b.x += vx * dt;
      b.y += vy * dt;
      if (now - b.bornAt > BULLET_LIFE_MS * 2) b.destroy();
    });

    // Player bullets: NOT scrolled (they fly screen-relative).
    this.bullets.getChildren().forEach((obj) => {
      const b = obj as Bullet;
      if (now - b.bornAt > BULLET_LIFE_MS) b.destroy();
    });

    // Pilots: drift downward (relative to world) and despawn after a while.
    this.pilots.getChildren().forEach((obj) => {
      const p = obj as Pilot;
      p.x += vx * dt;
      p.y += vy * dt + PILOT_DRIFT_SPEED * dt;
      if (now - p.bornAt > PILOT_LIFE_MS) p.destroy();
    });

    // Mothership: cruises across the screen, fires periodic spread.
    // Self-heal a/v in case some Phaser internal flips them — we own its life
    // cycle via hp + the local `mothership` reference.
    if (this.mothership && this.mothership.hp > 0) {
      const m = this.mothership;
      if (!m.active) m.setActive(true);
      if (!m.visible) m.setVisible(true);
      const body = m.body as Phaser.Physics.Arcade.Body | null;
      if (body && !body.enable) body.enable = true;
      m.x += m.cruiseVx * dt;
      m.y += m.cruiseVy * dt;
      // Bounce off the screen edges, with a hard clamp so it never escapes.
      const halfW = m.width / 2;
      const halfH = m.height / 2;
      if (m.x < halfW) {
        m.x = halfW;
        m.cruiseVx = Math.abs(m.cruiseVx);
      } else if (m.x > GAME_WIDTH - halfW) {
        m.x = GAME_WIDTH - halfW;
        m.cruiseVx = -Math.abs(m.cruiseVx);
      }
      if (m.y < halfH) {
        m.y = halfH;
        m.cruiseVy = Math.abs(m.cruiseVy);
      } else if (m.y > GAME_HEIGHT - halfH) {
        m.y = GAME_HEIGHT - halfH;
        m.cruiseVy = -Math.abs(m.cruiseVy);
      }
      // Manual collision: bullets vs mothership (radius-based).
      const hitR = Math.min(m.width, m.height) / 2 - 2;
      const hitR2 = hitR * hitR;
      this.bullets.getChildren().forEach((obj) => {
        const b = obj as Bullet;
        if (!b.active) return;
        const dx = b.x - m.x;
        const dy = b.y - m.y;
        if (dx * dx + dy * dy <= hitR2) {
          this.onBulletHitMother(b);
        }
      });
      // Manual collision: player body vs mothership.
      if (this.time.now >= this.invulnUntil) {
        const pdx = this.player.x - m.x;
        const pdy = this.player.y - m.y;
        const playerR = 7;
        const combinedR = hitR + playerR;
        if (pdx * pdx + pdy * pdy <= combinedR * combinedR) {
          this.onPlayerHit(m);
        }
      }
      // Fire spread shots.
      if (now - m.lastShotAt > 1400) {
        const baseAngle = Phaser.Math.Angle.Between(m.x, m.y, this.player.x, this.player.y);
        for (const off of [-0.3, 0, 0.3]) {
          this.fireEnemyShot(m.x, m.y, baseAngle + off);
        }
        m.lastShotAt = now;
      }
    }

    // Fire input.
    const wantFire = this.fireKey.isDown || (this.touch?.firing ?? false) || gamepadFire;
    if (wantFire && now - this.lastFireAt > FIRE_RATE_MS) {
      this.fireBullet();
      synth.play('fire');
      if (this.modernMode) this.pulseFlash(this.muzzleFlashTint, 0.06, this.muzzleFlashMs);
      this.lastFireAt = now;
    }

    // Invulnerability flicker.
    this.player.setAlpha(now < this.invulnUntil && Math.floor(now / 80) % 2 === 0 ? 0.3 : 1);

    // Mothership spawn check.
    if (!this.mothershipSpawned && !this.transitioning && this.kills >= this.era.killsForMother) {
      this.spawnMothership();
    }

    // HUD.
    this.scoreText.setText(`SCORE ${this.score}`);
    this.livesText.setText(`LIVES ${this.lives}`);
    const ratio = this.mothershipSpawned
      ? (this.mothership ? this.mothership.hp / this.era.motherHp : 0)
      : Math.min(1, this.kills / this.era.killsForMother);
    this.killBarFg.width = 60 * ratio;
    this.killBarFg.fillColor = this.mothershipSpawned ? 0xff5555 : 0xffaa00;
  }

  // ---------- Spawning ----------

  private spawnEnemy(): void {
    if (this.transitioning || this.mothershipSpawned) return;
    const side = Phaser.Math.Between(0, 3);
    let x = 0,
      y = 0;
    switch (side) {
      case 0: x = Phaser.Math.Between(0, GAME_WIDTH); y = -16; break;
      case 1: x = GAME_WIDTH + 16; y = Phaser.Math.Between(0, GAME_HEIGHT); break;
      case 2: x = Phaser.Math.Between(0, GAME_WIDTH); y = GAME_HEIGHT + 16; break;
      case 3: x = -16; y = Phaser.Math.Between(0, GAME_HEIGHT); break;
    }
    const e = this.enemies.create(x, y, this.currentEnemyKey, 0) as EnemySprite;
    e.setActive(true).setVisible(true).setDepth(40);
    if (this.modernMode) {
      e.setScale(0.4);
      e.setTint(0xe7f5ff);
    }
    (e.body as Phaser.Physics.Arcade.Body).setCircle(7, 0, 0);
    e.spawnAt = this.time.now;
    e.lastShotAt = this.time.now;
  }

  private spawnMothership(): void {
    this.mothershipSpawned = true;
    if (this.modernMode) this.setBossCinematicMode(true);
    synth.play('motherWarn');
    // Warning flash.
    const warn = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '!! WARNING !!', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ff3333',
      })
      .setOrigin(0.5)
      .setDepth(1500);
    this.tweens.add({
      targets: warn,
      alpha: { from: 1, to: 0 },
      duration: 1200,
      onComplete: () => warn.destroy(),
    });

    // Spawn the mothership near the top of the screen, cruising sideways.
    const m = this.physics.add.image(GAME_WIDTH / 2, 28, this.currentMotherKey) as MothershipSprite;
    if (this.modernMode) m.setScale(0.43);
    m.hp = this.era.motherHp;
    m.cruiseVx = this.era.motherSpeed * (Math.random() < 0.5 ? -1 : 1);
    m.cruiseVy = this.era.motherSpeed * 0.25;
    m.lastShotAt = this.time.now + 600;
    m.setDepth(45);
    (m.body as Phaser.Physics.Arcade.Body).setCircle(Math.min(m.width, m.height) / 2 - 2, 2, 2);
    this.mothership = m;

    // NOTE: We deliberately do NOT use this.physics.add.overlap for the
    // mothership. Phaser's physics engine occasionally flips the body's
    // active/visible flags during steps, which broke the overlap callback
    // and made the boss invincible. We handle bullet/player collision with
    // a simple manual circle-vs-point check in update() instead.
  }

  private spawnPilot(x: number, y: number): void {
    const p = this.pilots.create(x, y, this.modernMode ? 'modernPilot' : 'pilot') as Pilot;
    p.setActive(true).setVisible(true).setDepth(30);
    if (this.modernMode) p.setScale(0.48);
    (p.body as Phaser.Physics.Arcade.Body).setCircle(5, 0, 0);
    p.bornAt = this.time.now;
  }

  private fireBullet(): void {
    const b = this.bullets.get(
      this.player.x,
      this.player.y,
      this.modernMode ? 'modernBullet' : 'bullet',
    ) as Bullet | null;
    if (!b) return;
    b.setActive(true).setVisible(true).setDepth(60);
    if (!b.body) this.physics.add.existing(b);
    const body = b.body as Phaser.Physics.Arcade.Body;
    body.reset(this.player.x, this.player.y);
    body.setVelocity(
      Math.cos(this.playerAngle) * BULLET_SPEED,
      Math.sin(this.playerAngle) * BULLET_SPEED,
    );
    if (this.modernMode) {
      b.setScale(1.2).setTint(0xb7ffff);
      const flash = this.add
        .image(this.player.x, this.player.y, 'fxGlow')
        .setDepth(59)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(this.muzzleFlashTint)
        .setAlpha(0.35)
        .setScale(0.22);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        scale: 0.34,
        duration: this.muzzleFlashMs + 40,
        onComplete: () => flash.destroy(),
      });
      b.setTint(this.playerShotTint);
    }
    b.bornAt = this.time.now;
  }

  private fireEnemyShot(x: number, y: number, angle: number): void {
    const b = this.enemyBullets.get(
      x,
      y,
      this.modernMode ? 'modernEnemyBullet' : 'enemyBullet',
    ) as Bullet | null;
    if (!b) return;
    b.setActive(true).setVisible(true).setDepth(55);
    if (!b.body) this.physics.add.existing(b);
    const body = b.body as Phaser.Physics.Arcade.Body;
    body.reset(x, y);
    body.setVelocity(Math.cos(angle) * ENEMY_BULLET_SPEED, Math.sin(angle) * ENEMY_BULLET_SPEED);
    if (this.modernMode) {
      b.setTint(this.enemyShotTint).setScale(1.1);
    }
    b.bornAt = this.time.now;
    synth.play('enemyFire');
  }

  // ---------- Hit handlers ----------

  private onBulletHitEnemy(b: Bullet, e: EnemySprite): void {
    if (!b.active || !e.active) return;
    b.setActive(false).setVisible(false);
    const ex = e.x;
    const ey = e.y;
    this.spawnExplosion(ex, ey);
    e.destroy();
    b.destroy();
    this.addScore(SCORE_ENEMY);
    this.kills += 1;
    if (this.modernMode) {
      this.spawnDebris(ex, ey, this.debrisTint);
      this.spawnShockwave(ex, ey, this.hitFlashTint, 0.08, 0.34, 180);
      this.spawnHitSparks(ex, ey, this.hitFlashTint, 3);
      this.pulseFlash(this.hitFlashTint, 0.04, this.hitFlashMs);
    }
    this.cameras.main.shake(80, 0.003 * this.hitShakeScale);
    synth.play('enemyExplode');
    if (Math.random() < PILOT_SPAWN_CHANCE) {
      this.spawnPilot(ex, ey);
    }
  }

  private onBulletHitMother(b: Bullet): void {
    // A single bullet can produce multiple overlap callbacks within the same
    // frame (Phaser checks AABBs per step but doesn't deactivate immediately
    // on b.destroy()). Guard so each bullet only counts once.
    if (!b.active) return;
    if (!this.mothership || this.mothership.hp <= 0) return;
    b.setActive(false).setVisible(false);
    b.destroy();
    this.spawnExplosion(
      this.mothership.x + Phaser.Math.Between(-this.mothership.width / 3, this.mothership.width / 3),
      this.mothership.y + Phaser.Math.Between(-this.mothership.height / 3, this.mothership.height / 3),
    );
    if (this.modernMode) {
      this.spawnDebris(this.mothership.x, this.mothership.y, this.motherHitTint);
      this.spawnShockwave(this.mothership.x, this.mothership.y, this.motherHitTint, 0.12, 0.46, 240);
      this.spawnHitSparks(this.mothership.x, this.mothership.y, this.motherHitTint, 4);
      this.pulseFlash(this.motherHitTint, 0.05, this.motherHitFlashMs);
    }
    this.mothership.hp -= 1;
    this.cameras.main.shake(60, 0.002 * this.motherShakeScale);
    synth.play('motherHit');
    if (this.mothership.hp <= 0) {
      const mx = this.mothership.x;
      const my = this.mothership.y;
      // Big explosion.
      for (let i = 0; i < 6; i++) {
        const dx = Phaser.Math.Between(-20, 20);
        const dy = Phaser.Math.Between(-12, 12);
        this.time.delayedCall(i * 90, () => this.spawnExplosion(mx + dx, my + dy));
      }
      if (this.modernMode) {
        this.spawnShockwave(mx, my, this.modernExplosionTint(this.eraIndex), 0.22, 1.1, 520);
        this.setBossCinematicMode(false);
      }
      this.cameras.main.shake(500, 0.015 * this.motherShakeScale);
      this.mothership.destroy();
      this.mothership = null;
      this.mothershipDefeated = true;
      this.addScore(SCORE_MOTHER);
      synth.play('motherExplode');
      this.advanceEra();
    }
  }

  private onPlayerCollectPilot(p: Pilot): void {
    p.destroy();
    this.addScore(SCORE_PILOT);
    synth.play('pilot');
    const t = this.add
      .text(this.player.x, this.player.y - 14, `+${SCORE_PILOT}`, {
        fontFamily: this.modernMode ? 'Trebuchet MS' : 'monospace',
        fontSize: this.modernMode ? '10px' : '8px',
        color: this.modernMode ? '#a8ffe7' : '#55ff55',
      })
      .setOrigin(0.5)
      .setDepth(1000);
    if (this.modernMode) {
      t.setStroke('#03302a', 3);
      t.setShadow(0, 0, '#5bffd4', 8, true, true);
    }
    this.tweens.add({
      targets: t,
      y: t.y - 12,
      alpha: 0,
      duration: 800,
      onComplete: () => t.destroy(),
    });
  }

  private onPlayerHit(_obj: Phaser.Physics.Arcade.Image): void {
    if (this.time.now < this.invulnUntil) return;
    this.spawnExplosion(this.player.x, this.player.y);
    if (this.modernMode) {
      this.pulseFlash(0xff9d9d, 0.12, 150);
      this.spawnShockwave(this.player.x, this.player.y, 0xff9d9d, 0.14, 0.64, 300);
      this.spawnHitSparks(this.player.x, this.player.y, 0xffa8a8, 5);
    }
    this.cameras.main.shake(200, 0.01 * this.playerShakeScale);
    synth.play('playerExplode');
    this.lives -= 1;
    if (this.lives <= 0) {
      this.scene.start('GameOverScene', {
        score: this.score,
        eraReached: this.era.label,
        loop: this.loop,
        session: this.session,
        durationMs: Date.now() - this.runStartedAt,
      });
      return;
    }
    this.invulnUntil = this.time.now + RESPAWN_INVULN_MS;
  }

  // ---------- Misc helpers ----------

  private addScore(n: number): void {
    this.score += n;
    while (this.score >= this.nextExtraLifeAt && this.nextExtraLifeAt <= 960000) {
      this.lives += 1;
      synth.play('1up');
      this.nextExtraLifeAt =
        this.nextExtraLifeAt === FIRST_EXTRA_LIFE
          ? FIRST_EXTRA_LIFE + EXTRA_LIFE_INTERVAL
          : this.nextExtraLifeAt + EXTRA_LIFE_INTERVAL;
      const t = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, '1UP', {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#55ff55',
        })
        .setOrigin(0.5)
        .setDepth(1500);
      this.tweens.add({
        targets: t,
        y: t.y - 20,
        alpha: 0,
        duration: 1000,
        onComplete: () => t.destroy(),
      });
    }
  }

  private wrapInPlayfield(obj: Phaser.GameObjects.Image, margin: number): void {
    if (obj.x < -margin) obj.x += GAME_WIDTH + margin * 2;
    if (obj.x > GAME_WIDTH + margin) obj.x -= GAME_WIDTH + margin * 2;
    if (obj.y < -margin) obj.y += GAME_HEIGHT + margin * 2;
    if (obj.y > GAME_HEIGHT + margin) obj.y -= GAME_HEIGHT + margin * 2;
  }

  private spawnExplosion(x: number, y: number): void {
    if (this.modernMode) {
      const glow = this.add
        .image(x, y, 'fxGlow')
        .setDepth(68)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(this.explosionBloomTint)
        .setAlpha(0.5)
        .setScale(0.18);
      this.tweens.add({
        targets: glow,
        alpha: 0,
        scale: 0.52,
        duration: this.explosionBloomMs,
        onComplete: () => glow.destroy(),
      });
    }
    const baseExplosionKey = this.modernMode ? 'modernExplosion' : 'explosion';
    const sprite = this.add.image(x, y, `${baseExplosionKey}0`).setDepth(70);
    let frame = 0;
    const ev = this.time.addEvent({
      delay: 60,
      repeat: 3,
      callback: () => {
        frame++;
        if (frame >= 4) {
          sprite.destroy();
          ev.remove(false);
          return;
        }
        sprite.setTexture(`${baseExplosionKey}${frame}`);
      },
    });
  }

  private createModernBackdrop(): void {
    const sky = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x17345a, 0.24)
      .setDepth(-120);
    const vignette = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050a14, 0.35)
      .setDepth(-118)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.modernBackdrop.push(sky, vignette);

    for (let i = 0; i < 3; i++) {
      const band = this.add
        .rectangle(
          Phaser.Math.Between(0, GAME_WIDTH),
          Phaser.Math.Between(0, GAME_HEIGHT),
          GAME_WIDTH * 1.3,
          34,
          0x57b7ff,
          0.065,
        )
        .setDepth(-117)
        .setAngle(-20 + i * 10)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: band,
        x: band.x + Phaser.Math.Between(-120, 120),
        y: band.y + Phaser.Math.Between(-40, 40),
        alpha: { from: 0.02, to: 0.11 },
        duration: 3400 + i * 450,
        yoyo: true,
        repeat: -1,
      });
      this.modernLightBands.push(band);
    }

    for (let i = 0; i < 3; i++) {
      const nebula = this.add
        .ellipse(
          Phaser.Math.Between(20, GAME_WIDTH - 20),
          Phaser.Math.Between(10, GAME_HEIGHT - 10),
          Phaser.Math.Between(90, 150),
          Phaser.Math.Between(46, 82),
          i % 2 === 0 ? 0x6dc9ff : 0x4f8dff,
          0.14,
        )
        .setDepth(-119)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: nebula,
        x: nebula.x + Phaser.Math.Between(-16, 16),
        y: nebula.y + Phaser.Math.Between(-10, 10),
        alpha: { from: 0.08, to: 0.2 },
        duration: 2600 + i * 400,
        yoyo: true,
        repeat: -1,
      });
      this.modernNebula.push(nebula);
    }

    for (let i = 0; i < 34; i++) {
      const mote = this.add
        .image(
          Phaser.Math.Between(-10, GAME_WIDTH + 10),
          Phaser.Math.Between(-10, GAME_HEIGHT + 10),
          'fxGlow',
        )
        .setDepth(-90)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.03 + Math.random() * 0.03)
        .setAlpha(0.04 + Math.random() * 0.07);
      mote.setData('parallax', Phaser.Math.FloatBetween(0.12, 0.42));
      mote.setData('twinkle', Phaser.Math.FloatBetween(0, Math.PI * 2));
      mote.setData('drift', Phaser.Math.FloatBetween(2, 7));
      this.modernMotes.push(mote);
    }
  }

  private createSpeedLines(): void {
    for (let i = 0; i < 20; i++) {
      const line = this.add
        .rectangle(
          Phaser.Math.Between(0, GAME_WIDTH),
          Phaser.Math.Between(0, GAME_HEIGHT),
          Phaser.Math.Between(24, 60),
          Phaser.Math.Between(1, 2),
          0xdcf6ff,
          Phaser.Math.FloatBetween(0.04, 0.14),
        )
        .setDepth(-80)
        .setBlendMode(Phaser.BlendModes.ADD);
      line.setData('drift', Phaser.Math.FloatBetween(12, 28));
      line.setData('phase', Phaser.Math.FloatBetween(0, Math.PI * 2));
      line.rotation = Phaser.Math.FloatBetween(-0.08, 0.08);
      this.speedLines.push(line);
    }
  }

  private createModernGradeOverlays(): void {
    this.modernGradeMultiply = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0c1320, 0)
      .setDepth(280)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setScrollFactor(0);
    this.modernGradeAdd = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x6ec6ff, 0)
      .setDepth(281)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScrollFactor(0);
    this.modernGradeTint = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x88d8ff, 0)
      .setDepth(282)
      .setScrollFactor(0);
  }

  private createCinematicBars(): void {
    const barHeight = 20;
    this.cinematicBarTop = this.add
      .rectangle(GAME_WIDTH / 2, barHeight / 2, GAME_WIDTH, barHeight, 0x05070d, 0)
      .setDepth(2400)
      .setScrollFactor(0);
    this.cinematicBarBottom = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT - barHeight / 2, GAME_WIDTH, barHeight, 0x05070d, 0)
      .setDepth(2400)
      .setScrollFactor(0);
  }

  private setBossCinematicMode(active: boolean): void {
    if (!this.modernMode) return;
    const alpha = active ? 0.72 : 0.18;
    if (this.cinematicBarTop) {
      this.tweens.add({ targets: this.cinematicBarTop, alpha, duration: active ? 420 : 300 });
    }
    if (this.cinematicBarBottom) {
      this.tweens.add({ targets: this.cinematicBarBottom, alpha, duration: active ? 420 : 300 });
    }
    this.tweens.add({
      targets: this.cameras.main,
      zoom: active ? this.bossZoom : 1,
      duration: active ? 460 : 320,
      ease: active ? 'Cubic.easeOut' : 'Quad.easeInOut',
    });
  }

  private applyModernCameraProfile(eraIndex: number): void {
    const p = this.modernCameraProfile(eraIndex);
    this.hitShakeScale = p.hitShakeScale;
    this.motherShakeScale = p.motherShakeScale;
    this.playerShakeScale = p.playerShakeScale;
    this.bossZoom = p.bossZoom;
  }

  private modernCameraProfile(eraIndex: number): ModernCameraProfile {
    switch (eraIndex) {
      case 0:
        return { hitShakeScale: 0.9, motherShakeScale: 0.95, playerShakeScale: 0.9, bossZoom: 1.02 };
      case 1:
        return { hitShakeScale: 1.0, motherShakeScale: 1.0, playerShakeScale: 0.98, bossZoom: 1.023 };
      case 2:
        return { hitShakeScale: 1.06, motherShakeScale: 1.08, playerShakeScale: 1.03, bossZoom: 1.026 };
      case 3:
        return { hitShakeScale: 1.14, motherShakeScale: 1.16, playerShakeScale: 1.1, bossZoom: 1.03 };
      default:
        return { hitShakeScale: 1.22, motherShakeScale: 1.28, playerShakeScale: 1.16, bossZoom: 1.036 };
    }
  }

  private applyModernGrade(eraIndex: number): void {
    const g = this.modernGradeForEra(eraIndex);
    this.gradeAddBaseAlpha = g.addAlpha;
    this.gradePulseAmplitude = g.pulseAmplitude;

    if (this.modernGradeMultiply) {
      this.modernGradeMultiply.setFillStyle(g.multiplyColor, g.multiplyAlpha);
      this.tweens.add({
        targets: this.modernGradeMultiply,
        alpha: g.multiplyAlpha,
        duration: 500,
      });
    }
    if (this.modernGradeAdd) {
      this.modernGradeAdd.setFillStyle(g.addColor, g.addAlpha);
      this.tweens.add({
        targets: this.modernGradeAdd,
        alpha: g.addAlpha,
        duration: 500,
      });
    }
    if (this.modernGradeTint) {
      this.modernGradeTint.setFillStyle(g.tintColor, g.tintAlpha);
      this.tweens.add({
        targets: this.modernGradeTint,
        alpha: g.tintAlpha,
        duration: 500,
      });
    }
  }

  private modernGradeForEra(eraIndex: number): ModernGrade {
    switch (eraIndex) {
      case 0:
        return {
          multiplyColor: 0x1b1f26,
          multiplyAlpha: 0.08,
          addColor: 0xffd9a6,
          addAlpha: 0.042,
          tintColor: 0xd9f0ff,
          tintAlpha: 0.02,
          pulseAmplitude: 0.008,
        };
      case 1:
        return {
          multiplyColor: 0x121c29,
          multiplyAlpha: 0.085,
          addColor: 0x7fd3ff,
          addAlpha: 0.055,
          tintColor: 0x8fd7ff,
          tintAlpha: 0.024,
          pulseAmplitude: 0.011,
        };
      case 2:
        return {
          multiplyColor: 0x18251d,
          multiplyAlpha: 0.095,
          addColor: 0xa4ffb8,
          addAlpha: 0.05,
          tintColor: 0x8fcfa0,
          tintAlpha: 0.022,
          pulseAmplitude: 0.012,
        };
      case 3:
        return {
          multiplyColor: 0x111a30,
          multiplyAlpha: 0.11,
          addColor: 0x9ab9ff,
          addAlpha: 0.056,
          tintColor: 0x93a4ff,
          tintAlpha: 0.024,
          pulseAmplitude: 0.013,
        };
      default:
        return {
          multiplyColor: 0x0b1024,
          multiplyAlpha: 0.13,
          addColor: 0x7ed8ff,
          addAlpha: 0.07,
          tintColor: 0x89a8ff,
          tintAlpha: 0.03,
          pulseAmplitude: 0.015,
        };
    }
  }

  private updateSpeedLines(dt: number): void {
    for (const l of this.speedLines) {
      const speed = l.getData('drift') as number;
      const phase = l.getData('phase') as number;
      // Cinematic wind streaks: gentle constant movement, independent of ship rotation.
      l.y += speed * dt;
      l.x += Math.sin(this.time.now / 1000 + phase) * dt * 5;
      if (l.y > GAME_HEIGHT + 16) {
        l.y = -16;
        l.x = Phaser.Math.Between(-8, GAME_WIDTH + 8);
      }
      if (l.x < -24) l.x = GAME_WIDTH + 24;
      if (l.x > GAME_WIDTH + 24) l.x = -24;
    }
  }

  private applyModernSmoothing(): void {
    this.cameras.main.roundPixels = false;
    const keys = [
      'player',
      'enemy1910',
      'enemy1940',
      'enemy1970',
      'enemy1982',
      'enemy2001',
      'mother1910',
      'mother1940',
      'mother1970',
      'mother1982',
      'mother2001',
      'bullet',
      'enemyBullet',
      'cloud',
      'pilot',
      'fxGlow',
      'modernCloud',
      'modernPilot',
      'modernExplosion0',
      'modernExplosion1',
      'modernExplosion2',
      'modernExplosion3',
    ];
    for (const key of keys) {
      const tex = this.textures.get(key);
      if (tex) tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
  }

  private createGlowTexture(key: string, hexColor: string, size: number): void {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const g = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.15, hexColor);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    this.textures.addCanvas(key, canvas);
  }

  private createRingTexture(key: string, hexColor: string, size: number): void {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = size / 2;
    const cy = size / 2;
    const outer = size * 0.43;
    const inner = size * 0.3;

    const gradient = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
    gradient.addColorStop(0, 'rgba(255,255,255,0.92)');
    gradient.addColorStop(0.35, hexColor);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = size * 0.08;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.36, 0, Math.PI * 2);
    ctx.stroke();

    this.textures.addCanvas(key, canvas);
  }

  private spawnShockwave(
    x: number,
    y: number,
    tint: number,
    startScale: number,
    endScale: number,
    duration: number,
  ): void {
    if (!this.modernMode) return;
    const ring = this.add
      .image(x, y, 'fxRing')
      .setDepth(67)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(tint)
      .setScale(startScale)
      .setAlpha(0.45);
    this.tweens.add({
      targets: ring,
      scale: endScale,
      alpha: 0,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private spawnHitSparks(x: number, y: number, tint: number, count: number): void {
    if (!this.modernMode) return;
    for (let i = 0; i < count; i++) {
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(10, 26);
      const spark = this.add
        .image(x, y, 'fxGlow')
        .setDepth(69)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(tint)
        .setScale(0.05 + Math.random() * 0.03)
        .setAlpha(0.32);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(a) * dist,
        y: y + Math.sin(a) * dist,
        alpha: 0,
        scale: spark.scale * 1.8,
        duration: 170 + i * 24,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  private updateModernMotes(dt: number, vx: number, vy: number, now: number): void {
    for (const m of this.modernMotes) {
      const p = m.getData('parallax') as number;
      const tw = m.getData('twinkle') as number;
      const drift = m.getData('drift') as number;
      m.x += vx * p * dt * 0.4 + Math.sin(now / 1300 + tw) * dt * drift;
      m.y += vy * p * dt * 0.4 + Math.cos(now / 1600 + tw) * dt * (drift * 0.6);
      this.wrapInPlayfield(m, 12);
      m.alpha = 0.035 + (Math.sin(now / 480 + tw) * 0.5 + 0.5) * 0.09;
    }
  }

  private spawnContrail(): void {
    const tx = this.player.x - Math.cos(this.playerAngle) * 10;
    const ty = this.player.y - Math.sin(this.playerAngle) * 10;
    const p = this.add
      .image(tx, ty, 'fxGlow')
      .setDepth(35)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(this.engineTrailTint)
      .setAlpha(0.18)
      .setScale(0.14 + Math.random() * 0.06);
    this.tweens.add({
      targets: p,
      alpha: 0,
      scale: p.scale * 1.9,
      duration: 260,
      onComplete: () => p.destroy(),
    });
  }

  private pulseFlash(color: number, alpha: number, duration: number): void {
    if (!this.cinematicFlash) return;
    this.cinematicFlash.setFillStyle(color, alpha);
    this.tweens.add({
      targets: this.cinematicFlash,
      alpha: 0,
      duration,
      ease: 'Quad.easeOut',
    });
  }

  private spawnDebris(x: number, y: number, tint: number): void {
    for (let i = 0; i < 4; i++) {
      const d = this.add
        .image(x, y, 'fxGlow')
        .setDepth(66)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(tint)
        .setAlpha(0.26)
        .setScale(0.08 + Math.random() * 0.05);
      const tx = x + Phaser.Math.Between(-18, 18);
      const ty = y + Phaser.Math.Between(-18, 18);
      this.tweens.add({
        targets: d,
        x: tx,
        y: ty,
        alpha: 0,
        scale: d.scale * 1.8,
        duration: 180 + i * 35,
        onComplete: () => d.destroy(),
      });
    }
  }

  private modernEnemyKey(eraIndex: number): string {
    switch (eraIndex) {
      case 0:
        return 'modernEnemy1910';
      case 1:
        return 'modernEnemy1940';
      case 2:
        return 'modernEnemy1970';
      case 3:
        return 'modernEnemy1982';
      default:
        return 'modernEnemy2001';
    }
  }

  private modernTrailTint(eraIndex: number): number {
    switch (eraIndex) {
      case 0:
        return 0x9fe7ff;
      case 1:
        return 0x8cf6ff;
      case 2:
        return 0xb8ffba;
      case 3:
        return 0xb4c8ff;
      default:
        return 0x9eeeff;
    }
  }

  private modernMoteTint(eraIndex: number): number {
    switch (eraIndex) {
      case 0:
        return 0xffe6c4;
      case 1:
        return 0xbfe8ff;
      case 2:
        return 0xd7ffd4;
      case 3:
        return 0xd5dcff;
      default:
        return 0x9fd8ff;
    }
  }

  private modernPlayerShotTint(eraIndex: number): number {
    switch (eraIndex) {
      case 0:
        return 0xc8f7ff;
      case 1:
        return 0x8ff7ff;
      case 2:
        return 0xc8ffb8;
      case 3:
        return 0xc4d4ff;
      default:
        return 0xa4f8ff;
    }
  }

  private modernEnemyShotTint(eraIndex: number): number {
    switch (eraIndex) {
      case 0:
        return 0xffb489;
      case 1:
        return 0xff9fa2;
      case 2:
        return 0xffba90;
      case 3:
        return 0xff8f98;
      default:
        return 0xffb5ff;
    }
  }

  private modernMuzzleFlashTint(eraIndex: number): number {
    switch (eraIndex) {
      case 0:
        return 0xc6f0ff;
      case 1:
        return 0x95f6ff;
      case 2:
        return 0xa7ffcc;
      case 3:
        return 0xb8c8ff;
      default:
        return 0x99eeff;
    }
  }

  private modernHitFlashTint(eraIndex: number): number {
    switch (eraIndex) {
      case 0:
        return 0xc4e8ff;
      case 1:
        return 0x8ed9ff;
      case 2:
        return 0xa9ffc4;
      case 3:
        return 0x9db6ff;
      default:
        return 0x88e8ff;
    }
  }

  private modernDebrisTint(eraIndex: number): number {
    switch (eraIndex) {
      case 0:
        return 0xcde9ff;
      case 1:
        return 0xa3daff;
      case 2:
        return 0xb8ffc6;
      case 3:
        return 0xb6c2ff;
      default:
        return 0x98f5ff;
    }
  }

  private modernMotherHitTint(eraIndex: number): number {
    switch (eraIndex) {
      case 0:
        return 0xffd6a8;
      case 1:
        return 0xffb89a;
      case 2:
        return 0xffc6a6;
      case 3:
        return 0xffa6b6;
      default:
        return 0xd1b6ff;
    }
  }

  private modernExplosionTint(eraIndex: number): number {
    switch (eraIndex) {
      case 0:
        return 0xffddb0;
      case 1:
        return 0xffc48f;
      case 2:
        return 0xffd39f;
      case 3:
        return 0xffb8a8;
      default:
        return 0xbbe8ff;
    }
  }

  private modernMuzzleFlashMs(eraIndex: number): number {
    switch (eraIndex) {
      case 0:
        return 78;
      case 1:
        return 74;
      case 2:
        return 70;
      case 3:
        return 66;
      default:
        return 62;
    }
  }

  private modernHitFlashMs(eraIndex: number): number {
    switch (eraIndex) {
      case 0:
        return 78;
      case 1:
        return 72;
      case 2:
        return 68;
      case 3:
        return 64;
      default:
        return 60;
    }
  }

  private modernMotherHitFlashMs(eraIndex: number): number {
    switch (eraIndex) {
      case 0:
        return 100;
      case 1:
        return 94;
      case 2:
        return 90;
      case 3:
        return 86;
      default:
        return 82;
    }
  }

  private modernExplosionBloomMs(eraIndex: number): number {
    switch (eraIndex) {
      case 0:
        return 240;
      case 1:
        return 220;
      case 2:
        return 205;
      case 3:
        return 190;
      default:
        return 175;
    }
  }

  private modernMotherKey(eraIndex: number): string {
    switch (eraIndex) {
      case 0:
        return 'modernMother1910';
      case 1:
        return 'modernMother1940';
      case 2:
        return 'modernMother1970';
      case 3:
        return 'modernMother1982';
      default:
        return 'modernMother2001';
    }
  }

  private enableModernMode(): void {
    // If already in modern mode, do nothing.
    if (this.modernMode) return;
    
    // Enable modern mode and save to localStorage.
    setGraphicsMode('modern');
    
    // Reload the page to apply the new graphics mode.
    location.reload();
  }
}
