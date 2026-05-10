import Phaser from 'phaser';

/**
 * Virtual on-screen controls for touch devices: a draggable analog joystick
 * (left thumb) and a fire button (right thumb).
 *
 * The joystick reports an angle and a magnitude (0..1). The game treats
 * magnitude > a small dead-zone as "rotate toward this angle" so it feels
 * analog despite the underlying rendering being 8-direction pre-rendered.
 *
 * Rendered with Phaser Graphics into UI-layer game objects with high depth
 * and a fixed scroll factor so they sit on top of the playfield.
 */

export interface VirtualControls {
  /** Latest joystick heading in radians (0 = right, like Math.atan2). */
  angle: number;
  /** Joystick deflection 0..1; below ~0.15 should be treated as neutral. */
  magnitude: number;
  /** True while the fire button is pressed. */
  firing: boolean;
  /** Remove the controls from the scene. */
  destroy(): void;
}

const STICK_RADIUS = 28;
const KNOB_RADIUS = 12;
const FIRE_RADIUS = 22;
const DEAD_ZONE = 0.15;

export function createVirtualControls(scene: Phaser.Scene): VirtualControls {
  const w = scene.scale.gameSize.width;
  const h = scene.scale.gameSize.height;

  // Anchor positions: bottom-left for stick, bottom-right for fire.
  const stickX = STICK_RADIUS + 14;
  const stickY = h - STICK_RADIUS - 14;
  const fireX = w - FIRE_RADIUS - 14;
  const fireY = h - FIRE_RADIUS - 14;

  const state: VirtualControls = {
    angle: 0,
    magnitude: 0,
    firing: false,
    destroy: () => {
      stickBase.destroy();
      knob.destroy();
      stickHit.destroy();
      fireBase.destroy();
      fireHit.destroy();
    },
  };

  // ---- Joystick base + knob (drawn) ----
  const stickBase = scene.add.graphics().setScrollFactor(0).setDepth(2000);
  stickBase.lineStyle(2, 0xffffff, 0.5);
  stickBase.fillStyle(0x000000, 0.35);
  stickBase.fillCircle(stickX, stickY, STICK_RADIUS);
  stickBase.strokeCircle(stickX, stickY, STICK_RADIUS);

  const knob = scene.add.graphics().setScrollFactor(0).setDepth(2001);
  const drawKnob = (kx: number, ky: number) => {
    knob.clear();
    knob.fillStyle(0xffffff, 0.85);
    knob.fillCircle(kx, ky, KNOB_RADIUS);
    knob.lineStyle(1, 0x000000, 0.6);
    knob.strokeCircle(kx, ky, KNOB_RADIUS);
  };
  drawKnob(stickX, stickY);

  // Invisible larger hit zone around the stick (~2× radius) so big thumbs land easily.
  const stickHit = scene.add
    .zone(stickX, stickY, STICK_RADIUS * 3, STICK_RADIUS * 3)
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(2002)
    .setInteractive();

  let stickPointerId: number | null = null;

  const updateFromPointer = (px: number, py: number) => {
    let dx = px - stickX;
    let dy = py - stickY;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, STICK_RADIUS);
    if (dist > 0) {
      dx = (dx / dist) * clamped;
      dy = (dy / dist) * clamped;
    }
    drawKnob(stickX + dx, stickY + dy);
    state.magnitude = clamped / STICK_RADIUS;
    if (state.magnitude > DEAD_ZONE) {
      state.angle = Math.atan2(dy, dx);
    }
  };

  stickHit.on('pointerdown', (p: Phaser.Input.Pointer) => {
    stickPointerId = p.id;
    updateFromPointer(p.x, p.y);
  });
  scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
    if (p.id === stickPointerId) updateFromPointer(p.x, p.y);
  });
  const releaseStick = (p: Phaser.Input.Pointer) => {
    if (p.id !== stickPointerId) return;
    stickPointerId = null;
    state.magnitude = 0;
    drawKnob(stickX, stickY);
  };
  scene.input.on('pointerup', releaseStick);
  scene.input.on('pointerupoutside', releaseStick);

  // ---- Fire button ----
  const fireBase = scene.add.graphics().setScrollFactor(0).setDepth(2000);
  const drawFire = (pressed: boolean) => {
    fireBase.clear();
    fireBase.fillStyle(pressed ? 0xff5555 : 0xcc2222, 0.7);
    fireBase.fillCircle(fireX, fireY, FIRE_RADIUS);
    fireBase.lineStyle(2, 0xffffff, 0.7);
    fireBase.strokeCircle(fireX, fireY, FIRE_RADIUS);
  };
  drawFire(false);

  const fireHit = scene.add
    .zone(fireX, fireY, FIRE_RADIUS * 2.4, FIRE_RADIUS * 2.4)
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(2002)
    .setInteractive();

  fireHit.on('pointerdown', () => {
    state.firing = true;
    drawFire(true);
  });
  fireHit.on('pointerup', () => {
    state.firing = false;
    drawFire(false);
  });
  fireHit.on('pointerout', () => {
    state.firing = false;
    drawFire(false);
  });
  fireHit.on('pointerupoutside', () => {
    state.firing = false;
    drawFire(false);
  });

  return state;
}
