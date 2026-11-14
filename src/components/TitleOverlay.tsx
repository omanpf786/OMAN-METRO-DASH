import React, { useEffect } from 'react';
import { Volume2, VolumeX, Play, Trophy, Coins } from 'lucide-react';
import { OUTFITS, OutfitId, THEMES, ThemeId } from '../game/types';
import { PWAInstallButton } from './PWAInstallButton';

interface TitleOverlayProps {
  themeId: ThemeId;
  outfitId: OutfitId;
  bestScore: number;
  totalCoins: number;
  muted: boolean;
  onSelectTheme: (id: ThemeId) => void;
  onSelectOutfit: (id: OutfitId) => void;
  onToggleMute: () => void;
  onStartRun: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  themeId,
  outfitId,
  bestScore,
  totalCoins,
  muted,
  onSelectTheme,
  onSelectOutfit,
  onToggleMute,
  onStartRun,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStartRun();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStartRun]);

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 sm:p-6">
      {/* Top Perimeter Bar */}
      <div className="flex items-start justify-between gap-4">
        {/* Best Score & Banked Coins */}
        <div className="pointer-events-auto flex items-center gap-4 rounded-xl bg-slate-950/85 border border-white/15 px-4 py-2.5 text-white shadow-lg">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <div className="leading-tight">
              <div className="text-[11px] font-semibold text-slate-300">Best Score</div>
              <div className="font-numeric text-sm font-bold">{bestScore.toLocaleString()}</div>
            </div>
          </div>
          <div className="h-6 w-px bg-white/15" />
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-yellow-400" />
            <div className="leading-tight">
              <div className="text-[11px] font-semibold text-slate-300">Coins</div>
              <div className="font-numeric text-sm font-bold">{totalCoins.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Audio Mute Toggle */}
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950/85 border border-white/15 text-white hover:bg-slate-900 transition-colors shadow-lg cursor-pointer"
        >
          {muted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
        </button>
      </div>

      {/* Top-Center Bespoke Game Title Lockup + Developed by OMAN */}
      <div className="flex flex-col items-center text-center -mt-2 sm:-mt-4">
        <svg
          viewBox="0 0 420 118"
          className="w-72 sm:w-96 drop-shadow-[0_12px_22px_rgba(15,23,42,0.55)]"
          aria-label="MetroDash"
        >
          <defs>
            <linearGradient id="titleLogoGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="55%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
          </defs>
          <rect
            x="16"
            y="10"
            width="388"
            height="88"
            rx="22"
            fill="#0F172A"
            fillOpacity="0.92"
            stroke="#FACC15"
            strokeWidth="5"
          />
          <text
            x="210"
            y="71"
            textAnchor="middle"
            fontFamily="Bricolage Grotesque, sans-serif"
            fontWeight="800"
            fontSize="54"
            letterSpacing="-1"
            fill="url(#titleLogoGrad)"
          >
            METRODASH
          </text>
        </svg>

        <div className="mt-2 rounded-lg bg-slate-950/85 border border-amber-400/40 px-4 py-1 text-sm sm:text-base font-bold tracking-wide text-amber-300 shadow">
          Developed by OMAN
        </div>
      </div>

      {/* Spacer leaving 3D runner, guard & pup visible in center */}
      <div className="flex-1" />

      {/* Unified Bottom Control Dock */}
      <div className="pointer-events-auto mx-auto w-full max-w-3xl rounded-2xl bg-slate-950/90 border border-white/15 p-3.5 sm:p-4 text-white shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          {/* Theme & Outfit Dressing Selectors */}
          <div className="flex flex-wrap items-center gap-4">
            {/* 3D Theme Selector */}
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-slate-300">Subway Theme</div>
              <div className="flex items-center gap-1.5">
                {(Object.keys(THEMES) as ThemeId[]).map((id) => {
                  const active = themeId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onSelectTheme(id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        active
                          ? 'bg-sky-500 text-slate-950 shadow'
                          : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {THEMES[id].name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Character Dressing Color Selector */}
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-slate-300">Runner Outfit</div>
              <div className="flex items-center gap-1.5">
                {(Object.keys(OUTFITS) as OutfitId[]).map((id) => {
                  const o = OUTFITS[id];
                  const active = outfitId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onSelectOutfit(id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        active
                          ? 'bg-amber-400 text-slate-950 shadow'
                          : 'bg-slate-800/90 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      <span
                        className="inline-block h-3 w-3 rounded-full border border-white/60"
                        style={{ backgroundColor: o.swatchHex }}
                      />
                      {o.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Home Screen Action Buttons: Install App & Primary Start CTA */}
          <div className="flex items-center gap-2.5 shrink-0">
            <PWAInstallButton variant="dock" />
            <button
              type="button"
              onClick={onStartRun}
              className="flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 active:scale-[0.98] px-7 py-3.5 text-base font-extrabold text-slate-950 shadow-[0_6px_0_#065f46] transition-transform whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              START RUN
            </button>
          </div>
        </div>

        {/* Single flat control-hint line */}
        <div className="mt-3 border-t border-white/10 pt-2 text-center text-xs text-slate-300">
          Arrows / WASD or Swipe to Move, Jump &amp; Roll · Space Jetpack Boost · P Pause
        </div>
      </div>
    </div>
  );
};
