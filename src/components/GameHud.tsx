import React from 'react';
import { Pause, Volume2, VolumeX, Rocket, Magnet, Zap } from 'lucide-react';
import { HudSnapshot } from '../game/types';

interface GameHudProps {
  hud: HudSnapshot;
  muted: boolean;
  onPause: () => void;
  onToggleMute: () => void;
  onActivateJetpack: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  muted,
  onPause,
  onToggleMute,
  onActivateJetpack,
}) => {
  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 sm:p-5">
      {/* Top Perimeter HUD */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left Pause & Mute Buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onPause}
            aria-label="Pause game"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950/85 border border-white/15 text-white hover:bg-slate-900 transition-colors shadow cursor-pointer"
          >
            <Pause className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950/85 border border-white/15 text-white hover:bg-slate-900 transition-colors shadow cursor-pointer"
          >
            {muted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>

        {/* Top-Center Police Proximity Alert (only when guard surges right behind!) */}
        {hud.policeProximity > 0.65 && (
          <div className="rounded-lg bg-red-600/90 border border-amber-300/60 px-3.5 py-1.5 text-xs sm:text-sm font-extrabold text-white tracking-wide shadow">
            GUARD CHASING CLOSE BEHIND!
          </div>
        )}

        {/* Top-Right Score & Coins Readout */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2.5 rounded-xl bg-slate-950/85 border border-white/15 px-4 py-2 text-white shadow">
            <span className="text-xs font-extrabold text-sky-400">
              {hud.scoreMultiplier}x
            </span>
            <span className="font-numeric text-xl sm:text-2xl font-bold tracking-tight">
              {hud.score.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-950/85 border border-white/15 px-3.5 py-1.5 text-white shadow">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-yellow-400" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="#FACC15" stroke="#B45309" strokeWidth="2" />
              <circle cx="12" cy="12" r="5" fill="#FEF08A" />
            </svg>
            <span className="font-numeric text-sm font-bold">{hud.coins.toLocaleString()}</span>
            <span className="text-slate-400 text-xs">·</span>
            <span className="font-numeric text-xs font-semibold text-slate-300">{hud.distance}m</span>
          </div>
        </div>
      </div>

      {/* Bottom Perimeter: Active Powerup Bars & Jetpack Headstart CTA */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2 max-w-xs w-full">
          {hud.jetpackTime > 0 && (
            <div className="rounded-xl bg-slate-950/85 border border-orange-400/50 px-3.5 py-2 text-white shadow">
              <div className="flex items-center justify-between text-xs font-bold text-orange-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5" />
                  JETPACK FLYING
                </span>
                <span className="font-numeric">{hud.jetpackTime.toFixed(1)}s</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-300"
                  style={{ width: `${(hud.jetpackTime / hud.jetpackMaxTime) * 100}%` }}
                />
              </div>
            </div>
          )}

          {hud.magnetTime > 0 && (
            <div className="rounded-xl bg-slate-950/85 border border-rose-400/50 px-3.5 py-2 text-white shadow">
              <div className="flex items-center justify-between text-xs font-bold text-rose-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <Magnet className="w-3.5 h-3.5" />
                  COIN MAGNET
                </span>
                <span className="font-numeric">{hud.magnetTime.toFixed(1)}s</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-pink-300"
                  style={{ width: `${(hud.magnetTime / hud.magnetMaxTime) * 100}%` }}
                />
              </div>
            </div>
          )}

          {hud.multiplierTime > 0 && (
            <div className="rounded-xl bg-slate-950/85 border border-sky-400/50 px-3.5 py-2 text-white shadow">
              <div className="flex items-center justify-between text-xs font-bold text-sky-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  2X MULTIPLIER
                </span>
                <span className="font-numeric">{hud.multiplierTime.toFixed(1)}s</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-cyan-300"
                  style={{ width: `${(hud.multiplierTime / hud.multiplierMaxTime) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* On-Demand Jetpack Headstart Button (available at start of run!) */}
        {hud.headstartReady && (
          <button
            type="button"
            onClick={onActivateJetpack}
            className="pointer-events-auto flex items-center gap-2 rounded-xl bg-gradient-to-b from-orange-400 to-red-600 hover:from-orange-300 hover:to-red-500 active:scale-[0.97] px-4 py-3 text-xs sm:text-sm font-extrabold text-white shadow-[0_4px_0_#991b1b] border border-amber-300/60 transition-transform whitespace-nowrap cursor-pointer"
          >
            <Rocket className="w-4 h-4" />
            FLY JETPACK (SPACE)
          </button>
        )}
      </div>
    </div>
  );
};
