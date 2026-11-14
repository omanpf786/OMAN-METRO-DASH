import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SoundEngine } from './audio';
import {
  BarrierKind,
  createBarrierModel,
  createCoinMesh,
  createPoliceModel,
  createPowerupModel,
  createPupModel,
  createRunnerModel,
  createTrainCar,
  PoliceRig,
  PupRig,
  RunnerRig,
} from './models';
import { createProceduralTextures, ProceduralTextureSet } from './textures';
import {
  GamePhase,
  HudSnapshot,
  OUTFITS,
  OutfitId,
  PowerupType,
  THEMES,
  ThemeId,
  ThemePalette,
} from './types';

const LANE_X = [-3.1, 0, 3.1];
const CHUNK_LENGTH = 24;
const NUM_CHUNKS = 8;
const TRAIN_LENGTH = 14.2;
const TRAIN_ROOF_Y = 3.44;
const JETPACK_DURATION = 7.5;
const MAGNET_DURATION = 9.0;
const MULTIPLIER_DURATION = 10.0;

interface WorldChunk {
  group: THREE.Group;
  z: number;
}

interface ObstacleEntity {
  id: number;
  kind: 'train' | 'barrier';
  barrierKind?: BarrierKind;
  lane: number;
  z: number;
  length: number;
  hasRamp: boolean;
  isMoving: boolean;
  speed: number;
  hornPlayed: boolean;
  mesh: THREE.Group;
}

interface CoinEntity {
  lane: number;
  x: number;
  y: number;
  z: number;
  collected: boolean;
  mesh: THREE.Mesh;
}

interface PowerupEntity {
  type: PowerupType;
  lane: number;
  y: number;
  z: number;
  collected: boolean;
  mesh: THREE.Group;
}

interface Particle {
  mesh: THREE.Sprite;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
}

export interface EngineCallbacks {
  onLoadProgress: (pct: number, label: string) => void;
  onHudUpdate: (hud: HudSnapshot) => void;
  onPhaseChange: (phase: GamePhase) => void;
}

export class MetroDashEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  public sound: SoundEngine;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private isSoftwareGl = false;
  private textures!: ProceduralTextureSet;

  // Lighting
  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private rimLight!: THREE.DirectionalLight;

  // Actors
  private runner!: RunnerRig;
  private police!: PoliceRig;
  private pup!: PupRig;

  // World
  private chunks: WorldChunk[] = [];
  private obstacles: ObstacleEntity[] = [];
  private coins: CoinEntity[] = [];
  private powerups: PowerupEntity[] = [];
  private particles: Particle[] = [];

  // Shared coin assets
  private sharedCoinGeo!: THREE.CylinderGeometry;
  private sharedCoinMat!: THREE.MeshStandardMaterial;

  // Current customization
  private themeId: ThemeId = 'subway-classic';
  private outfitId: OutfitId = 'cyan-street';

  // Simulation state
  private phase: GamePhase = 'loading';
  private frameId = 0;
  private lastTime = 0;
  private elapsed = 0;
  private hitstopTimer = 0;
  private shakeTimer = 0;
  private shakeStrength = 0;

  // Runner physics
  private targetLane = 1;
  private runnerX = 0;
  private runnerY = 0;
  private runnerVelY = 0;
  private groundY = 0;
  private isGrounded = true;
  private isRolling = false;
  private rollTimer = 0;
  private jumpBufferTimer = 0;
  private coyoteTimer = 0;
  private baseSpeed = 19.5;
  private currentSpeed = 19.5;
  private distance = 0;
  private score = 0;
  private runCoins = 0;
  private coinStreak = 0;
  private coinStreakTimer = 0;

  // Powerups & Chase
  private jetpackTimer = 0;
  private magnetTimer = 0;
  private multiplierTimer = 0;
  private landingGraceTimer = 0;
  private headstartAvailable = true;
  private policeProximity = 0.85; // starts visible chasing right behind!
  private policeRecoverTimer = 0;
  private bustReason = '';
  private bustAnimTimer = 0;

  // Spawner cursor
  private nextSpawnZ = -34;
  private obstacleCounter = 0;
  private skyTrailNextZ = -28;
  private hudEmitAccum = 0;

  // Input swipe tracking
  private swipeStartX = 0;
  private swipeStartY = 0;
  private swipeActive = false;

  // Pre-allocated scratch helpers (zero GC in loop)
  private readonly _camTarget = new THREE.Vector3();
  private readonly _lookTarget = new THREE.Vector3();
  private readonly _coinMatGold = new THREE.Color(0xfacc15);

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.sound = new SoundEngine();

    this.initRendererAndScene();
  }

  private detectSoftwareWebGL(): boolean {
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2') || probe.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param) ?? '');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return true;
    }
  }

  private initRendererAndScene(): void {
    this.callbacks.onLoadProgress(12, 'Initializing 3D Subway Engine...');

    this.isSoftwareGl = this.detectSoftwareWebGL();
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth || window.innerWidth, this.container.clientHeight || window.innerHeight);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
    });
    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      this.lastTime = performance.now();
      this.startLoop();
    });

    this.renderer.domElement.style.touchAction = 'none';
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(58, width / height, 0.2, 220);
    this.camera.position.set(0, 4.6, 8.8);
    this.camera.lookAt(0, 1.5, -10);

    // Studio Environment Reflection (mandatory for metallic coins & trains)
    this.callbacks.onLoadProgress(32, 'Generating studio reflections...');
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 3-Point Warm/Cool Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x8a6d52, 1.0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff3d6, 2.1);
    this.sunLight.position.set(16, 28, 14);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 90;
    const d = 22;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.rimLight = new THREE.DirectionalLight(0xbae6fd, 0.7);
    this.rimLight.position.set(-10, 12, -18);
    this.scene.add(this.rimLight);

    this.callbacks.onLoadProgress(56, 'Painting subway trains & graffiti...');
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const theme = THEMES[this.themeId];
    this.textures = createProceduralTextures(maxAniso, theme.trackBedColor, theme.wallColor);

    this.sharedCoinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 16);
    this.sharedCoinMat = new THREE.MeshStandardMaterial({
      color: this._coinMatGold,
      roughness: 0.22,
      metalness: 0.88,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.22,
    });

    this.callbacks.onLoadProgress(76, 'Preparing runner, police & pup...');
    this.buildActors();
    this.rebuildWorld();
    this.applyThemeVisuals(this.themeId);

    // Pre-allocate particle pool
    for (let i = 0; i < 48; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.textures.sparkSprite,
        color: 0xfacc15,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      this.scene.add(sprite);
      this.particles.push({
        mesh: sprite,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        scale: 0.4,
      });
    }

    if (!this.isSoftwareGl) {
      try {
        this.renderer.compile(this.scene, this.camera);
      } catch {
        // fallback: shaders compile lazily on first draw if pre-compile is unsupported
      }
    }

    this.bindEvents();
    this.lastTime = performance.now();
    this.startLoop();

    // Smooth loading completion
    this.callbacks.onLoadProgress(100, 'Ready to Dash!');
    setTimeout(() => {
      if (this.phase === 'loading') {
        this.setPhase('title');
      }
    }, 550);
  }

  private buildActors(): void {
    if (this.runner) this.scene.remove(this.runner.root);
    if (this.police) this.scene.remove(this.police.root);
    if (this.pup) this.scene.remove(this.pup.root);

    this.runner = createRunnerModel(OUTFITS[this.outfitId], this.textures.contactShadow);
    this.runner.root.position.set(0, 0, 0);
    this.scene.add(this.runner.root);

    this.police = createPoliceModel(this.textures.contactShadow);
    this.police.root.position.set(-0.65, 0, 2.8);
    this.scene.add(this.police.root);

    this.pup = createPupModel(this.textures.contactShadow);
    this.pup.root.position.set(0.95, 0, 2.5);
    this.scene.add(this.pup.root);
  }

  private createEnvironmentChunk(zPos: number, theme: ThemePalette): WorldChunk {
    const group = new THREE.Group();
    group.position.z = zPos;

    // Wide ground plane extending beyond playable zone
    const groundMat = new THREE.MeshStandardMaterial({
      color: theme.isNight ? 0x0f172a : 0x576b7c,
      roughness: 0.92,
      metalness: 0.02,
    });
    const outerGround = new THREE.Mesh(new THREE.PlaneGeometry(76, CHUNK_LENGTH), groundMat);
    outerGround.rotation.x = -Math.PI / 2;
    outerGround.position.y = -0.04;
    outerGround.receiveShadow = true;
    group.add(outerGround);

    // 3 Subway Track Beds
    const trackBedMat = new THREE.MeshStandardMaterial({
      map: this.textures.trackBed,
      roughness: 0.85,
      metalness: 0.05,
    });
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.25,
      metalness: 0.88,
    });

    LANE_X.forEach((lx) => {
      const bed = new THREE.Mesh(new THREE.PlaneGeometry(2.65, CHUNK_LENGTH), trackBedMat);
      bed.rotation.x = -Math.PI / 2;
      bed.position.set(lx, 0.005, 0);
      bed.receiveShadow = true;
      group.add(bed);

      // Left & right steel rails per track
      [-0.78, 0.78].forEach((rx) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, CHUNK_LENGTH), railMat);
        rail.position.set(lx + rx, 0.04, 0);
        group.add(rail);
      });
    });

    // Side concrete station platforms (left and right)
    const platMat = new THREE.MeshStandardMaterial({
      color: theme.platformColor,
      roughness: 0.78,
      metalness: 0.06,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: theme.accentColor,
      roughness: 0.5,
      metalness: 0.15,
    });
    const wallMat = new THREE.MeshStandardMaterial({
      map: this.textures.brickWall,
      roughness: 0.82,
      metalness: 0.04,
    });

    [-1, 1].forEach((side) => {
      const px = side * 6.8;
      const plat = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.55, CHUNK_LENGTH), platMat);
      plat.position.set(px, 0.25, 0);
      plat.receiveShadow = true;
      group.add(plat);

      // Yellow safety tactile strip along platform edge
      const safetyEdge = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.57, CHUNK_LENGTH), trimMat);
      safetyEdge.position.set(side * 4.82, 0.25, 0);
      group.add(safetyEdge);

      // Brick station boundary wall
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.2, CHUNK_LENGTH), wallMat);
      wall.position.set(side * 8.9, 1.6, 0);
      wall.receiveShadow = true;
      group.add(wall);

      // City skyline buildings behind station walls
      for (let b = 0; b < 2; b++) {
        const bHeight = 9 + ((Math.abs(zPos) + b * 7 + (side > 0 ? 5 : 2)) % 14);
        const bWidth = 6.5 + (b % 2) * 2.5;
        const colorPool = theme.buildingColors;
        const bColor = colorPool[Math.floor(Math.abs(zPos / CHUNK_LENGTH + b + (side > 0 ? 2 : 0)) % colorPool.length)];
        const bMat = new THREE.MeshStandardMaterial({
          color: bColor,
          roughness: 0.75,
          metalness: 0.12,
        });
        const building = new THREE.Mesh(new THREE.BoxGeometry(bWidth, bHeight, 10.5), bMat);
        building.position.set(side * (13.8 + b * 1.4), bHeight / 2 - 0.5, -6 + b * 12);
        group.add(building);

        // Windows accent on building front
        const winMat = new THREE.MeshBasicMaterial({
          color: theme.isNight ? 0xfef08a : 0xbae6fd,
          transparent: true,
          opacity: theme.isNight ? 0.85 : 0.45,
        });
        const winStrip = new THREE.Mesh(new THREE.PlaneGeometry(0.7, bHeight * 0.72), winMat);
        winStrip.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        winStrip.position.set(side * (13.8 + b * 1.4 - (bWidth / 2 + 0.03)), bHeight * 0.48, -6 + b * 12);
        group.add(winStrip);
      }

      // Sunny leafy trees or metro lampposts along platform
      if (!theme.isNight) {
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.24, 1.8, 8),
          new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 }),
        );
        trunk.position.set(side * 7.6, 1.4, 0);
        group.add(trunk);

        const foliage = new THREE.Mesh(
          new THREE.DodecahedronGeometry(1.15, 1),
          new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.8 }),
        );
        foliage.position.set(side * 7.6, 2.75, 0);
        foliage.castShadow = true;
        group.add(foliage);
      }
    });

    // Overhead Subway Gantry Arch once per chunk
    const gantryMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.45,
      metalness: 0.65,
    });
    [-4.85, 4.85].forEach((gx) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.28, 5.6, 0.28), gantryMat);
      col.position.set(gx, 2.8, 0);
      group.add(col);
    });
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.28, 0.34), gantryMat);
    crossBeam.position.set(0, 5.55, 0);
    group.add(crossBeam);

    // Overhead glowing station lamp
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.14, 0.35),
      new THREE.MeshBasicMaterial({ color: theme.isNight ? 0x38bdf8 : 0xfef9c3 }),
    );
    lamp.position.set(0, 5.38, 0);
    group.add(lamp);

    return { group, z: zPos };
  }

  private rebuildWorld(): void {
    this.chunks.forEach((c) => this.scene.remove(c.group));
    this.chunks = [];
    const theme = THEMES[this.themeId];
    for (let i = 0; i < NUM_CHUNKS; i++) {
      const z = 12 - i * CHUNK_LENGTH;
      const chunk = this.createEnvironmentChunk(z, theme);
      this.chunks.push(chunk);
      this.scene.add(chunk.group);
    }
  }

  public setTheme(themeId: ThemeId): void {
    if (this.themeId === themeId) return;
    this.themeId = themeId;
    const theme = THEMES[themeId];

    // Regenerate track/wall textures with theme colors
    this.textures.dispose();
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso, theme.trackBedColor, theme.wallColor);

    this.rebuildWorld();
    this.applyThemeVisuals(themeId);
  }

  public setOutfit(outfitId: OutfitId): void {
    if (this.outfitId === outfitId) return;
    this.outfitId = outfitId;
    this.buildActors();
  }

  private applyThemeVisuals(themeId: ThemeId): void {
    const t = THEMES[themeId];
    this.scene.background = new THREE.Color(t.skyHorizon);
    this.scene.fog = new THREE.FogExp2(t.fogColor, t.fogDensity);

    this.sunLight.color.setHex(t.sunColor);
    this.sunLight.intensity = t.sunIntensity;
    this.hemiLight.color.setHex(t.hemiSky);
    this.hemiLight.groundColor.setHex(t.hemiGround);
    this.hemiLight.intensity = t.hemiIntensity;
  }

  private clearRunObjects(): void {
    this.obstacles.forEach((o) => this.scene.remove(o.mesh));
    this.obstacles = [];
    this.coins.forEach((c) => this.scene.remove(c.mesh));
    this.coins = [];
    this.powerups.forEach((p) => this.scene.remove(p.mesh));
    this.powerups = [];
  }

  public startNewRun(): void {
    this.sound.unlock();
    this.clearRunObjects();

    this.targetLane = 1;
    this.runnerX = 0;
    this.runnerY = 0;
    this.runnerVelY = 0;
    this.groundY = 0;
    this.isGrounded = true;
    this.isRolling = false;
    this.rollTimer = 0;
    this.jumpBufferTimer = 0;
    this.coyoteTimer = 0;

    this.baseSpeed = 20.0;
    this.currentSpeed = 20.0;
    this.distance = 0;
    this.score = 0;
    this.runCoins = 0;
    this.coinStreak = 0;
    this.coinStreakTimer = 0;

    this.jetpackTimer = 0;
    this.magnetTimer = 0;
    this.multiplierTimer = 0;
    this.landingGraceTimer = 0;
    this.headstartAvailable = true;
    this.policeProximity = 0.88; // Police & Pup start right behind, blowing whistle!
    this.policeRecoverTimer = 0;
    this.bustReason = '';
    this.bustAnimTimer = 0;
    this.hitstopTimer = 0;
    this.shakeTimer = 0;

    this.runner.root.position.set(0, 0, 0);
    this.runner.bodyPivot.rotation.set(0, 0, 0);
    this.runner.bodyPivot.scale.set(1, 1, 1);
    this.runner.jetpackGroup.visible = false;

    this.nextSpawnZ = -34;
    this.skyTrailNextZ = -26;

    // Seed initial patterns ahead
    for (let i = 0; i < 6; i++) {
      this.spawnNextPattern(i === 0);
    }

    this.setPhase('playing');
    this.sound.playPoliceWhistle();
    setTimeout(() => this.sound.playDogBark(), 160);
    this.sound.startMusic(THEMES[this.themeId].hasBirds);
    this.emitHud();
  }

  public pauseGame(): void {
    if (this.phase === 'playing') {
      this.sound.stopMusic();
      this.setPhase('paused');
    }
  }

  public resumeGame(): void {
    if (this.phase === 'paused') {
      this.sound.unlock();
      this.sound.startMusic(THEMES[this.themeId].hasBirds);
      if (this.jetpackTimer > 0) this.sound.startJetpackLoop();
      this.lastTime = performance.now();
      this.setPhase('playing');
    }
  }

  public returnToTitle(): void {
    this.sound.stopMusic();
    this.clearRunObjects();
    this.runnerX = 0;
    this.runnerY = 0;
    this.targetLane = 1;
    this.runner.root.position.set(0, 0, 0);
    this.runner.bodyPivot.rotation.set(0, 0, 0);
    this.runner.bodyPivot.scale.set(1, 1, 1);
    this.runner.jetpackGroup.visible = false;
    this.policeProximity = 0.8;
    this.setPhase('title');
  }

  public activateJetpackHeadstart(): void {
    if (this.phase !== 'playing' || !this.headstartAvailable || this.jetpackTimer > 0) return;
    this.headstartAvailable = false;
    this.triggerJetpack();
  }

  private triggerJetpack(): void {
    this.jetpackTimer = JETPACK_DURATION;
    this.isRolling = false;
    this.runnerVelY = 0;
    this.runner.jetpackGroup.visible = true;
    this.skyTrailNextZ = -26;
    this.sound.playJetpackStart();
    this.spawnBurst(this.runnerX, Math.max(this.runnerY + 1, 1.5), 0.3, 0xf97316, 14);
    this.emitHud();
  }

  private setPhase(p: GamePhase): void {
    this.phase = p;
    this.callbacks.onPhaseChange(p);
  }

  private spawnNextPattern(isFirst = false): void {
    const zBase = this.nextSpawnZ;
    const freeLane = Math.floor(Math.random() * 3);

    // Guarantee a Jetpack pickup early so players enjoy flying right away!
    if (isFirst) {
      this.spawnCoinLine(1, zBase + 10, 6, 0.75);
      this.spawnPowerup('jetpack', 1, zBase - 6, 1.0);
    }

    const patternRoll = Math.random();

    if (patternRoll < 0.36) {
      // Parked Trains with at least one walkable ramp!
      const rampLane = (freeLane + 1) % 3;
      const otherLane = (freeLane + 2) % 3;

      const variantA = (Math.floor(Math.random() * 3) as 0 | 1 | 2);
      const variantB = (Math.floor(Math.random() * 3) as 0 | 1 | 2);

      this.spawnTrain(rampLane, zBase, true, false, variantA);
      if (Math.random() < 0.65) {
        this.spawnTrain(otherLane, zBase - 2, Math.random() < 0.4, false, variantB);
      }

      // Coins along the free lane + coins on top of the ramped train roof!
      this.spawnCoinLine(freeLane, zBase + 3, 6, 0.75);
      this.spawnCoinLine(rampLane, zBase - 2, 5, TRAIN_ROOF_Y + 0.75);

      this.nextSpawnZ -= 26;
    } else if (patternRoll < 0.64) {
      // Oncoming Moving Express Train in one lane + barriers in others
      const movingLane = (freeLane + 1) % 3;
      const variant = (Math.floor(Math.random() * 3) as 0 | 1 | 2);
      this.spawnTrain(movingLane, zBase - 24, false, true, variant);

      const barrierLane = (freeLane + 2) % 3;
      const bKind: BarrierKind = Math.random() < 0.5 ? 'low' : 'high';
      this.spawnBarrier(barrierLane, zBase, bKind);

      // Jump coin arc over barrier or straight coins in free lane
      this.spawnCoinLine(freeLane, zBase + 2, 5, 0.75);
      if (bKind === 'low') {
        this.spawnCoinArc(barrierLane, zBase, 5);
      }

      this.nextSpawnZ -= 24;
    } else {
      // Multi-lane Subway Barrier Puzzle (Jump, Duck, Switch)
      for (let lane = 0; lane < 3; lane++) {
        if (lane === freeLane) {
          this.spawnCoinLine(lane, zBase + 2, 5, 0.75);
          continue;
        }
        const kinds: BarrierKind[] = ['low', 'high', 'tall'];
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        this.spawnBarrier(lane, zBase, kind);
        if (kind === 'low') this.spawnCoinArc(lane, zBase, 3);
      }
      this.nextSpawnZ -= 20;
    }

    // Powerup spawn chance
    if (!isFirst && Math.random() < 0.34) {
      const pTypes: PowerupType[] = ['jetpack', 'jetpack', 'magnet', 'multiplier'];
      const chosen = pTypes[Math.floor(Math.random() * pTypes.length)];
      this.spawnPowerup(chosen, freeLane, zBase - 11, 1.0);
    }
  }

  private spawnTrain(
    lane: number,
    z: number,
    hasRamp: boolean,
    isMoving: boolean,
    variant: 0 | 1 | 2,
  ): void {
    const mesh = createTrainCar(variant, hasRamp, this.textures);
    mesh.position.set(LANE_X[lane], 0, z);
    this.scene.add(mesh);
    this.obstacles.push({
      id: ++this.obstacleCounter,
      kind: 'train',
      lane,
      z,
      length: TRAIN_LENGTH,
      hasRamp,
      isMoving,
      speed: isMoving ? 15.5 : 0,
      hornPlayed: false,
      mesh,
    });
  }

  private spawnBarrier(lane: number, z: number, kind: BarrierKind): void {
    const mesh = createBarrierModel(kind, this.textures);
    mesh.position.set(LANE_X[lane], 0, z);
    this.scene.add(mesh);
    this.obstacles.push({
      id: ++this.obstacleCounter,
      kind: 'barrier',
      barrierKind: kind,
      lane,
      z,
      length: 0.85,
      hasRamp: false,
      isMoving: false,
      speed: 0,
      hornPlayed: true,
      mesh,
    });
  }

  private spawnCoinLine(lane: number, startZ: number, count: number, y: number): void {
    for (let i = 0; i < count; i++) {
      const cz = startZ - i * 2.1;
      const mesh = createCoinMesh(this.sharedCoinGeo, this.sharedCoinMat);
      mesh.position.set(LANE_X[lane], y, cz);
      this.scene.add(mesh);
      this.coins.push({
        lane,
        x: LANE_X[lane],
        y,
        z: cz,
        collected: false,
        mesh,
      });
    }
  }

  private spawnCoinArc(lane: number, centerZ: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const cz = centerZ + 2.2 - t * 4.4;
      const cy = 0.85 + Math.sin(t * Math.PI) * 1.75;
      const mesh = createCoinMesh(this.sharedCoinGeo, this.sharedCoinMat);
      mesh.position.set(LANE_X[lane], cy, cz);
      this.scene.add(mesh);
      this.coins.push({
        lane,
        x: LANE_X[lane],
        y: cy,
        z: cz,
        collected: false,
        mesh,
      });
    }
  }

  private spawnPowerup(type: PowerupType, lane: number, z: number, y: number): void {
    const mesh = createPowerupModel(type);
    mesh.position.set(LANE_X[lane], y, z);
    this.scene.add(mesh);
    this.powerups.push({
      type,
      lane,
      y,
      z,
      collected: false,
      mesh,
    });
  }

  private spawnBurst(x: number, y: number, z: number, colorHex: number, count: number): void {
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < count; i++) {
      const p = this.particles[i];
      if (p.life <= 0) {
        p.life = 0.45 + Math.random() * 0.25;
        p.maxLife = p.life;
        p.vx = (Math.random() - 0.5) * 6.5;
        p.vy = 1.5 + Math.random() * 5.0;
        p.vz = (Math.random() - 0.5) * 4.5;
        p.scale = 0.35 + Math.random() * 0.35;
        p.mesh.position.set(x, y, z);
        p.mesh.material.color.setHex(colorHex);
        p.mesh.material.opacity = 1;
        p.mesh.scale.set(p.scale, p.scale, 1);
        p.mesh.visible = true;
        spawned++;
      }
    }
  }

  private spawnJetpackExhaust(): void {
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (p.life <= 0) {
          p.life = 0.28 + Math.random() * 0.14;
          p.maxLife = p.life;
          p.vx = (Math.random() - 0.5) * 0.9;
          p.vy = -4.5 - Math.random() * 2.5;
          p.vz = 5.5 + Math.random() * 2.5;
          p.scale = 0.48 + Math.random() * 0.28;
          p.mesh.position.set(this.runnerX + side * 0.16, this.runnerY + 0.55, 0.36);
          p.mesh.material.color.setHex(Math.random() > 0.4 ? 0xff8c00 : 0x38bdf8);
          p.mesh.material.opacity = 0.95;
          p.mesh.scale.set(p.scale, p.scale, 1);
          p.mesh.visible = true;
          break;
        }
      }
    }
  }

  private triggerStumble(reason: string): void {
    this.hitstopTimer = 0.045;
    this.shakeTimer = 0.35;
    this.shakeStrength = 0.28;
    this.sound.playStumble();
    this.spawnBurst(this.runnerX, this.runnerY + 1.1, 0, 0xef4444, 16);

    if (this.policeProximity > 0.62) {
      this.triggerBusted(reason);
    } else {
      this.policeProximity = 0.96;
      this.policeRecoverTimer = 6.5;
    }
  }

  private triggerBusted(reason: string): void {
    this.bustReason = reason;
    this.bustAnimTimer = 0;
    this.hitstopTimer = 0.07;
    this.shakeTimer = 0.45;
    this.shakeStrength = 0.42;
    this.jetpackTimer = 0;
    this.runner.jetpackGroup.visible = false;
    this.policeProximity = 1.0;
    this.sound.playBusted();
    this.spawnBurst(this.runnerX, this.runnerY + 1.0, 0, 0xfacc15, 22);
    this.emitHud();
    this.setPhase('gameover');
  }

  // =========================================================================
  // CONTROLS (Keyboard + Touch / Pointer Swipes)
  // =========================================================================

  public moveLane(delta: -1 | 1): void {
    if (this.phase !== 'playing') return;
    const next = THREE.MathUtils.clamp(this.targetLane + delta, 0, 2);
    if (next !== this.targetLane) {
      this.targetLane = next;
      this.sound.playLaneSwitch();
    }
  }

  public jump(): void {
    if (this.phase !== 'playing') return;
    if (this.jetpackTimer > 0) return;
    this.jumpBufferTimer = 0.14;
  }

  public roll(): void {
    if (this.phase !== 'playing') return;
    if (this.jetpackTimer > 0) return;
    if (!this.isGrounded) {
      // Fast-fall slam to ground!
      this.runnerVelY = Math.min(this.runnerVelY, -28);
    }
    if (!this.isRolling) {
      this.isRolling = true;
      this.rollTimer = 0.65;
      this.sound.playRoll();
    }
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    if (this.phase === 'playing') {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        this.moveLane(-1);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        this.moveLane(1);
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        this.jump();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        this.roll();
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (this.headstartAvailable && this.distance < 85 && this.jetpackTimer <= 0) {
          this.activateJetpackHeadstart();
        } else {
          this.jump();
        }
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        this.pauseGame();
      }
    } else if (this.phase === 'paused') {
      if (e.code === 'KeyP' || e.code === 'Escape' || e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        this.resumeGame();
      }
    }
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.sound.unlock();
    if (this.phase !== 'playing') return;
    this.swipeActive = true;
    this.swipeStartX = e.clientX;
    this.swipeStartY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.swipeActive || this.phase !== 'playing') return;
    const dx = e.clientX - this.swipeStartX;
    const dy = e.clientY - this.swipeStartY;
    const thresh = 26;
    if (Math.abs(dx) > thresh || Math.abs(dy) > thresh) {
      if (Math.abs(dx) > Math.abs(dy)) {
        this.moveLane(dx > 0 ? 1 : -1);
      } else if (dy < 0) {
        this.jump();
      } else {
        this.roll();
      }
      this.swipeActive = false;
    }
  };

  private onPointerUp = (): void => {
    this.swipeActive = false;
  };

  private onWindowBlur = (): void => {
    this.swipeActive = false;
    if (this.phase === 'playing') {
      this.pauseGame();
    }
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.swipeActive = false;
      if (this.phase === 'playing') {
        this.pauseGame();
      }
    }
  };

  private onResize = (): void => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('resize', this.onResize);
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
  }

  // =========================================================================
  // MAIN SIMULATION LOOP
  // =========================================================================

  private startLoop(): void {
    const tick = () => {
      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      this.update(dt);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    try {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            this.frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            this.frameId = window.setTimeout(cb, 80);
          }
        };
        this.frameId = window.setTimeout(poll, 5);
        return;
      }
    } catch {
      // fallback
    }
    this.frameId = window.setTimeout(cb, 80);
  }

  private update(dt: number): void {
    this.elapsed += dt;

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    }

    // Update particle pool in all non-paused states
    if (this.phase !== 'paused') {
      this.updateParticles(dt);
    }

    if (this.phase === 'loading' || this.phase === 'title') {
      this.updateTitleShowcase(dt);
      return;
    }

    if (this.phase === 'gameover') {
      this.updateGameOverShowcase(dt);
      return;
    }

    if (this.phase === 'paused') {
      return;
    }

    // Hitstop freeze frame for heavy impacts
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    // --- ACTIVE GAMEPLAY UPDATE ---
    // Gradual speed ramp like Subway Surfers
    this.baseSpeed = Math.min(39, 20.0 + this.distance * 0.011);
    const flyBoost = this.jetpackTimer > 0 ? 1.45 : 1.0;
    this.currentSpeed = this.baseSpeed * flyBoost;

    const dz = this.currentSpeed * dt;
    this.distance += dz;

    // Score ticks up smoothly with speed & multiplier
    const mult = this.multiplierTimer > 0 ? 2 : 1;
    this.score += dz * 1.8 * mult;

    // Coin streak decay
    if (this.coinStreakTimer > 0) {
      this.coinStreakTimer -= dt;
      if (this.coinStreakTimer <= 0) this.coinStreak = 0;
    }

    // Powerup timers
    if (this.jetpackTimer > 0) {
      this.jetpackTimer = Math.max(0, this.jetpackTimer - dt);
      if (this.jetpackTimer === 0) {
        this.runner.jetpackGroup.visible = false;
        this.landingGraceTimer = 1.8;
        this.sound.playJetpackEnd();
      }
    }
    if (this.magnetTimer > 0) this.magnetTimer = Math.max(0, this.magnetTimer - dt);
    if (this.multiplierTimer > 0) this.multiplierTimer = Math.max(0, this.multiplierTimer - dt);
    if (this.landingGraceTimer > 0) this.landingGraceTimer = Math.max(0, this.landingGraceTimer - dt);

    // Police recovery (drops slightly further back if runner avoids stumbles)
    if (this.policeRecoverTimer > 0) {
      this.policeRecoverTimer -= dt;
    } else if (this.policeProximity > 0.24) {
      this.policeProximity = Math.max(0.24, this.policeProximity - dt * 0.12);
    }

    // Lane lateral damping
    const desiredX = LANE_X[this.targetLane];
    const prevX = this.runnerX;
    this.runnerX = THREE.MathUtils.damp(this.runnerX, desiredX, 16, dt);
    const leanAngle = THREE.MathUtils.clamp((prevX - this.runnerX) * 1.1, -0.34, 0.34);

    // Scroll endless environment chunks (+Z towards camera, recycle behind)
    for (let i = 0; i < this.chunks.length; i++) {
      const c = this.chunks[i];
      c.z += dz;
      if (c.z > CHUNK_LENGTH * 1.4) {
        c.z -= CHUNK_LENGTH * NUM_CHUNKS;
      }
      c.group.position.z = c.z;
    }

    // Advance spawner
    this.nextSpawnZ += dz;
    while (this.nextSpawnZ > -145) {
      this.spawnNextPattern(false);
    }

    // Spawn Sky Coin Trails while Jetpack Flying
    if (this.jetpackTimer > 0.6) {
      this.skyTrailNextZ += dz;
      if (this.skyTrailNextZ > -95) {
        const lane = Math.floor(Math.random() * 3);
        this.spawnCoinLine(lane, -98, 7, 6.85);
        this.skyTrailNextZ = -118;
      }
    }

    // Compute ground elevation under runner (either 0, ramp slope, or train roof!)
    this.groundY = 0;
    for (let i = 0; i < this.obstacles.length; i++) {
      const ob = this.obstacles[i];
      if (ob.kind === 'train' && Math.abs(this.runnerX - LANE_X[ob.lane]) < 1.35) {
        const frontZ = ob.z + ob.length / 2;
        const backZ = ob.z - ob.length / 2;
        if (0 <= frontZ && 0 >= backZ) {
          if (this.runnerY >= TRAIN_ROOF_Y - 0.8) {
            this.groundY = Math.max(this.groundY, TRAIN_ROOF_Y);
          }
        } else if (ob.hasRamp && 0 > frontZ && 0 <= frontZ + 4.6) {
          const rampT = 1 - (0 - frontZ) / 4.6;
          const rampY = THREE.MathUtils.clamp(rampT, 0, 1) * TRAIN_ROOF_Y;
          if (this.runnerY >= rampY - 0.9) {
            this.groundY = Math.max(this.groundY, rampY);
          }
        }
      }
    }

    // Vertical physics (Flying vs Running/Jumping)
    if (this.jetpackTimer > 0) {
      const flightAlt = 6.8 + Math.sin(this.elapsed * 5.2) * 0.22;
      this.runnerY = THREE.MathUtils.damp(this.runnerY, flightAlt, 6.5, dt);
      this.runnerVelY = 0;
      this.isGrounded = false;
      this.spawnJetpackExhaust();
    } else {
      if (this.isGrounded) {
        this.coyoteTimer = 0.09;
      } else {
        this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
      }
      if (this.jumpBufferTimer > 0) {
        this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
        if (this.coyoteTimer > 0) {
          this.runnerVelY = 14.8;
          this.isGrounded = false;
          this.coyoteTimer = 0;
          this.jumpBufferTimer = 0;
          this.isRolling = false;
          this.sound.playJump();
          this.spawnBurst(this.runnerX, this.groundY + 0.15, 0, 0xe2e8f0, 7);
        }
      }

      this.runnerVelY -= 42.0 * dt;
      this.runnerY += this.runnerVelY * dt;

      if (this.runnerY <= this.groundY) {
        if (!this.isGrounded && this.runnerVelY < -10) {
          this.spawnBurst(this.runnerX, this.groundY + 0.12, 0, 0xcbd5e1, 6);
        }
        this.runnerY = this.groundY;
        this.runnerVelY = 0;
        this.isGrounded = true;
      } else {
        this.isGrounded = false;
      }
    }

    // Roll timer
    if (this.isRolling) {
      this.rollTimer -= dt;
      if (this.rollTimer <= 0) {
        this.isRolling = false;
      }
    }

    // Animate Runner
    this.runner.root.position.set(this.runnerX, this.runnerY, 0);
    this.runner.shadow.position.y = Math.max(0.025, this.groundY - this.runnerY + 0.025);
    const shadowScale = THREE.MathUtils.clamp(1 - (this.runnerY - this.groundY) * 0.11, 0.35, 1.0);
    this.runner.shadow.scale.set(shadowScale, shadowScale, 1);

    if (this.jetpackTimer > 0) {
      // Superhero flight pose
      this.runner.bodyPivot.rotation.set(0.32, 0, leanAngle * 1.4);
      this.runner.bodyPivot.scale.set(1, 1, 1);
      this.runner.leftLeg.rotation.x = 0.25;
      this.runner.rightLeg.rotation.x = 0.45;
      this.runner.leftArm.rotation.x = -2.4;
      this.runner.rightArm.rotation.x = -2.4;
      const flicker = 0.85 + Math.sin(this.elapsed * 42) * 0.28;
      this.runner.leftFlame.scale.set(1, flicker, 1);
      this.runner.rightFlame.scale.set(1, flicker, 1);
    } else if (this.isRolling) {
      this.runner.bodyPivot.rotation.set(-0.55, 0, leanAngle);
      this.runner.bodyPivot.scale.set(1.06, 0.54, 1.06);
    } else {
      this.runner.bodyPivot.rotation.set(0.12, 0, leanAngle);
      this.runner.bodyPivot.scale.set(1, 1, 1);
      if (this.isGrounded) {
        const stride = this.elapsed * (this.currentSpeed * 0.72);
        const swing = Math.sin(stride);
        this.runner.leftLeg.rotation.x = swing * 0.92;
        this.runner.rightLeg.rotation.x = -swing * 0.92;
        this.runner.leftArm.rotation.x = -swing * 0.85;
        this.runner.rightArm.rotation.x = swing * 0.85;
        this.runner.bodyPivot.position.y = Math.abs(Math.cos(stride)) * 0.12;
      } else {
        this.runner.leftLeg.rotation.x = 0.55;
        this.runner.rightLeg.rotation.x = -0.35;
        this.runner.leftArm.rotation.x = -1.2;
        this.runner.rightArm.rotation.x = 0.6;
        this.runner.bodyPivot.position.y = 0;
      }
    }

    // Animate Chasing Police Officer & Pup right behind the runner!
    const chaseZ = THREE.MathUtils.lerp(6.4, 2.35, this.policeProximity);
    const policeX = THREE.MathUtils.damp(this.police.root.position.x, this.runnerX - 0.55, 7.5, dt);
    const pupX = THREE.MathUtils.damp(this.pup.root.position.x, this.runnerX + 0.85, 8.5, dt);
    const policeGround = this.jetpackTimer > 0 ? 0 : this.groundY * 0.5;

    this.police.root.position.set(policeX, policeGround, chaseZ);
    const pStride = this.elapsed * (this.currentSpeed * 0.68);
    const pSwing = Math.sin(pStride);
    this.police.leftLeg.rotation.x = pSwing * 0.85;
    this.police.rightLeg.rotation.x = -pSwing * 0.85;
    this.police.leftArm.rotation.x = -pSwing * 0.8;
    this.police.rightArm.rotation.x = -0.75 + pSwing * 0.25; // Flashlight raised!
    this.police.bodyPivot.position.y = Math.abs(Math.cos(pStride)) * 0.1;

    this.pup.root.position.set(pupX, policeGround, chaseZ - 0.35);
    const dogCycle = this.elapsed * (this.currentSpeed * 0.85);
    this.pup.bodyPivot.position.y = Math.abs(Math.sin(dogCycle)) * 0.18;
    this.pup.tail.rotation.z = Math.sin(this.elapsed * 22) * 0.45;
    this.pup.legs.forEach((lg, idx) => {
      lg.rotation.x = Math.sin(dogCycle + (idx < 2 ? 0 : Math.PI)) * 0.7;
    });

    // Update & collide Obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const ob = this.obstacles[i];
      ob.z += dz + (ob.isMoving ? ob.speed * dt : 0);
      ob.mesh.position.z = ob.z;

      // Play oncoming train horn once as it approaches
      if (ob.kind === 'train' && ob.isMoving && !ob.hornPlayed && ob.z > -58 && ob.z < -20) {
        ob.hornPlayed = true;
        this.sound.playTrainHorn();
      }

      if (ob.z > 24) {
        this.scene.remove(ob.mesh);
        this.obstacles.splice(i, 1);
        continue;
      }

      // Skip collision during flight or landing grace
      if (this.jetpackTimer > 0 || this.landingGraceTimer > 0) continue;

      const dx = Math.abs(this.runnerX - LANE_X[ob.lane]);
      if (dx < 1.1) {
        if (ob.kind === 'train') {
          const frontZ = ob.z + ob.length / 2;
          const backZ = ob.z - ob.length / 2;
          // Player z is 0, radius ~0.42
          if (frontZ > -0.45 && backZ < 0.45) {
            if (this.runnerY < TRAIN_ROOF_Y - 0.75) {
              // If player ran into the front face vs side-scraped while switching lanes
              if (frontZ < 1.15 && dx < 0.85) {
                this.triggerBusted('Crashed into a subway train!');
                return;
              } else {
                // Side-scrape stumble pushes back out
                this.targetLane = this.runnerX < LANE_X[ob.lane] ? Math.max(0, ob.lane - 1) : Math.min(2, ob.lane + 1);
                this.triggerStumble('Caught after scraping a train!');
                if (this.phase !== 'playing') return;
              }
            }
          }
        } else if (ob.kind === 'barrier') {
          if (Math.abs(ob.z) < 0.62) {
            if (ob.barrierKind === 'low') {
              if (this.runnerY < 0.92) {
                this.scene.remove(ob.mesh);
                this.obstacles.splice(i, 1);
                this.triggerStumble('Tripped over a subway barrier!');
                if (this.phase !== 'playing') return;
              }
            } else if (ob.barrierKind === 'high') {
              const headHeight = this.isRolling ? 0.95 : 1.85;
              if (this.runnerY + headHeight > 1.28 && this.runnerY < 2.75) {
                this.scene.remove(ob.mesh);
                this.obstacles.splice(i, 1);
                this.triggerStumble('Hit an overhead sign gate!');
                if (this.phase !== 'playing') return;
              }
            } else if (ob.barrierKind === 'tall') {
              if (this.runnerY < 2.25) {
                this.triggerBusted('Slammed into a full blockade!');
                return;
              }
            }
          }
        }
      }
    }

    // Update & collect Coins (with Magnet attraction!)
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.z += dz;
      c.mesh.rotation.z += dt * 3.8;

      if (this.magnetTimer > 0 && !c.collected && c.z > -18 && c.z < 3) {
        c.x = THREE.MathUtils.damp(c.x, this.runnerX, 14, dt);
        c.y = THREE.MathUtils.damp(c.y, this.runnerY + 1.0, 14, dt);
        c.z = THREE.MathUtils.damp(c.z, 0, 14, dt);
      }

      c.mesh.position.set(c.x, c.y, c.z);

      if (c.z > 14 || c.collected) {
        this.scene.remove(c.mesh);
        this.coins.splice(i, 1);
        continue;
      }

      const distSq =
        (c.x - this.runnerX) * (c.x - this.runnerX) +
        (c.y - (this.runnerY + 0.95)) * (c.y - (this.runnerY + 0.95)) +
        c.z * c.z;

      if (distSq < 1.55) {
        c.collected = true;
        this.runCoins += 1;
        this.score += 10 * mult;
        this.coinStreak += 1;
        this.coinStreakTimer = 0.65;
        this.sound.playCoin(this.coinStreak);
        this.spawnBurst(c.x, c.y, c.z, 0xfacc15, 6);
        this.scene.remove(c.mesh);
        this.coins.splice(i, 1);
      }
    }

    // Update & collect Powerups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.z += dz;
      p.mesh.position.set(LANE_X[p.lane], p.y + Math.sin(this.elapsed * 4.5 + i) * 0.16, p.z);
      p.mesh.rotation.y += dt * 2.6;

      if (p.z > 14 || p.collected) {
        this.scene.remove(p.mesh);
        this.powerups.splice(i, 1);
        continue;
      }

      const dx = Math.abs(LANE_X[p.lane] - this.runnerX);
      const dy = Math.abs(p.y - (this.runnerY + 0.95));
      if (dx < 1.15 && dy < 1.4 && Math.abs(p.z) < 1.2) {
        p.collected = true;
        this.scene.remove(p.mesh);
        this.powerups.splice(i, 1);

        if (p.type === 'jetpack') {
          this.triggerJetpack();
        } else if (p.type === 'magnet') {
          this.magnetTimer = MAGNET_DURATION;
          this.sound.playPowerup('magnet');
          this.spawnBurst(this.runnerX, this.runnerY + 1.1, 0, 0xef4444, 12);
        } else {
          this.multiplierTimer = MULTIPLIER_DURATION;
          this.sound.playPowerup('multiplier');
          this.spawnBurst(this.runnerX, this.runnerY + 1.1, 0, 0x38bdf8, 12);
        }
      }
    }

    // Smooth Chase Camera with Jetpack elevation & FOV rush + screen shake
    const targetFov = this.jetpackTimer > 0 ? 67 : 58 + (this.currentSpeed - 20) * 0.28;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5, dt);
    this.camera.updateProjectionMatrix();

    const shakeX = this.shakeTimer > 0 ? (Math.random() - 0.5) * this.shakeStrength * (this.shakeTimer / 0.4) : 0;
    const shakeY = this.shakeTimer > 0 ? (Math.random() - 0.5) * this.shakeStrength * (this.shakeTimer / 0.4) : 0;

    this._camTarget.set(
      this.runnerX * 0.72 + shakeX,
      this.runnerY + (this.jetpackTimer > 0 ? 3.4 : 4.55) + shakeY,
      this.jetpackTimer > 0 ? 9.8 : 8.6,
    );
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this._camTarget.x, 10, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this._camTarget.y, 7, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this._camTarget.z, 7, dt);

    this._lookTarget.set(this.runnerX * 0.5, this.runnerY + (this.jetpackTimer > 0 ? 1.5 : 1.75), -11);
    this.camera.lookAt(this._lookTarget);

    // Throttled HUD updates (~15Hz) so React never slows the 60fps loop
    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.065) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }
  }

  private updateTitleShowcase(dt: number): void {
    // Live animated Subway Yard showcase behind the Home Screen!
    const t = this.elapsed;
    const jogSpeed = 6.5;
    for (let i = 0; i < this.chunks.length; i++) {
      const c = this.chunks[i];
      c.z += jogSpeed * dt;
      if (c.z > CHUNK_LENGTH * 1.4) c.z -= CHUNK_LENGTH * NUM_CHUNKS;
      c.group.position.z = c.z;
    }

    // Runner jogging energetically in place
    const stride = t * 8.5;
    const swing = Math.sin(stride);
    this.runner.root.position.set(0, 0, 0);
    this.runner.bodyPivot.rotation.set(0.08, Math.sin(t * 0.8) * 0.14, 0);
    this.runner.bodyPivot.position.y = Math.abs(Math.cos(stride)) * 0.08;
    this.runner.leftLeg.rotation.x = swing * 0.65;
    this.runner.rightLeg.rotation.x = -swing * 0.65;
    this.runner.leftArm.rotation.x = -swing * 0.6;
    this.runner.rightArm.rotation.x = swing * 0.6;

    // Police & Pup patrolling right behind runner
    this.police.root.position.set(-1.15, 0, 2.75);
    this.police.leftLeg.rotation.x = swing * 0.55;
    this.police.rightLeg.rotation.x = -swing * 0.55;
    this.police.rightArm.rotation.x = -0.65 + Math.sin(t * 3) * 0.2;
    this.police.leftArm.rotation.x = -swing * 0.5;

    this.pup.root.position.set(1.15, 0, 2.35);
    this.pup.bodyPivot.position.y = Math.abs(Math.sin(t * 10)) * 0.12;
    this.pup.tail.rotation.z = Math.sin(t * 18) * 0.45;

    // Gentle orbital pan framing both hero and chasing police
    this.camera.position.set(Math.sin(t * 0.35) * 1.65, 2.85, 6.9);
    this.camera.lookAt(0, 1.35, -2.5);
  }

  private updateGameOverShowcase(dt: number): void {
    this.bustAnimTimer += dt;
    // Police officer steps up next to runner; pup hops excitedly
    this.police.root.position.x = THREE.MathUtils.damp(this.police.root.position.x, this.runnerX - 0.72, 8, dt);
    this.police.root.position.z = THREE.MathUtils.damp(this.police.root.position.z, 0.45, 8, dt);
    this.police.root.position.y = this.groundY;
    this.police.leftLeg.rotation.x = 0;
    this.police.rightLeg.rotation.x = 0;
    this.police.rightArm.rotation.x = -1.2;

    this.pup.root.position.x = THREE.MathUtils.damp(this.pup.root.position.x, this.runnerX + 0.85, 8, dt);
    this.pup.root.position.z = THREE.MathUtils.damp(this.pup.root.position.z, 0.35, 8, dt);
    this.pup.root.position.y = this.groundY;
    this.pup.bodyPivot.position.y = Math.abs(Math.sin(this.elapsed * 12)) * 0.22;
    this.pup.tail.rotation.z = Math.sin(this.elapsed * 24) * 0.5;

    this.runner.bodyPivot.rotation.set(-0.15, 0, 0);
    this.runner.leftArm.rotation.x = -2.1;
    this.runner.rightArm.rotation.x = -2.1;

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.runnerX + 1.8, 5, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.runnerY + 2.6, 5, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, 5.4, 5, dt);
    this.camera.lookAt(this.runnerX, this.runnerY + 1.15, 0);
  }

  private updateParticles(dt: number): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.life > 0) {
        p.life -= dt;
        if (p.life <= 0) {
          p.mesh.visible = false;
          continue;
        }
        p.vy -= 9.5 * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        const alpha = THREE.MathUtils.clamp(p.life / p.maxLife, 0, 1);
        p.mesh.material.opacity = alpha;
        const s = p.scale * (0.5 + 0.5 * alpha);
        p.mesh.scale.set(s, s, 1);
      }
    }
  }

  private emitHud(): void {
    this.callbacks.onHudUpdate({
      score: Math.floor(this.score),
      coins: this.runCoins,
      distance: Math.floor(this.distance),
      speedMultiplier: Number((this.currentSpeed / 20).toFixed(1)),
      scoreMultiplier: this.multiplierTimer > 0 ? 2 : 1,
      jetpackTime: this.jetpackTimer,
      jetpackMaxTime: JETPACK_DURATION,
      magnetTime: this.magnetTimer,
      magnetMaxTime: MAGNET_DURATION,
      multiplierTime: this.multiplierTimer,
      multiplierMaxTime: MULTIPLIER_DURATION,
      isFlying: this.jetpackTimer > 0,
      policeProximity: this.policeProximity,
      headstartReady: this.headstartAvailable && this.distance < 85 && this.jetpackTimer <= 0,
      bustReason: this.bustReason,
    });
  }

  public dispose(): void {
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.sound.stopMusic();

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('resize', this.onResize);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);

    this.scene.environment?.dispose();
    this.textures.dispose();
    this.sharedCoinGeo.dispose();
    this.sharedCoinMat.dispose();
    this.renderer.dispose();
  }
}
