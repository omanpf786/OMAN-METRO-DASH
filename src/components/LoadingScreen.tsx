import React from 'react';

interface LoadingScreenProps {
  progress: number;
  label: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress, label }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-sky-500 via-sky-600 to-blue-900 px-6 py-10 text-white">
      <div className="flex-1 flex flex-col items-center justify-center max-w-md w-full text-center">
        {/* Official Subway-style Emblem SVG */}
        <svg
          viewBox="0 0 380 120"
          className="w-72 sm:w-88 drop-shadow-[0_10px_20px_rgba(15,23,42,0.45)]"
          aria-label="MetroDash"
        >
          <defs>
            <linearGradient id="loadTitleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="55%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
          </defs>
          <rect x="14" y="14" width="352" height="86" rx="22" fill="#0F172A" stroke="#FACC15" strokeWidth="5" />
          <text
            x="190"
            y="74"
            textAnchor="middle"
            fontFamily="Bricolage Grotesque, sans-serif"
            fontWeight="800"
            fontSize="50"
            letterSpacing="-1"
            fill="url(#loadTitleGrad)"
          >
            METRODASH
          </text>
        </svg>

        <p className="mt-3 text-base sm:text-lg font-bold tracking-wide text-amber-200">
          Developed by OMAN
        </p>

        {/* Loading Progress Bar */}
        <div className="mt-10 w-full max-w-xs space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-sky-100">
            <span>{label}</span>
            <span className="font-numeric">{Math.min(100, Math.round(progress))}%</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-slate-950/75 p-1 border border-white/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 transition-transform duration-200 origin-left"
              style={{ width: `${Math.min(100, Math.max(6, progress))}%` }}
            />
          </div>
        </div>
      </div>

      <p className="text-xs font-medium text-sky-100/80 tracking-wide">
        Loading 3D Tracks, Trains &amp; Jetpack Assets
      </p>
    </div>
  );
};
