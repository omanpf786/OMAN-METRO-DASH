export type GamePhase = 'loading' | 'title' | 'playing' | 'paused' | 'gameover';

export type ThemeId = 'subway-classic' | 'sunset-city' | 'neon-metro';

export type OutfitId = 'cyan-street' | 'gold-rush' | 'crimson-dash';

export type PowerupType = 'jetpack' | 'magnet' | 'multiplier';

export interface ThemePalette {
  id: ThemeId;
  name: string;
  subtitle: string;
  skyTop: string;
  skyHorizon: string;
  fogColor: number;
  fogDensity: number;
  sunColor: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  trackBedColor: string;
  platformColor: string;
  wallColor: string;
  buildingColors: number[];
  accentColor: number;
  hasBirds: boolean;
  isNight: boolean;
}

export interface OutfitConfig {
  id: OutfitId;
  name: string;
  hoodieColor: number;
  teeColor: number;
  pantsColor: number;
  capPrimary: number;
  capSecondary: number;
  shoeColor: number;
  backpackColor: number;
  skinColor: number;
  hairColor: number;
  swatchHex: string;
  accentHex: string;
}

export interface HudSnapshot {
  score: number;
  coins: number;
  distance: number;
  speedMultiplier: number;
  scoreMultiplier: number;
  jetpackTime: number;
  jetpackMaxTime: number;
  magnetTime: number;
  magnetMaxTime: number;
  multiplierTime: number;
  multiplierMaxTime: number;
  isFlying: boolean;
  policeProximity: number; // 0 (far) to 1 (right behind!)
  headstartReady: boolean;
  bustReason: string;
}

export const THEMES: Record<ThemeId, ThemePalette> = {
  'subway-classic': {
    id: 'subway-classic',
    name: 'Subway Classic',
    subtitle: 'Sunny City Yards',
    skyTop: '#1D9BF0',
    skyHorizon: '#BAE6FD',
    fogColor: 0x9ad8fa,
    fogDensity: 0.0085,
    sunColor: 0xfff3d6,
    sunIntensity: 2.1,
    hemiSky: 0x7dd3fc,
    hemiGround: 0x8a6d52,
    hemiIntensity: 1.0,
    trackBedColor: '#64748B',
    platformColor: '#CBD5E1',
    wallColor: '#C2593F',
    buildingColors: [0xe07a5f, 0x3d5a80, 0xf2cc8f, 0x5c7cfa, 0x81b29a],
    accentColor: 0xfacc15,
    hasBirds: true,
    isNight: false,
  },
  'sunset-city': {
    id: 'sunset-city',
    name: 'Sunset Downtown',
    subtitle: 'Golden Hour Rails',
    skyTop: '#7C2D12',
    skyHorizon: '#FDBA74',
    fogColor: 0xf9a86c,
    fogDensity: 0.0095,
    sunColor: 0xffb36b,
    sunIntensity: 2.2,
    hemiSky: 0xfdba74,
    hemiGround: 0x5c3a2e,
    hemiIntensity: 0.95,
    trackBedColor: '#57534E',
    platformColor: '#D6D3D1',
    wallColor: '#9A3412',
    buildingColors: [0x7c2d12, 0xb45309, 0x4338ca, 0xbe123c, 0x92400e],
    accentColor: 0xf97316,
    hasBirds: true,
    isNight: false,
  },
  'neon-metro': {
    id: 'neon-metro',
    name: 'Midnight Express',
    subtitle: 'City Lights Tunnel',
    skyTop: '#0F172A',
    skyHorizon: '#1E293B',
    fogColor: 0x162038,
    fogDensity: 0.011,
    sunColor: 0x93c5fd,
    sunIntensity: 1.5,
    hemiSky: 0x38bdf8,
    hemiGround: 0x1e293b,
    hemiIntensity: 0.9,
    trackBedColor: '#334155',
    platformColor: '#475569',
    wallColor: '#1E293B',
    buildingColors: [0x1e293b, 0x312e81, 0x0f172a, 0x164e63, 0x334155],
    accentColor: 0x38bdf8,
    hasBirds: false,
    isNight: true,
  },
};

export const OUTFITS: Record<OutfitId, OutfitConfig> = {
  'cyan-street': {
    id: 'cyan-street',
    name: 'Subway Teal',
    hoodieColor: 0x06b6d4, // vibrant cyan-teal hoodie (changed dressing color!)
    teeColor: 0xf8fafc,
    pantsColor: 0x1e3a8a, // deep indigo denim
    capPrimary: 0xef4444, // classic red cap
    capSecondary: 0xffffff,
    shoeColor: 0xdc2626,
    backpackColor: 0xf97316,
    skinColor: 0xf6c39b,
    hairColor: 0x3b2314,
    swatchHex: '#06B6D4',
    accentHex: '#EF4444',
  },
  'gold-rush': {
    id: 'gold-rush',
    name: 'Gold Rush',
    hoodieColor: 0xf59e0b,
    teeColor: 0x111827,
    pantsColor: 0x1e293b,
    capPrimary: 0xfacc15,
    capSecondary: 0x111827,
    shoeColor: 0xfacc15,
    backpackColor: 0xef4444,
    skinColor: 0xf6c39b,
    hairColor: 0x23170e,
    swatchHex: '#F59E0B',
    accentHex: '#1E293B',
  },
  'crimson-dash': {
    id: 'crimson-dash',
    name: 'Emerald Pro',
    hoodieColor: 0x10b981,
    teeColor: 0xffffff,
    pantsColor: 0x0f172a,
    capPrimary: 0x2563eb,
    capSecondary: 0xffffff,
    shoeColor: 0x10b981,
    backpackColor: 0xfacc15,
    skinColor: 0xf6c39b,
    hairColor: 0x2b1a10,
    swatchHex: '#10B981',
    accentHex: '#2563EB',
  },
};
