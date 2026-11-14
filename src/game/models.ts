import * as THREE from 'three';
import { OutfitConfig, PowerupType } from './types';
import { ProceduralTextureSet } from './textures';

export interface RunnerRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  jetpackGroup: THREE.Group;
  leftFlame: THREE.Mesh;
  rightFlame: THREE.Mesh;
  shadow: THREE.Mesh;
}

export interface PoliceRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  shadow: THREE.Mesh;
}

export interface PupRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  tail: THREE.Mesh;
  legs: THREE.Group[];
  shadow: THREE.Mesh;
}

function makeMat(
  color: number,
  roughness = 0.6,
  metalness = 0.08,
  emissive = 0x000000,
  emissiveIntensity = 0,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive,
    emissiveIntensity,
  });
}

export function createRunnerModel(
  outfit: OutfitConfig,
  shadowTex: THREE.Texture,
): RunnerRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const hoodieMat = makeMat(outfit.hoodieColor, 0.72, 0.04);
  const teeMat = makeMat(outfit.teeColor, 0.78, 0.02);
  const pantsMat = makeMat(outfit.pantsColor, 0.82, 0.03);
  const skinMat = makeMat(outfit.skinColor, 0.65, 0.02);
  const hairMat = makeMat(outfit.hairColor, 0.75, 0.05);
  const capMat1 = makeMat(outfit.capPrimary, 0.62, 0.06);
  const capMat2 = makeMat(outfit.capSecondary, 0.62, 0.06);
  const shoeMat = makeMat(outfit.shoeColor, 0.45, 0.12);
  const soleMat = makeMat(0xffffff, 0.55, 0.05);
  const packMat = makeMat(outfit.backpackColor, 0.58, 0.12);
  const eyeWhite = makeMat(0xffffff, 0.25, 0.05);
  const eyePupil = makeMat(0x0f172a, 0.15, 0.1);

  // Torso (Hoodie + white tee hem + collar)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.36), hoodieMat);
  torso.position.y = 1.14;
  torso.castShadow = true;
  bodyPivot.add(torso);

  const teeHem = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.12, 0.38), teeMat);
  teeHem.position.y = 0.76;
  teeHem.castShadow = true;
  bodyPivot.add(teeHem);

  const hoodCollar = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.065, 8, 16), hoodieMat);
  hoodCollar.rotation.x = Math.PI / 2;
  hoodCollar.position.set(0, 1.48, 0.04);
  bodyPivot.add(hoodCollar);

  // Backpack (worn on back +Z side, since runner faces -Z!)
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.54, 0.22), packMat);
  backpack.position.set(0, 1.15, 0.26);
  backpack.castShadow = true;
  bodyPivot.add(backpack);

  // Head group
  const head = new THREE.Group();
  head.position.set(0, 1.72, 0);
  bodyPivot.add(head);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 14), skinMat);
  headMesh.castShadow = true;
  head.add(headMesh);

  // Cute expressive eyes facing forward (-Z)
  [-0.085, 0.085].forEach((ex) => {
    const ew = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), eyeWhite);
    ew.position.set(ex, 0.02, -0.22);
    head.add(ew);
    const ep = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), eyePupil);
    ep.position.set(ex, 0.02, -0.258);
    head.add(ep);
  });

  // Hair fringe peeking out under backwards cap
  const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.12), hairMat);
  fringe.position.set(0, 0.11, -0.21);
  head.add(fringe);

  // Backwards Baseball Cap (crown + rear brim over backpack!)
  const capCrown = new THREE.Mesh(
    new THREE.SphereGeometry(0.262, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    capMat1,
  );
  capCrown.position.y = 0.04;
  capCrown.castShadow = true;
  head.add(capCrown);

  const capFrontPanel = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.13, 0.06), capMat2);
  capFrontPanel.position.set(0, 0.14, -0.21);
  head.add(capFrontPanel);

  // Backwards visor facing +Z
  const capBrim = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.035, 0.24), capMat1);
  capBrim.position.set(0, 0.07, 0.27);
  capBrim.rotation.x = 0.18;
  capBrim.castShadow = true;
  head.add(capBrim);

  // Arms
  const buildArm = (side: number) => {
    const armGroup = new THREE.Group();
    armGroup.position.set(side * 0.4, 1.4, 0);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.34, 6, 10), hoodieMat);
    sleeve.position.y = -0.22;
    sleeve.castShadow = true;
    armGroup.add(sleeve);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 10), skinMat);
    hand.position.y = -0.46;
    armGroup.add(hand);
    bodyPivot.add(armGroup);
    return armGroup;
  };
  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // Legs + Sneakers
  const buildLeg = (side: number) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.17, 0.72, 0);
    const legMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.42, 6, 10), pantsMat);
    legMesh.position.y = -0.3;
    legMesh.castShadow = true;
    legGroup.add(legMesh);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.36), shoeMat);
    shoe.position.set(0, -0.62, -0.05);
    shoe.castShadow = true;
    legGroup.add(shoe);

    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.05, 0.38), soleMat);
    sole.position.set(0, -0.69, -0.05);
    legGroup.add(sole);

    bodyPivot.add(legGroup);
    return legGroup;
  };
  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  // 3D Twin-Thruster Jetpack (visible when flying!)
  const jetpackGroup = new THREE.Group();
  jetpackGroup.position.set(0, 1.15, 0.34);
  jetpackGroup.visible = false;

  const tankMat = makeMat(0xe2e8f0, 0.25, 0.85);
  const coneMat = makeMat(0xef4444, 0.35, 0.25);
  const nozzleMat = makeMat(0x334155, 0.4, 0.8);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0xff9f1c,
    transparent: true,
    opacity: 0.92,
  });

  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.12), nozzleMat);
  jetpackGroup.add(bridge);

  const makeThruster = (x: number) => {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.56, 12), tankMat);
    tank.position.set(x, 0, 0);
    jetpackGroup.add(tank);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.115, 0.18, 12), coneMat);
    nose.position.set(x, 0.36, 0);
    jetpackGroup.add(nose);

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.1, 12), nozzleMat);
    nozzle.position.set(x, -0.32, 0);
    jetpackGroup.add(nozzle);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.58, 10), flameMat);
    flame.rotation.x = Math.PI;
    flame.position.set(x, -0.64, 0);
    jetpackGroup.add(flame);
    return flame;
  };
  const leftFlame = makeThruster(-0.16);
  const rightFlame = makeThruster(0.16);
  bodyPivot.add(jetpackGroup);

  // Contact shadow disc
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.15),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;
  root.add(shadow);

  return {
    root,
    bodyPivot,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    jetpackGroup,
    leftFlame,
    rightFlame,
    shadow,
  };
}

export function createPoliceModel(shadowTex: THREE.Texture): PoliceRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const shirtMat = makeMat(0x1e3a8a, 0.72, 0.08);
  const pantsMat = makeMat(0x0f172a, 0.78, 0.06);
  const beltMat = makeMat(0x1e293b, 0.45, 0.25);
  const goldMat = makeMat(0xfacc15, 0.22, 0.85);
  const skinMat = makeMat(0xf0b892, 0.65, 0.02);
  const visorMat = makeMat(0x090d16, 0.12, 0.6);
  const stacheMat = makeMat(0x475569, 0.8, 0.05);

  // Broad officer torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.82, 0.44), shirtMat);
  torso.position.y = 1.22;
  torso.castShadow = true;
  bodyPivot.add(torso);

  // Utility belt & gold buckle
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.11, 0.46), beltMat);
  belt.position.y = 0.86;
  bodyPivot.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.05), goldMat);
  buckle.position.set(0, 0.86, -0.24);
  bodyPivot.add(buckle);

  // Chest badge
  const badge = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), goldMat);
  badge.position.set(-0.2, 1.38, -0.23);
  bodyPivot.add(badge);

  // Head + peaked officer cap + shades
  const head = new THREE.Group();
  head.position.set(0, 1.82, 0);
  bodyPivot.add(head);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 12), skinMat);
  headMesh.castShadow = true;
  head.add(headMesh);

  const shades = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.1), visorMat);
  shades.position.set(0, 0.04, -0.23);
  head.add(shades);

  const stache = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.06), stacheMat);
  stache.position.set(0, -0.07, -0.25);
  head.add(stache);

  const capBase = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.25, 0.14, 14), pantsMat);
  capBase.position.y = 0.2;
  head.add(capBase);

  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.27, 0.08, 14), shirtMat);
  capTop.position.y = 0.29;
  head.add(capTop);

  const capVisor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.2), visorMat);
  capVisor.position.set(0, 0.14, -0.26);
  capVisor.rotation.x = 0.15;
  head.add(capVisor);

  const capEmblem = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), goldMat);
  capEmblem.position.set(0, 0.23, -0.26);
  head.add(capEmblem);

  // Arms (right arm holds glowing flashlight!)
  const makeArm = (side: number, withFlashlight: boolean) => {
    const g = new THREE.Group();
    g.position.set(side * 0.48, 1.5, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.36, 6, 10), shirtMat);
    arm.position.y = -0.22;
    arm.castShadow = true;
    g.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), skinMat);
    hand.position.y = -0.46;
    g.add(hand);

    if (withFlashlight) {
      const torch = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.28, 10), beltMat);
      torch.rotation.x = Math.PI / 2;
      torch.position.set(0, -0.48, -0.14);
      g.add(torch);
      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.056, 0.056, 0.03, 10),
        makeMat(0xfef08a, 0.2, 0.1, 0xfef08a, 1.5),
      );
      lens.rotation.x = Math.PI / 2;
      lens.position.set(0, -0.48, -0.29);
      g.add(lens);
    }

    bodyPivot.add(g);
    return g;
  };
  const leftArm = makeArm(-1, false);
  const rightArm = makeArm(1, true);

  // Legs
  const makeLeg = (side: number) => {
    const g = new THREE.Group();
    g.position.set(side * 0.2, 0.78, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.44, 6, 10), pantsMat);
    leg.position.y = -0.32;
    leg.castShadow = true;
    g.add(leg);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.36), visorMat);
    boot.position.set(0, -0.66, -0.05);
    g.add(boot);
    bodyPivot.add(g);
    return g;
  };
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 1.3),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;
  root.add(shadow);

  return { root, bodyPivot, leftArm, rightArm, leftLeg, rightLeg, shadow };
}

export function createPupModel(shadowTex: THREE.Texture): PupRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const furMat = makeMat(0xc2783e, 0.85, 0.02);
  const bellyMat = makeMat(0xf3d5b5, 0.85, 0.02);
  const earMat = makeMat(0x7c4620, 0.85, 0.02);
  const collarMat = makeMat(0xef4444, 0.45, 0.15);
  const noseMat = makeMat(0x111827, 0.25, 0.1);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.56), furMat);
  body.position.y = 0.34;
  body.castShadow = true;
  bodyPivot.add(body);

  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.12), collarMat);
  collar.position.set(0, 0.4, -0.22);
  bodyPivot.add(collar);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.28), furMat);
  head.position.set(0, 0.52, -0.32);
  head.castShadow = true;
  bodyPivot.add(head);

  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.14), bellyMat);
  snout.position.set(0, 0.47, -0.49);
  bodyPivot.add(snout);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), noseMat);
  nose.position.set(0, 0.51, -0.56);
  bodyPivot.add(nose);

  [-0.16, 0.16].forEach((ex) => {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.1), earMat);
    ear.position.set(ex, 0.53, -0.3);
    ear.rotation.z = ex < 0 ? 0.2 : -0.2;
    bodyPivot.add(ear);
  });

  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.22, 4, 8), furMat);
  tail.position.set(0, 0.48, 0.32);
  tail.rotation.x = 0.65;
  bodyPivot.add(tail);

  const legs: THREE.Group[] = [];
  const legPositions: [number, number][] = [
    [-0.11, -0.18],
    [0.11, -0.18],
    [-0.11, 0.18],
    [0.11, 0.18],
  ];
  legPositions.forEach(([lx, lz]) => {
    const lg = new THREE.Group();
    lg.position.set(lx, 0.24, lz);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.24, 8), furMat);
    mesh.position.y = -0.12;
    mesh.castShadow = true;
    lg.add(mesh);
    bodyPivot.add(lg);
    legs.push(lg);
  });

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.85),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;
  root.add(shadow);

  return { root, bodyPivot, tail, legs, shadow };
}

export function createTrainCar(
  variant: 0 | 1 | 2,
  hasRamp: boolean,
  textures: ProceduralTextureSet,
): THREE.Group {
  const group = new THREE.Group();
  const length = 14.2;
  const width = 2.62;
  const height = 3.25;

  const sideTex =
    variant === 0
      ? textures.trainSilverBlue
      : variant === 1
        ? textures.trainYellowTeal
        : textures.trainCrimsonWhite;

  const roofHex = variant === 0 ? 0x94a3b8 : variant === 1 ? 0xd97706 : 0x991b1b;
  const frontHex = variant === 0 ? 0x1e40af : variant === 1 ? 0x0f766e : 0xb91c1c;

  const sideMat = new THREE.MeshStandardMaterial({
    map: sideTex,
    roughness: 0.38,
    metalness: 0.35,
  });
  const roofMat = makeMat(roofHex, 0.52, 0.3);
  const frontMat = makeMat(frontHex, 0.38, 0.25);
  const glassMat = makeMat(0x0f172a, 0.12, 0.65);
  const steelMat = makeMat(0x334155, 0.4, 0.78);
  const headlightMat = makeMat(0xfef9c3, 0.15, 0.1, 0xfef08a, 1.8);

  // Main car hull with textured sides
  const sidePanels = new THREE.Mesh(new THREE.BoxGeometry(width, height - 0.3, length), sideMat);
  sidePanels.position.y = height / 2 + 0.25;
  sidePanels.castShadow = true;
  sidePanels.receiveShadow = true;
  group.add(sidePanels);

  // Chamfered roof cap (runnable surface!)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(width - 0.18, 0.28, length - 0.2), roofMat);
  roof.position.y = height + 0.18;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  // Roof AC pods
  [-4.2, 0, 4.2].forEach((rz) => {
    const ac = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 1.8), steelMat);
    ac.position.set(0, height + 0.38, rz);
    group.add(ac);
  });

  // Front cab mask (+Z faces toward the approaching player!)
  const frontMask = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, height - 0.4, 0.26), frontMat);
  frontMask.position.set(0, height / 2 + 0.25, length / 2);
  group.add(frontMask);

  // Front windshield
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(width - 0.45, 1.05, 0.3), glassMat);
  windshield.position.set(0, 2.35, length / 2 + 0.04);
  group.add(windshield);

  // Glowing LED destination board above windshield
  const destSign = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.26, 0.3),
    makeMat(0xfacc15, 0.2, 0.1, 0xfacc15, 1.1),
  );
  destSign.position.set(0, 3.05, length / 2 + 0.04);
  group.add(destSign);

  // Dual glowing headlights
  [-0.82, 0.82].forEach((hx) => {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.14, 12), headlightMat);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(hx, 1.05, length / 2 + 0.12);
    group.add(hl);
  });

  // Undercarriage bogies & steel wheels
  [-4.8, 4.8].forEach((bz) => {
    const bogie = new THREE.Mesh(new THREE.BoxGeometry(width - 0.3, 0.42, 2.4), steelMat);
    bogie.position.set(0, 0.28, bz);
    group.add(bogie);
  });

  // Optional walkable front ramp (allows running onto train roof!)
  if (hasRamp) {
    const rampLen = 4.6;
    const rampGroup = new THREE.Group();
    const rampMat = new THREE.MeshStandardMaterial({
      map: textures.barrierHazard,
      roughness: 0.65,
      metalness: 0.15,
    });
    const rampSlope = new THREE.Mesh(new THREE.BoxGeometry(width - 0.1, 0.28, rampLen), rampMat);
    const angle = Math.atan2(height + 0.2, rampLen - 0.3);
    rampSlope.rotation.x = angle;
    rampSlope.position.set(0, (height + 0.2) / 2, length / 2 + rampLen / 2 - 0.15);
    rampSlope.castShadow = true;
    rampSlope.receiveShadow = true;
    rampGroup.add(rampSlope);

    // Side safety rails on ramp
    [-1.22, 1.22].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, rampLen), frontMat);
      rail.rotation.x = angle;
      rail.position.set(rx, (height + 0.2) / 2 + 0.12, length / 2 + rampLen / 2 - 0.15);
      rampGroup.add(rail);
    });

    group.add(rampGroup);
  }

  return group;
}

export type BarrierKind = 'low' | 'high' | 'tall';

export function createBarrierModel(kind: BarrierKind, textures: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  const postMat = makeMat(0x334155, 0.45, 0.65);
  const stripeMat = new THREE.MeshStandardMaterial({
    map: textures.barrierRedWhite,
    roughness: 0.55,
    metalness: 0.1,
  });
  const hazardMat = new THREE.MeshStandardMaterial({
    map: textures.barrierHazard,
    roughness: 0.5,
    metalness: 0.15,
  });

  if (kind === 'low') {
    // Jump-over subway sawhorse barrier (height ~1.1)
    [-1.05, 1.05].forEach((px) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.15, 0.22), postMat);
      post.position.set(px, 0.575, 0);
      post.castShadow = true;
      group.add(post);
    });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.48, 0.18), stripeMat);
    beam.position.set(0, 0.85, 0);
    beam.castShadow = true;
    group.add(beam);
  } else if (kind === 'high') {
    // Duck/roll-under overhead sign gate (bottom clearance ~1.25m, top ~2.7m)
    [-1.18, 1.18].forEach((px) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.8, 10), postMat);
      post.position.set(px, 1.4, 0);
      post.castShadow = true;
      group.add(post);
    });
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.15, 0.22), hazardMat);
    signBoard.position.set(0, 2.15, 0);
    signBoard.castShadow = true;
    group.add(signBoard);
  } else {
    // Full solid double-stacked barrier (must switch lanes!)
    [-1.15, 1.15].forEach((px) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.35, 0.24), postMat);
      post.position.set(px, 1.175, 0);
      post.castShadow = true;
      group.add(post);
    });
    const lowerBeam = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.85, 0.22), stripeMat);
    lowerBeam.position.set(0, 0.65, 0);
    lowerBeam.castShadow = true;
    group.add(lowerBeam);

    const upperBeam = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.72, 0.22), hazardMat);
    upperBeam.position.set(0, 1.75, 0);
    upperBeam.castShadow = true;
    group.add(upperBeam);
  }

  return group;
}

export function createCoinMesh(sharedGeo?: THREE.CylinderGeometry, sharedMat?: THREE.MeshStandardMaterial): THREE.Mesh {
  const geo = sharedGeo ?? new THREE.CylinderGeometry(0.42, 0.42, 0.12, 16);
  const mat =
    sharedMat ??
    new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.22,
      metalness: 0.88,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.22,
    });
  const coin = new THREE.Mesh(geo, mat);
  coin.rotation.x = Math.PI / 2;
  coin.castShadow = true;
  return coin;
}

export function createPowerupModel(type: PowerupType): THREE.Group {
  const group = new THREE.Group();

  if (type === 'jetpack') {
    const tankMat = makeMat(0xe2e8f0, 0.2, 0.88);
    const capMat = makeMat(0xef4444, 0.3, 0.25, 0xef4444, 0.3);
    const ringMat = makeMat(0xf97316, 0.25, 0.2, 0xf97316, 0.9);

    [-0.18, 0.18].forEach((x) => {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.62, 12), tankMat);
      tank.position.set(x, 0, 0);
      group.add(tank);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.22, 12), capMat);
      cone.position.set(x, 0.42, 0);
      group.add(cone);
    });
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.045, 8, 24), ringMat);
    halo.rotation.x = Math.PI / 2;
    group.add(halo);
  } else if (type === 'magnet') {
    const redMat = makeMat(0xef4444, 0.35, 0.4, 0xef4444, 0.25);
    const tipMat = makeMat(0xe2e8f0, 0.2, 0.9);
    const uShape = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.1, 10, 20, Math.PI), redMat);
    uShape.rotation.z = Math.PI;
    uShape.position.y = 0.08;
    group.add(uShape);

    [-0.32, 0.32].forEach((x) => {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 10), tipMat);
      tip.position.set(x, 0.18, 0);
      group.add(tip);
    });
  } else {
    // 2x Multiplier Star Emblem
    const goldMat = makeMat(0x38bdf8, 0.22, 0.65, 0x0ea5e9, 0.65);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), goldMat);
    group.add(gem);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.045, 8, 24),
      makeMat(0xfacc15, 0.25, 0.8, 0xfacc15, 0.4),
    );
    group.add(ring);
  }

  return group;
}
