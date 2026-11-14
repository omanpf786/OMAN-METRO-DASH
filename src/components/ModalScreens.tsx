import React from 'react';
import { Play, RotateCcw, Home, Trophy, Coins, ShieldAlert } from 'lucide-react';
import { HudSnapshot } from '../game/types';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({ onResume, onRestart, onHome }) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/15 p-6 text-white shadow-2xl space-y-5 text-center">
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-amber-300">
          Run Paused
        </h2>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onResume}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-3.5 text-sm font-extrabold text-slate-950 transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Resume Run
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 py-3 text-sm font-bold text-slate-950 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Restart
          </button>

          <button
            type="button"
            onClick={onHome}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 py-3 text-sm font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Home Screen
          </button>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  hud: HudSnapshot;
  bestScore: number;
  isNewBest: boolean;
  onPlayAgain: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  hud,
  bestScore,
  isNewBest,
  onPlayAgain,
  onHome,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/65 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-amber-400/35 p-6 text-white shadow-2xl space-y-5">
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 text-rose-400 text-sm font-extrabold tracking-wide">
            <ShieldAlert className="w-5 h-5" />
            BUSTED BY THE GUARD!
          </div>
          <h2 className="font-display text-3xl font-extrabold text-white">Run Complete</h2>
          {hud.bustReason && <p className="text-xs text-slate-300">{hud.bustReason}</p>}
        </div>

        {isNewBest && (
          <div className="rounded-xl bg-amber-400/15 border border-amber-400/40 py-2 text-center text-xs font-extrabold text-amber-300 tracking-wide">
            NEW HIGH SCORE!
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-slate-800/90 p-3">
            <div className="text-[11px] font-semibold text-slate-400">Score</div>
            <div className="font-numeric text-lg font-bold text-white mt-0.5">
              {hud.score.toLocaleString()}
            </div>
          </div>

          <div className="rounded-xl bg-slate-800/90 p-3">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-center gap-1">
              <Coins className="w-3.5 h-3.5 text-yellow-400" />
              Coins
            </div>
            <div className="font-numeric text-lg font-bold text-yellow-300 mt-0.5">
              {hud.coins.toLocaleString()}
            </div>
          </div>

          <div className="rounded-xl bg-slate-800/90 p-3">
            <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Best
            </div>
            <div className="font-numeric text-lg font-bold text-amber-300 mt-0.5">
              {bestScore.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onHome}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 py-3.5 text-sm font-bold text-slate-200 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Home
          </button>

          <button
            type="button"
            onClick={onPlayAgain}
            className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 py-3.5 text-sm font-extrabold text-slate-950 shadow-[0_4px_0_#065f46] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
};
