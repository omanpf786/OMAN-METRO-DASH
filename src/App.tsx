import { useCallback, useEffect, useRef, useState } from 'react';
import { LoadingScreen } from './components/LoadingScreen';
import { TitleOverlay } from './components/TitleOverlay';
import { GameHud } from './components/GameHud';
import { GameOverModal, PauseModal } from './components/ModalScreens';
import { MetroDashEngine } from './game/engine';
import { GamePhase, HudSnapshot, OutfitId, ThemeId } from './game/types';

const INITIAL_HUD: HudSnapshot = {
  score: 0,
  coins: 0,
  distance: 0,
  speedMultiplier: 1.0,
  scoreMultiplier: 1,
  jetpackTime: 0,
  jetpackMaxTime: 7.5,
  magnetTime: 0,
  magnetMaxTime: 9.0,
  multiplierTime: 0,
  multiplierMaxTime: 10.0,
  isFlying: false,
  policeProximity: 0.85,
  headstartReady: true,
  bustReason: '',
};

const STORAGE_BEST_KEY = 'metrodash_best_score';
const STORAGE_COINS_KEY = 'metrodash_total_coins';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<MetroDashEngine | null>(null);

  const [phase, setPhase] = useState<GamePhase>('loading');
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadLabel, setLoadLabel] = useState('Starting MetroDash...');
  const [themeId, setThemeId] = useState<ThemeId>('subway-classic');
  const [outfitId, setOutfitId] = useState<OutfitId>('cyan-street');
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);

  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(STORAGE_BEST_KEY) || 0);
    } catch {
      return 0;
    }
  });
  const [totalCoins, setTotalCoins] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(STORAGE_COINS_KEY) || 0);
    } catch {
      return 0;
    }
  });
  const [isNewBest, setIsNewBest] = useState(false);

  const latestHudRef = useRef<HudSnapshot>(INITIAL_HUD);
  const bestScoreRef = useRef(bestScore);
  bestScoreRef.current = bestScore;

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new MetroDashEngine(mount, {
      onLoadProgress: (pct, label) => {
        setLoadProgress(pct);
        setLoadLabel(label);
      },
      onHudUpdate: (snapshot) => {
        latestHudRef.current = snapshot;
        setHud(snapshot);
      },
      onPhaseChange: (nextPhase) => {
        setPhase(nextPhase);
        if (nextPhase === 'gameover') {
          const runHud = latestHudRef.current;
          setTotalCoins((prev) => {
            const updated = prev + runHud.coins;
            try {
              localStorage.setItem(STORAGE_COINS_KEY, String(updated));
            } catch {
              // ignore storage errors
            }
            return updated;
          });
          if (runHud.score > bestScoreRef.current) {
            setBestScore(runHud.score);
            setIsNewBest(true);
            try {
              localStorage.setItem(STORAGE_BEST_KEY, String(runHud.score));
            } catch {
              // ignore storage errors
            }
          } else {
            setIsNewBest(false);
          }
        }
      },
    });

    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleSelectTheme = useCallback((id: ThemeId) => {
    setThemeId(id);
    engineRef.current?.setTheme(id);
  }, []);

  const handleSelectOutfit = useCallback((id: OutfitId) => {
    setOutfitId(id);
    engineRef.current?.setOutfit(id);
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      engineRef.current?.sound.setMuted(next);
      return next;
    });
  }, []);

  const handleStartRun = useCallback(() => {
    setIsNewBest(false);
    engineRef.current?.startNewRun();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pauseGame();
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resumeGame();
  }, []);

  const handleHome = useCallback(() => {
    engineRef.current?.returnToTitle();
  }, []);

  const handleActivateJetpack = useCallback(() => {
    engineRef.current?.activateJetpackHeadstart();
  }, []);

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-sky-950">
      {/* Isolated WebGL Canvas Container */}
      <div ref={canvasMountRef} className="absolute inset-0 h-full w-full" />

      {/* Game Shell State Overlays */}
      {phase === 'loading' && <LoadingScreen progress={loadProgress} label={loadLabel} />}

      {phase === 'title' && (
        <TitleOverlay
          themeId={themeId}
          outfitId={outfitId}
          bestScore={bestScore}
          totalCoins={totalCoins}
          muted={muted}
          onSelectTheme={handleSelectTheme}
          onSelectOutfit={handleSelectOutfit}
          onToggleMute={handleToggleMute}
          onStartRun={handleStartRun}
        />
      )}

      {phase === 'playing' && (
        <GameHud
          hud={hud}
          muted={muted}
          onPause={handlePause}
          onToggleMute={handleToggleMute}
          onActivateJetpack={handleActivateJetpack}
        />
      )}

      {phase === 'paused' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleStartRun}
          onHome={handleHome}
        />
      )}

      {phase === 'gameover' && (
        <GameOverModal
          hud={hud}
          bestScore={bestScore}
          isNewBest={isNewBest}
          onPlayAgain={handleStartRun}
          onHome={handleHome}
        />
      )}

    </div>
  );
}
