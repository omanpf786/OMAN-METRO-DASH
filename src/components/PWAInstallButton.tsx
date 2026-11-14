import React, { useState } from 'react';
import { Download, Share, Smartphone, X, WifiOff, MonitorSmartphone } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'dock';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'dock' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) return;
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          variant === 'dock'
            ? 'pointer-events-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 active:scale-[0.98] px-5 py-3.5 text-sm sm:text-base font-extrabold text-white shadow-[0_6px_0_#1e40af] border border-sky-200/40 transition-transform whitespace-nowrap shrink-0 cursor-pointer'
            : 'pointer-events-auto flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-[0.98] border border-sky-300/60 px-3.5 py-2.5 text-xs sm:text-sm font-extrabold text-slate-950 shadow-lg transition-transform whitespace-nowrap cursor-pointer'
        }
      >
        <Download className="w-4 h-4 sm:w-5 sm:h-5" />
        <span>Install App</span>
      </button>

      {showGuide && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/15 p-6 text-white shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {isIOS ? (
                  <Smartphone className="w-5 h-5 text-sky-400" />
                ) : (
                  <MonitorSmartphone className="w-5 h-5 text-sky-400" />
                )}
                <h3 className="font-display text-lg font-extrabold text-white">
                  Install MetroDash
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install instructions"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-2.5 text-sm text-slate-200 leading-relaxed">
                <p>Install MetroDash on your iPhone or iPad:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300">
                  <li>
                    Tap the{' '}
                    <strong className="text-white inline-flex items-center gap-1">
                      <Share className="w-3.5 h-3.5 inline" /> Share
                    </strong>{' '}
                    button in Safari.
                  </li>
                  <li>
                    Scroll down and select <strong className="text-white">Add to Home Screen</strong>.
                  </li>
                  <li>
                    Tap <strong className="text-white">Add</strong> to launch full-screen.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-2.5 text-sm text-slate-200 leading-relaxed">
                <p>Install MetroDash on your phone or laptop for offline &amp; full-screen play:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300">
                  <li>Open MetroDash directly in Chrome or Edge (outside an embedded preview frame).</li>
                  <li>
                    Click the <strong className="text-white">Install</strong> icon in the address bar or open browser menu (<strong className="text-white">⋮</strong>).
                  </li>
                  <li>
                    Choose <strong className="text-white">Install MetroDash</strong> / <strong className="text-white">Add to Home screen</strong>.
                  </li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full rounded-xl bg-sky-500 hover:bg-sky-400 py-2.5 text-sm font-extrabold text-slate-950 transition-colors cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-lg">
      <WifiOff className="w-4 h-4" />
      Offline Mode — Running Cached Game
    </div>
  );
};
