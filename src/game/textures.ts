import * as THREE from 'three';

export interface ProceduralTextureSet {
  trackBed: THREE.CanvasTexture;
  brickWall: THREE.CanvasTexture;
  barrierRedWhite: THREE.CanvasTexture;
  barrierHazard: THREE.CanvasTexture;
  trainSilverBlue: THREE.CanvasTexture;
  trainYellowTeal: THREE.CanvasTexture;
  trainCrimsonWhite: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  sparkSprite: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

function createTrainSideTexture(
  primary: string,
  stripe: string,
  accent: string,
  graffitiColorA: string,
  graffitiColorB: string,
  anisotropy: number,
): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(512, 256);

  // Base metallic/painted car body
  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, 512, 256);

  // Subtle horizontal corrugated ribbing
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let y = 16; y < 245; y += 12) {
    ctx.fillRect(0, y, 512, 3);
  }

  // Lower skirt
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 212, 512, 44);

  // Bold Subway Surfers racing stripe
  ctx.fillStyle = stripe;
  ctx.fillRect(0, 146, 512, 34);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 180, 512, 12);

  // Doors & Windows
  const doorXs = [72, 224, 376];
  doorXs.forEach((dx) => {
    // Door frame
    ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
    ctx.fillRect(dx, 42, 62, 168);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 3;
    ctx.strokeRect(dx + 2, 44, 58, 164);

    // Dual door windows
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(dx + 8, 56, 20, 68);
    ctx.fillRect(dx + 34, 56, 20, 68);
    // Specular window sheen
    ctx.fillStyle = 'rgba(186, 230, 253, 0.28)';
    ctx.fillRect(dx + 10, 58, 6, 54);
    ctx.fillRect(dx + 36, 58, 6, 54);
  });

  // Passenger windows between doors
  const winXs = [14, 152, 304, 450];
  winXs.forEach((wx) => {
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(wx, 54, 48, 62, 8);
    ctx.fill();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = 'rgba(186, 230, 253, 0.24)';
    ctx.fillRect(wx + 7, 60, 12, 46);
  });

  // Vibrant Subway graffiti tags on lower side
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = graffitiColorA;
  ctx.beginPath();
  ctx.ellipse(185, 190, 38, 16, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = graffitiColorB;
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('METRO', 146, 198);

  ctx.fillStyle = graffitiColorB;
  ctx.beginPath();
  ctx.ellipse(340, 186, 30, 14, 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('DASH', 312, 194);
  ctx.restore();

  return finalizeTexture(c, anisotropy);
}

export function createProceduralTextures(
  anisotropy: number,
  trackBedHex = '#64748B',
  wallHex = '#C2593F',
): ProceduralTextureSet {
  // 1. Track Bed (Ballast + Wooden Sleepers)
  const [trackC, trackCtx] = makeCanvas(256, 256);
  trackCtx.fillStyle = trackBedHex;
  trackCtx.fillRect(0, 0, 256, 256);

  // Subtle gravel speckles
  for (let i = 0; i < 650; i++) {
    const gx = Math.random() * 256;
    const gy = Math.random() * 256;
    const shade = Math.random() > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.18)';
    trackCtx.fillStyle = shade;
    trackCtx.fillRect(gx, gy, 3, 3);
  }

  // Wooden sleepers across each of the 3 lanes
  for (let y = 12; y < 256; y += 32) {
    trackCtx.fillStyle = '#4A2E1B';
    trackCtx.fillRect(10, y, 236, 14);
    trackCtx.fillStyle = '#6B4226';
    trackCtx.fillRect(10, y, 236, 5);
  }
  const trackBed = finalizeTexture(trackC, anisotropy, 1, 6);

  // 2. Brick Station Wall
  const [brickC, brickCtx] = makeCanvas(256, 256);
  brickCtx.fillStyle = wallHex;
  brickCtx.fillRect(0, 0, 256, 256);
  brickCtx.strokeStyle = 'rgba(0,0,0,0.22)';
  brickCtx.lineWidth = 3;
  for (let row = 0; row < 8; row++) {
    const y = row * 32;
    brickCtx.beginPath();
    brickCtx.moveTo(0, y);
    brickCtx.lineTo(256, y);
    brickCtx.stroke();
    const offset = (row % 2) * 32;
    for (let col = 0; col < 5; col++) {
      const x = col * 64 + offset;
      brickCtx.beginPath();
      brickCtx.moveTo(x, y);
      brickCtx.lineTo(x, y + 32);
      brickCtx.stroke();
    }
  }
  const brickWall = finalizeTexture(brickC, anisotropy, 4, 1);

  // 3. Red & White Subway Barrier Stripe
  const [barC, barCtx] = makeCanvas(256, 64);
  barCtx.fillStyle = '#F8FAFC';
  barCtx.fillRect(0, 0, 256, 64);
  barCtx.fillStyle = '#EF4444';
  for (let x = -64; x < 320; x += 48) {
    barCtx.beginPath();
    barCtx.moveTo(x, 64);
    barCtx.lineTo(x + 24, 64);
    barCtx.lineTo(x + 56, 0);
    barCtx.lineTo(x + 32, 0);
    barCtx.closePath();
    barCtx.fill();
  }
  const barrierRedWhite = finalizeTexture(barC, anisotropy);

  // 4. Yellow & Black Hazard Beam
  const [hazC, hazCtx] = makeCanvas(256, 64);
  hazCtx.fillStyle = '#FACC15';
  hazCtx.fillRect(0, 0, 256, 64);
  hazCtx.fillStyle = '#111827';
  for (let x = -64; x < 320; x += 48) {
    hazCtx.beginPath();
    hazCtx.moveTo(x, 64);
    hazCtx.lineTo(x + 24, 64);
    hazCtx.lineTo(x + 56, 0);
    hazCtx.lineTo(x + 32, 0);
    hazCtx.closePath();
    hazCtx.fill();
  }
  const barrierHazard = finalizeTexture(hazC, anisotropy);

  // 5. Official Subway Surfers-Style Train Liveries
  const trainSilverBlue = createTrainSideTexture('#CBD5E1', '#1D4ED8', '#FACC15', '#EF4444', '#FACC15', anisotropy);
  const trainYellowTeal = createTrainSideTexture('#FBBF24', '#0F766E', '#F8FAFC', '#38BDF8', '#FDE047', anisotropy);
  const trainCrimsonWhite = createTrainSideTexture('#DC2626', '#F8FAFC', '#FACC15', '#10B981', '#FDE047', anisotropy);

  // 6. Contact Shadow Radial Texture
  const [shadC, shadCtx] = makeCanvas(128, 128);
  const sGrad = shadCtx.createRadialGradient(64, 64, 8, 64, 64, 60);
  sGrad.addColorStop(0, 'rgba(15, 23, 42, 0.55)');
  sGrad.addColorStop(0.6, 'rgba(15, 23, 42, 0.25)');
  sGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  shadCtx.fillStyle = sGrad;
  shadCtx.fillRect(0, 0, 128, 128);
  const contactShadow = finalizeTexture(shadC, 1);

  // 7. Spark / Flame Sprite
  const [spC, spCtx] = makeCanvas(64, 64);
  const pGrad = spCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
  pGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  pGrad.addColorStop(0.45, 'rgba(255, 230, 120, 0.85)');
  pGrad.addColorStop(1, 'rgba(255, 140, 0, 0)');
  spCtx.fillStyle = pGrad;
  spCtx.fillRect(0, 0, 64, 64);
  const sparkSprite = finalizeTexture(spC, 1);

  return {
    trackBed,
    brickWall,
    barrierRedWhite,
    barrierHazard,
    trainSilverBlue,
    trainYellowTeal,
    trainCrimsonWhite,
    contactShadow,
    sparkSprite,
    dispose: () => {
      trackBed.dispose();
      brickWall.dispose();
      barrierRedWhite.dispose();
      barrierHazard.dispose();
      trainSilverBlue.dispose();
      trainYellowTeal.dispose();
      trainCrimsonWhite.dispose();
      contactShadow.dispose();
      sparkSprite.dispose();
    },
  };
}
