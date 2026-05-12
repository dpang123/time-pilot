import Phaser from 'phaser';

function createCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): void {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  draw(ctx);
  if (scene.textures.exists(key)) {
    scene.textures.remove(key);
  }
  scene.textures.addCanvas(key, canvas);
}

function drawJet(
  scene: Phaser.Scene,
  key: string,
  body: number,
  wing: number,
  canopy: number,
  accent: number,
): void {
  createCanvasTexture(scene, key, 64, 64, (ctx) => {
    const bodyHex = `#${body.toString(16).padStart(6, '0')}`;
    const wingHex = `#${wing.toString(16).padStart(6, '0')}`;
    const canopyHex = `#${canopy.toString(16).padStart(6, '0')}`;
    const accentHex = `#${accent.toString(16).padStart(6, '0')}`;

    const hull = ctx.createLinearGradient(32, 8, 32, 56);
    hull.addColorStop(0, '#ffffff');
    hull.addColorStop(0.2, bodyHex);
    hull.addColorStop(1, '#273548');

    const wings = ctx.createLinearGradient(10, 30, 54, 30);
    wings.addColorStop(0, '#c9def5');
    wings.addColorStop(0.5, wingHex);
    wings.addColorStop(1, '#4a5f76');

    ctx.beginPath();
    ctx.moveTo(32, 5);
    ctx.lineTo(39, 53);
    ctx.quadraticCurveTo(32, 59, 25, 53);
    ctx.closePath();
    ctx.fillStyle = hull;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(32, 27);
    ctx.lineTo(8, 43);
    ctx.lineTo(26, 39);
    ctx.closePath();
    ctx.fillStyle = wings;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(32, 27);
    ctx.lineTo(56, 43);
    ctx.lineTo(38, 39);
    ctx.closePath();
    ctx.fillStyle = wings;
    ctx.fill();

    ctx.fillStyle = accentHex;
    ctx.fillRect(29, 48, 6, 8);

    const glass = ctx.createLinearGradient(32, 14, 32, 26);
    glass.addColorStop(0, '#eaffff');
    glass.addColorStop(0.45, canopyHex);
    glass.addColorStop(1, '#3588ad');
    ctx.beginPath();
    ctx.ellipse(32, 20, 6, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = glass;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(32, 8);
    ctx.lineTo(32, 51);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(32, 30, 18, 25, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawBiplane(scene: Phaser.Scene, key: string, body: number, wing: number, canopy: number): void {
  const bodyHex = `#${body.toString(16).padStart(6, '0')}`;
  const wingHex = `#${wing.toString(16).padStart(6, '0')}`;
  const canopyHex = `#${canopy.toString(16).padStart(6, '0')}`;
  createCanvasTexture(scene, key, 64, 64, (ctx) => {
    ctx.fillStyle = wingHex;
    ctx.fillRect(10, 12, 44, 7);
    ctx.fillRect(12, 24, 40, 7);

    const fuselage = ctx.createLinearGradient(32, 10, 32, 56);
    fuselage.addColorStop(0, '#f1d8b3');
    fuselage.addColorStop(0.45, bodyHex);
    fuselage.addColorStop(1, '#5f4125');
    ctx.fillStyle = fuselage;
    ctx.fillRect(27, 13, 10, 38);

    ctx.strokeStyle = 'rgba(40,25,10,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 19);
    ctx.lineTo(20, 24);
    ctx.moveTo(44, 19);
    ctx.lineTo(44, 24);
    ctx.stroke();

    ctx.fillStyle = canopyHex;
    ctx.beginPath();
    ctx.ellipse(32, 24, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,175,90,0.92)';
    ctx.fillRect(29, 51, 6, 7);
  });
}

function drawHelicopter(scene: Phaser.Scene, key: string, body: number, canopy: number): void {
  const bodyHex = `#${body.toString(16).padStart(6, '0')}`;
  const canopyHex = `#${canopy.toString(16).padStart(6, '0')}`;
  createCanvasTexture(scene, key, 64, 64, (ctx) => {
    ctx.fillStyle = 'rgba(220,228,235,0.9)';
    ctx.fillRect(8, 10, 48, 4);

    const shell = ctx.createLinearGradient(32, 16, 32, 50);
    shell.addColorStop(0, '#c8e7d0');
    shell.addColorStop(0.5, bodyHex);
    shell.addColorStop(1, '#20422a');
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.roundRect(18, 16, 28, 28, 10);
    ctx.fill();

    const glass = ctx.createLinearGradient(32, 18, 32, 30);
    glass.addColorStop(0, '#efffff');
    glass.addColorStop(0.5, canopyHex);
    glass.addColorStop(1, '#4b7fa8');
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.ellipse(32, 24, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1d2b37';
    ctx.fillRect(18, 31, 28, 3);
    ctx.fillStyle = bodyHex;
    ctx.fillRect(30, 43, 4, 13);
  });
}

function drawSaucer(scene: Phaser.Scene, key: string, rim: number, dome: number, glow: number): void {
  const rimHex = `#${rim.toString(16).padStart(6, '0')}`;
  const domeHex = `#${dome.toString(16).padStart(6, '0')}`;
  const glowHex = `#${glow.toString(16).padStart(6, '0')}`;
  createCanvasTexture(scene, key, 64, 64, (ctx) => {
    const rimGradient = ctx.createLinearGradient(32, 22, 32, 40);
    rimGradient.addColorStop(0, '#ffffff');
    rimGradient.addColorStop(0.4, rimHex);
    rimGradient.addColorStop(1, '#4b596d');
    ctx.fillStyle = rimGradient;
    ctx.beginPath();
    ctx.ellipse(32, 36, 24, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    const domeGradient = ctx.createRadialGradient(32, 24, 3, 32, 25, 13);
    domeGradient.addColorStop(0, '#f2ffff');
    domeGradient.addColorStop(1, domeHex);
    ctx.fillStyle = domeGradient;
    ctx.beginPath();
    ctx.ellipse(32, 28, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = glowHex;
    ctx.globalAlpha = 0.34;
    ctx.beginPath();
    ctx.ellipse(32, 41, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(32, 36, 24, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawMotherJet(scene: Phaser.Scene, key: string, body: number, wing: number, canopy: number): void {
  const bodyHex = `#${body.toString(16).padStart(6, '0')}`;
  const wingHex = `#${wing.toString(16).padStart(6, '0')}`;
  const canopyHex = `#${canopy.toString(16).padStart(6, '0')}`;
  createCanvasTexture(scene, key, 84, 84, (ctx) => {
    const hull = ctx.createLinearGradient(42, 8, 42, 73);
    hull.addColorStop(0, '#ffffff');
    hull.addColorStop(0.18, bodyHex);
    hull.addColorStop(1, '#223446');
    ctx.fillStyle = hull;
    ctx.beginPath();
    ctx.moveTo(42, 6);
    ctx.lineTo(54, 72);
    ctx.quadraticCurveTo(42, 80, 30, 72);
    ctx.closePath();
    ctx.fill();

    const wingGrad = ctx.createLinearGradient(12, 44, 72, 44);
    wingGrad.addColorStop(0, '#d6e4f1');
    wingGrad.addColorStop(0.5, wingHex);
    wingGrad.addColorStop(1, '#44536a');
    ctx.fillStyle = wingGrad;
    ctx.beginPath();
    ctx.moveTo(42, 35);
    ctx.lineTo(9, 62);
    ctx.lineTo(31, 57);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(42, 35);
    ctx.lineTo(75, 62);
    ctx.lineTo(53, 57);
    ctx.closePath();
    ctx.fill();

    const glass = ctx.createLinearGradient(42, 16, 42, 33);
    glass.addColorStop(0, '#eeffff');
    glass.addColorStop(0.45, canopyHex);
    glass.addColorStop(1, '#2e7aa1');
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.ellipse(42, 25, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,176,106,0.95)';
    ctx.fillRect(37, 68, 10, 10);
  });
}

function drawMotherSaucer(scene: Phaser.Scene, key: string): void {
  createCanvasTexture(scene, key, 84, 84, (ctx) => {
    const rim = ctx.createLinearGradient(42, 30, 42, 58);
    rim.addColorStop(0, '#f7fbff');
    rim.addColorStop(0.4, '#c6d1df');
    rim.addColorStop(1, '#586479');
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.ellipse(42, 46, 32, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    const dome = ctx.createRadialGradient(42, 30, 3, 42, 31, 18);
    dome.addColorStop(0, '#f0ffff');
    dome.addColorStop(1, '#63e8ff');
    ctx.fillStyle = dome;
    ctx.beginPath();
    ctx.ellipse(42, 35, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(130,242,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(42, 52, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawBullet(scene: Phaser.Scene, key: string, color: number): void {
  const g = scene.make.graphics();
  g.fillStyle(color, 1);
  g.fillCircle(4, 4, 3);
  g.fillStyle(0xffffff, 0.8);
  g.fillCircle(4, 4, 1);
  g.generateTexture(key, 8, 8);
  g.destroy();
}

function drawCloud(scene: Phaser.Scene, key: string): void {
  createCanvasTexture(scene, key, 84, 52, (ctx) => {
    const puff = ctx.createRadialGradient(42, 23, 8, 42, 24, 30);
    puff.addColorStop(0, 'rgba(255,255,255,0.95)');
    puff.addColorStop(1, 'rgba(188,214,240,0)');
    ctx.fillStyle = puff;
    ctx.beginPath();
    ctx.ellipse(42, 26, 34, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.beginPath();
    ctx.ellipse(30, 21, 19, 12, 0, 0, Math.PI * 2);
    ctx.ellipse(50, 20, 17, 11, 0, 0, Math.PI * 2);
    ctx.ellipse(22, 27, 14, 9, 0, 0, Math.PI * 2);
    ctx.ellipse(44, 29, 25, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(173,208,235,0.34)';
    ctx.beginPath();
    ctx.ellipse(42, 35, 28, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPilot(scene: Phaser.Scene, key: string): void {
  createCanvasTexture(scene, key, 30, 42, (ctx) => {
    ctx.fillStyle = 'rgba(141,255,207,0.96)';
    ctx.beginPath();
    ctx.ellipse(15, 10, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(154,230,255,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, 15);
    ctx.lineTo(12, 24);
    ctx.moveTo(20, 15);
    ctx.lineTo(18, 24);
    ctx.stroke();

    ctx.fillStyle = '#f2d0a0';
    ctx.beginPath();
    ctx.arc(15, 25, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4a6078';
    ctx.fillRect(12, 29, 6, 8);
  });
}

function drawExplosionFrame(scene: Phaser.Scene, key: string, frame: number): void {
  const g = scene.make.graphics();
  const coreRadius = 4 + frame * 3;
  const ringRadius = 7 + frame * 4;
  const smokeRadius = 10 + frame * 4;

  g.fillStyle(0xffffff, 0.7 - frame * 0.12);
  g.fillCircle(20, 20, coreRadius);

  g.fillStyle(0xffc067, 0.75 - frame * 0.1);
  g.fillCircle(20, 20, ringRadius);

  g.fillStyle(0xff7f53, 0.45 - frame * 0.08);
  g.fillCircle(20, 20, smokeRadius);

  g.fillStyle(0xb1ddff, 0.2 - frame * 0.03);
  g.fillCircle(20, 20, smokeRadius + 4);

  g.generateTexture(key, 40, 40);
  g.destroy();
}

export function registerModernSprites(scene: Phaser.Scene): void {
  drawJet(scene, 'modernPlayer', 0xe6f2ff, 0x7ea6ce, 0x8cf4ff, 0xff9f4f);
  drawBiplane(scene, 'modernEnemy1910', 0xb98953, 0xdfc28f, 0x9fe3ff);
  drawJet(scene, 'modernEnemy1940', 0xd5dde8, 0x7f8ea1, 0x8acfff, 0xffb457);
  drawHelicopter(scene, 'modernEnemy1970', 0x5f8d61, 0xb8e7ff);
  drawJet(scene, 'modernEnemy1982', 0xc2c9d6, 0x6a7280, 0x9ce8ff, 0xff8f67);
  drawSaucer(scene, 'modernEnemy2001', 0xc3ccd8, 0x66edff, 0x9efcff);

  drawMotherJet(scene, 'modernMother1910', 0xcaa173, 0x886549, 0x9be8ff);
  drawMotherJet(scene, 'modernMother1940', 0xd8e0ea, 0x7d8898, 0x9ed6ff);
  drawMotherJet(scene, 'modernMother1970', 0x5b8f63, 0x2f5636, 0x9edcff);
  drawMotherJet(scene, 'modernMother1982', 0xd2d9e3, 0x768294, 0x9ce8ff);
  drawMotherSaucer(scene, 'modernMother2001');

  drawBullet(scene, 'modernBullet', 0x89f8ff);
  drawBullet(scene, 'modernEnemyBullet', 0xff9a9a);
  drawCloud(scene, 'modernCloud');
  drawPilot(scene, 'modernPilot');
  for (let i = 0; i < 4; i++) {
    drawExplosionFrame(scene, `modernExplosion${i}`, i);
  }

  const linearKeys = [
    'modernPlayer',
    'modernEnemy1910',
    'modernEnemy1940',
    'modernEnemy1970',
    'modernEnemy1982',
    'modernEnemy2001',
    'modernMother1910',
    'modernMother1940',
    'modernMother1970',
    'modernMother1982',
    'modernMother2001',
    'modernBullet',
    'modernEnemyBullet',
    'modernCloud',
    'modernPilot',
    'modernExplosion0',
    'modernExplosion1',
    'modernExplosion2',
    'modernExplosion3',
  ];
  for (const key of linearKeys) {
    scene.textures.get(key)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
}
