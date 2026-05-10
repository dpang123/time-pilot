import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { angleToFrame } from '../gfx/pixelArt';
import { shouldShowTouchControls } from '../config/screen';
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

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Reset run state.
    this.eraIndex = 0;
    this.loop = 0;
    this.score = 0;
    this.lives = STARTING_LIVES;
    this.invulnUntil = 0;
    this.lastFireAt = 0;
    this.playerAngle = -Math.PI / 2;
    this.nextExtraLifeAt = FIRST_EXTRA_LIFE;

    // Build clouds (re-tinted per era).
    this.clouds = [];
    for (let i = 0; i < 14; i++) {
      const c = this.add.image(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, GAME_HEIGHT),
        'cloud',
      );
      const depth = Phaser.Math.FloatBetween(0.3, 1.0);
      c.setScale(depth);
      c.setAlpha(0.5 + depth * 0.3);
      c.setData('parallax', depth);
      this.clouds.push(c);
    }

    // Player jet — locked at screen centre with 8-frame heading sheet.
    this.player = this.physics.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'player', 0);
    this.player.setCollideWorldBounds(false).setDepth(50);
    (this.player.body as Phaser.Physics.Arcade.Body).setCircle(8, 0, 0);
    this.player.setFrame(angleToFrame(this.playerAngle));

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

    // Input.
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.fireKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    if (shouldShowTouchControls()) {
      this.touch = createVirtualControls(this);
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.touch?.destroy();
      this.spawnTimer?.remove(false);
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
    this.mothershipSpawned = false;
    this.mothershipDefeated = false;
    this.transitioning = false;

    // Apply era look.
    this.cameras.main.setBackgroundColor(this.era.skyColor);
    for (const c of this.clouds) c.setTint(this.era.cloudTint);

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
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#ffff66',
      })
      .setOrigin(0.5)
      .setDepth(1500);
    this.tweens.add({
      targets: banner,
      alpha: { from: 1, to: 0 },
      duration: 1800,
      onComplete: () => banner.destroy(),
    });
    synth.play('eraStart');
  }

  private advanceEra(): void {
    this.transitioning = true;
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
    this.player.setFrame(angleToFrame(this.playerAngle));

    // World scroll velocity (opposite of player heading).
    const vx = -Math.cos(this.playerAngle) * PLAYER_SPEED;
    const vy = -Math.sin(this.playerAngle) * PLAYER_SPEED;

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
      e.setFrame(angleToFrame(angleToPlayer));
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
    if (this.mothership && this.mothership.active) {
      const m = this.mothership;
      m.x += (m.cruiseVx + vx) * dt;
      m.y += (m.cruiseVy + vy) * dt;
      // Bounce gently off opposite edge to keep it on-screen for a while.
      if (m.x < -m.width / 2 || m.x > GAME_WIDTH + m.width / 2) m.cruiseVx *= -1;
      if (m.y < -m.height / 2 || m.y > GAME_HEIGHT + m.height / 2) m.cruiseVy *= -1;
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
    const e = this.enemies.create(x, y, this.era.enemyKey, 0) as EnemySprite;
    e.setActive(true).setVisible(true).setDepth(40);
    (e.body as Phaser.Physics.Arcade.Body).setCircle(7, 0, 0);
    e.spawnAt = this.time.now;
    e.lastShotAt = this.time.now;
  }

  private spawnMothership(): void {
    this.mothershipSpawned = true;
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

    // Spawn the mothership from the top moving down-right.
    const m = this.physics.add.image(GAME_WIDTH / 2, -32, this.era.motherKey) as MothershipSprite;
    m.hp = this.era.motherHp;
    m.cruiseVx = this.era.motherSpeed * (Math.random() < 0.5 ? -1 : 1);
    m.cruiseVy = this.era.motherSpeed * 0.3;
    m.lastShotAt = this.time.now + 600;
    m.setDepth(45);
    (m.body as Phaser.Physics.Arcade.Body).setCircle(Math.min(m.width, m.height) / 2 - 2, 2, 2);
    this.mothership = m;

    this.physics.add.overlap(this.bullets, m, (b) => this.onBulletHitMother(b as Bullet));
    this.physics.add.overlap(this.player, m, () => this.onPlayerHit(m));
  }

  private spawnPilot(x: number, y: number): void {
    const p = this.pilots.create(x, y, 'pilot') as Pilot;
    p.setActive(true).setVisible(true).setDepth(30);
    (p.body as Phaser.Physics.Arcade.Body).setCircle(5, 0, 0);
    p.bornAt = this.time.now;
  }

  private fireBullet(): void {
    const b = this.bullets.get(this.player.x, this.player.y, 'bullet') as Bullet | null;
    if (!b) return;
    b.setActive(true).setVisible(true).setDepth(60);
    if (!b.body) this.physics.add.existing(b);
    const body = b.body as Phaser.Physics.Arcade.Body;
    body.reset(this.player.x, this.player.y);
    body.setVelocity(
      Math.cos(this.playerAngle) * BULLET_SPEED,
      Math.sin(this.playerAngle) * BULLET_SPEED,
    );
    b.bornAt = this.time.now;
  }

  private fireEnemyShot(x: number, y: number, angle: number): void {
    const b = this.enemyBullets.get(x, y, 'enemyBullet') as Bullet | null;
    if (!b) return;
    b.setActive(true).setVisible(true).setDepth(55);
    if (!b.body) this.physics.add.existing(b);
    const body = b.body as Phaser.Physics.Arcade.Body;
    body.reset(x, y);
    body.setVelocity(Math.cos(angle) * ENEMY_BULLET_SPEED, Math.sin(angle) * ENEMY_BULLET_SPEED);
    b.bornAt = this.time.now;
    synth.play('enemyFire');
  }

  // ---------- Hit handlers ----------

  private onBulletHitEnemy(b: Bullet, e: EnemySprite): void {
    const ex = e.x;
    const ey = e.y;
    this.spawnExplosion(ex, ey);
    e.destroy();
    b.destroy();
    this.addScore(SCORE_ENEMY);
    this.kills += 1;
    this.cameras.main.shake(80, 0.003);
    synth.play('enemyExplode');
    if (Math.random() < PILOT_SPAWN_CHANCE) {
      this.spawnPilot(ex, ey);
    }
  }

  private onBulletHitMother(b: Bullet): void {
    if (!this.mothership || !this.mothership.active) return;
    b.destroy();
    this.spawnExplosion(
      this.mothership.x + Phaser.Math.Between(-this.mothership.width / 3, this.mothership.width / 3),
      this.mothership.y + Phaser.Math.Between(-this.mothership.height / 3, this.mothership.height / 3),
    );
    this.mothership.hp -= 1;
    this.cameras.main.shake(60, 0.002);
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
      this.cameras.main.shake(500, 0.015);
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
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#55ff55',
      })
      .setOrigin(0.5)
      .setDepth(1000);
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
    this.cameras.main.shake(200, 0.01);
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
    const sprite = this.add.image(x, y, 'explosion0').setDepth(70);
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
        sprite.setTexture(`explosion${frame}`);
      },
    });
  }
}
