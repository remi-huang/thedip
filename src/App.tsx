import { useState, useRef } from 'react';
import { CurvePreset, DipMilestone, SimulationStats } from './types';
import { defaultPresets } from './presets';
import DipCanvas from './components/DipCanvas';
import DiagnosticLab from './components/DiagnosticLab';
import { Trophy } from 'lucide-react';

const READ_CARDS = [
  {
    id: '01',
    title: 'The Dip Is the Secret',
    titleZh: '低谷即秘密',
    body: 'The temporary setback that separates the world-class from everyone else. Most people quit during the Dip. Push through, and scarcity creates outsized value.',
    bodyZh: '那段暂时的挫败期，正是将顶尖选手与其他所有人分开的关键。大多数人在低谷中放弃。坚持穿越，稀缺性将创造超额价值。',
  },
  {
    id: '02',
    title: 'Winners Quit All the Time',
    titleZh: '赢家一直在放弃',
    body: "Quit the wrong stuff. Stick with the right stuff. Strategic quitting is not failure — it's the discipline to stop investing in dead ends before they drain you.",
    bodyZh: '放弃错误的事，坚持正确的事。战略性放弃不是失败——它是在死路耗尽你之前及时止损的自律。',
  },
  {
    id: '03',
    title: 'Scarcity = Value',
    titleZh: '稀缺 = 价值',
    body: "If it weren't hard, everyone would do it. The difficulty of the Dip is precisely what makes breaking through so rare — and therefore so valuable.",
    bodyZh: '如果不难，人人都会做。低谷的难度，恰恰是突破后如此罕见——因此如此珍贵——的原因。',
  },
  {
    id: '04',
    title: 'Best in the World',
    titleZh: '细分赛道第一',
    body: '"Best in the world" doesn\'t mean the whole world. It means best in your specific niche. That narrow slice is enough to make you irreplaceable.',
    bodyZh: '"世界最好"不是指整个世界，而是你所在的具体细分领域。那一小块就足以让你无可替代。',
  },
  {
    id: '05',
    title: 'Quit or Persist — Never Coast',
    titleZh: '要么放弃，要么坚持——绝不漂流',
    body: 'The worst path is staying in a Cul-de-Sac or on a Cliff while drifting. Either commit fully to pushing through the Dip, or make a clean, strategic exit.',
    bodyZh: '最糟糕的路是困在死胡同或悬崖边随波逐流。要么全力穿越低谷，要么干净地战略退出。',
  },
];

export default function App() {
  const [currentPreset, setCurrentPreset] = useState<CurvePreset>(defaultPresets[0]);
  const [gravity, setGravity] = useState<number>(defaultPresets[0].baseGravity);
  const [friction, setFriction] = useState<number>(defaultPresets[0].baseFriction);
  const [mass, setMass] = useState<number>(defaultPresets[0].ballMass);
  const [dragMode] = useState<'push' | 'spring' | 'assist'>('push');

  const [stats, setStats] = useState<SimulationStats>({
    effortSpent: 0, timeInDip: 0, maxResults: 0,
    breakthroughCount: 0, timesReset: 0, motivationLevel: 100,
  });

  const [activeMilestone, setActiveMilestone] = useState<DipMilestone | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [boosterActive, setBoosterActive] = useState<boolean>(false);
  const [quizVerdict, setQuizVerdict] = useState<'THE_DIP' | 'CUL_DE_SAC' | 'CLIFF' | null>(null);

  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [showQuizPromptAlert, setShowQuizPromptAlert] = useState(false);
  const [isGamesModalOpen, setIsGamesModalOpen] = useState(false);
  const [isReadModalOpen, setIsReadModalOpen] = useState(false);
  const [readCardIdx, setReadCardIdx] = useState(0);
  const lastWallHitTime = useRef<number>(0);

  const globalHandStateRef = useRef<{ x: number; y: number; isPinching: boolean; isActive: boolean; pinchRatio: number }>({
    x: 0, y: 0, isPinching: false, isActive: false, pinchRatio: 1
  });

  const handleWallCollision = () => {
    const now = Date.now();
    if (now - lastWallHitTime.current < 2000) return;
    if (quizVerdict === null && !isQuizModalOpen && !showQuizPromptAlert) {
      setShowQuizPromptAlert(true);
      lastWallHitTime.current = now;
    }
  };

  const handleStrategicQuit = () => {
    setStats({
      effortSpent: 0, timeInDip: 0, maxResults: 0,
      breakthroughCount: stats.breakthroughCount,
      timesReset: stats.timesReset + 1, motivationLevel: 100,
    });
    const resetPreset = { ...currentPreset };
    setCurrentPreset(resetPreset);
    setActiveMilestone(null);
    setShowCelebration(false);
    setQuizVerdict(null);
  };

  const handleRetakeTest = () => {
    setQuizVerdict(null);
    setIsQuizModalOpen(true);
    setShowQuizPromptAlert(false);
  };

  const triggerCelebration = () => {
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 5500);
  };

  return (
    <div className="min-h-screen bg-paper text-ink-black flex flex-col antialiased" id="app-root">

      {/* Breakthrough banner */}
      {showCelebration && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-ink-black text-paper px-6 py-4 flex items-center gap-4 animate-fade-in max-w-md">
          <Trophy className="w-5 h-5 shrink-0 opacity-80" />
          <div>
            <p className="text-xs font-mono uppercase tracking-widest opacity-60">breakthrough</p>
            <p className="text-sm font-serif italic mt-0.5">成功突围。越过低谷的人，获得稀缺的顶峰价值。</p>
          </div>
          <button onClick={() => setShowCelebration(false)} className="text-paper/50 hover:text-paper text-xs ml-auto cursor-pointer select-none">✕</button>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-ink-black/15 bg-paper sticky top-0 z-40 px-6 md:px-10 py-4 flex justify-between items-center animate-fade-in">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-serif italic text-ink-black tracking-wide">The Dip</h1>
        </div>
      </header>

      {/* Main — canvas fills the space */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 py-6" id="sandbox-grid-container">
        <div className="w-full h-[calc(100vh-140px)] min-h-[480px] relative overflow-hidden border border-ink-black/20 bg-paper animate-fade-in">
          <DipCanvas
            preset={currentPreset}
            dragMode={dragMode}
            gravityMultiplier={gravity}
            frictionMultiplier={friction}
            ballMass={mass}
            stats={stats}
            onStatsChange={setStats}
            onMilestoneTrigger={setActiveMilestone}
            onBreakthrough={triggerCelebration}
            boosterActive={boosterActive}
            quizVerdict={quizVerdict}
            onWallCollision={handleWallCollision}
            isModalOpen={isQuizModalOpen || showQuizPromptAlert}
            showQuizPromptAlert={showQuizPromptAlert}
            onAcceptQuiz={() => { setIsQuizModalOpen(true); setShowQuizPromptAlert(false); }}
            onRejectQuiz={() => { setShowQuizPromptAlert(false); lastWallHitTime.current = Date.now(); }}
            onRetakeTest={handleRetakeTest}
            onOpenGames={() => setIsGamesModalOpen(true)}
            onOpenRead={() => { setReadCardIdx(0); setIsReadModalOpen(true); }}
            globalHandStateRef={globalHandStateRef}
          />
        </div>
      </main>

      <footer className="border-t border-ink-black/10 py-5 text-center font-mono text-[10px] text-ink-soft/50 tracking-wide">
        <p>© 2026 The Dip — inspired by Seth Godin</p>
      </footer>

      {/* Quiz modal */}
      {isQuizModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-paper/98 backdrop-blur-sm animate-fade-in">
          <div className="w-full p-4 flex justify-end">
            <button
              onClick={() => setIsQuizModalOpen(false)}
              className="text-ink-black bg-paper hover:bg-paper-warm px-4 py-2 border-2 border-ink-black btn-press cursor-pointer font-bold text-sm shadow-[4px_4px_0_rgba(26,26,26,1)] flex items-center gap-2"
            >
              <span>✕ exit</span>
            </button>
          </div>
          <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col p-4 md:p-8 overflow-y-auto justify-center">
            <DiagnosticLab
              onActivateBoost={setBoosterActive}
              onStrategicQuitRequest={handleStrategicQuit}
              globalHandStateRef={globalHandStateRef}
              defaultTab="diagnostic"
              hideTabsControl={true}
              initialPhase="quiz"
              onExitQuiz={() => setIsQuizModalOpen(false)}
              onQuizComplete={(verdict) => setQuizVerdict(verdict)}
              onOpenGames={() => { setIsQuizModalOpen(false); setIsGamesModalOpen(true); }}
            />
          </div>
        </div>
      )}

      {/* Games modal */}
      {isGamesModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-paper/98 backdrop-blur-sm animate-fade-in">
          <div className="w-full p-4 flex justify-end">
            <button
              onClick={() => setIsGamesModalOpen(false)}
              className="text-ink-black bg-paper hover:bg-paper-warm px-4 py-2 border border-ink-black/30 hover:border-ink-black cursor-pointer font-mono text-[10px] transition-colors"
            >
              ✕ close
            </button>
          </div>
          <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col p-4 md:p-8 overflow-y-auto justify-center">
            <DiagnosticLab
              onActivateBoost={setBoosterActive}
              onStrategicQuitRequest={handleStrategicQuit}
              globalHandStateRef={globalHandStateRef}
              defaultTab="momentum"
              hideTabsControl={true}
              initialPhase="quiz"
            />
          </div>
        </div>
      )}

      {/* Read modal — 5 key insight cards, swipeable */}
      {isReadModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-paper/98 backdrop-blur-sm animate-fade-in">
          {/* Header */}
          <div className="w-full px-6 py-4 flex items-center justify-between border-b border-ink-black/10">
            <div>
              <p className="font-mono text-[10px] text-ink-soft tracking-widest uppercase">The Dip — Seth Godin</p>
              <h2 className="font-serif italic text-ink-black text-lg mt-0.5">key insights</h2>
            </div>
            <button
              onClick={() => setIsReadModalOpen(false)}
              className="font-mono text-[10px] text-ink-soft hover:text-ink-black border border-ink-black/20 hover:border-ink-black px-3 py-1.5 transition-colors cursor-pointer"
            >
              ✕ close
            </button>
          </div>

          {/* Card area */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8 select-none">
            {/* Card */}
            <div
              className="w-full max-w-xl relative"
              onPointerDown={(e) => {
                (e.currentTarget as HTMLDivElement).dataset.startX = String(e.clientX);
              }}
              onPointerUp={(e) => {
                const start = Number((e.currentTarget as HTMLDivElement).dataset.startX ?? e.clientX);
                const delta = e.clientX - start;
                if (delta < -50 && readCardIdx < READ_CARDS.length - 1) setReadCardIdx(i => i + 1);
                if (delta > 50 && readCardIdx > 0) setReadCardIdx(i => i - 1);
              }}
            >
              {/* Card number + rule */}
              <div className="flex items-center gap-4 mb-6">
                <span className="font-mono text-[11px] text-ink-soft tracking-widest">{READ_CARDS[readCardIdx].id}</span>
                <div className="flex-1 h-px bg-ink-black/10" />
                <span className="font-mono text-[10px] text-ink-soft">{readCardIdx + 1} / {READ_CARDS.length}</span>
              </div>

              {/* Title */}
              <h3 className="font-serif italic text-ink-black leading-tight"
                style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
                {READ_CARDS[readCardIdx].title}
              </h3>
              <p className="font-sans text-ink-soft/70 mt-1 mb-5"
                style={{ fontSize: 'clamp(0.8rem, 1.2vw, 0.95rem)' }}>
                {READ_CARDS[readCardIdx].titleZh}
              </p>

              {/* Body */}
              <p className="font-serif text-ink-black/70 leading-relaxed"
                style={{ fontSize: 'clamp(0.9rem, 1.5vw, 1.1rem)' }}>
                {READ_CARDS[readCardIdx].body}
              </p>
              <p className="font-sans text-ink-black/40 leading-relaxed mt-3"
                style={{ fontSize: 'clamp(0.8rem, 1.2vw, 0.9rem)' }}>
                {READ_CARDS[readCardIdx].bodyZh}
              </p>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => setReadCardIdx(i => Math.max(0, i - 1))}
                disabled={readCardIdx === 0}
                className="w-10 h-10 border border-ink-black/20 hover:border-ink-black flex items-center justify-center font-mono text-ink-black disabled:opacity-20 cursor-pointer transition-colors"
              >←</button>

              {/* Dot indicators */}
              <div className="flex gap-2">
                {READ_CARDS.map((_, i) => (
                  <button key={i} onClick={() => setReadCardIdx(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${i === readCardIdx ? 'bg-ink-black' : 'bg-ink-black/20'}`}
                  />
                ))}
              </div>

              <button
                onClick={() => setReadCardIdx(i => Math.min(READ_CARDS.length - 1, i + 1))}
                disabled={readCardIdx === READ_CARDS.length - 1}
                className="w-10 h-10 border border-ink-black/20 hover:border-ink-black flex items-center justify-center font-mono text-ink-black disabled:opacity-20 cursor-pointer transition-colors"
              >→</button>
            </div>

            <p className="font-mono text-[9px] text-ink-soft/50 tracking-widest">← swipe or drag to browse →</p>
          </div>
        </div>
      )}

    </div>
  );
}
