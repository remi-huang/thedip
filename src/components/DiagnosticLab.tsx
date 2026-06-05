import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, CheckCircle, Compass, CircleSlash, ArrowRight, 
  Flame, Award, RotateCw, Play, AlertTriangle, ShieldCheck, HeartPulse,
  Trash2, Smile, ShieldAlert, Zap, HelpCircle, Wind, Volume2
} from 'lucide-react';

interface DiagnosticLabProps {
  onActivateBoost: (active: boolean) => void;
  onStrategicQuitRequest: () => void;
  onQuizComplete?: (verdict: 'THE_DIP' | 'CUL_DE_SAC' | 'CLIFF' | null) => void;
  onExitQuiz?: () => void;
  onOpenGames?: () => void;
  defaultTab?: 'diagnostic' | 'momentum';
  hideTabsControl?: boolean;
  initialPhase?: 'intro' | 'quiz' | 'verdict';
  globalHandStateRef?: React.MutableRefObject<{ x: number; y: number; isPinching: boolean; isActive: boolean }>;
}

interface Question {
  id: number;
  text: string;
  options: {
    letter: string;
    text: string;
    score: number;
    explanation: string;
  }[];
}

const DIAGNOSTIC_QUESTIONS: Question[] = [
  {
    id: 1,
    text: "一旦能越过当前的瓶颈，最终能为你创造极强的『稀缺性护城河』(Scarcity Moat) 吗？",
    options: [
      {
        letter: 'A',
        text: "是的，这是行业的硬骨头。越过去我就能成为细分市场的前 1% (Best in the World)，收益极其丰厚且难以替代。",
        score: 3,
        explanation: '极高回报与稀缺价值，这是符合 Seth Godin 定义的典型优质 “The Dip”。'
      },
      {
        letter: 'B',
        text: "不确定，感觉就算拼尽全力通过了，也只是一项很平庸、竞争极为同质化、大家都会的技能。",
        score: 1,
        explanation: '通过后的收益泛泛，你很有可能掉入了 “Cul-de-Sac”（死胡同），再坚持只是在浪费精力。'
      },
      {
        letter: 'C',
        text: "不会，随着竞争对手廉价复制走，它的价值实际上每天都在衰退。",
        score: 0,
        explanation: '这是一条 “Cliff”（悬崖）路径：前期容易，后期由于缺乏护城河而快速崩塌，多坚持一天都是损失。'
      }
    ]
  },
  {
    id: 2,
    text: "你当前遇到的挣扎，它的阻碍本质是什么？",
    options: [
      {
        letter: 'A',
        text: "技巧在艰难爬升。虽然经常犯错、极其受挫折，但每一天的探索在认知和机制上都留下了真实的微小增量。",
        score: 3,
        explanation: '困难是磨练内功、形成护城河的开始。这属于 “The Dip” 必经的技能爬坡期。'
      },
      {
        letter: 'B',
        text: "纯粹地在没有产出的跑步机上空转。在规则、机制或市场上看不到哪怕一丁点改进希望，毫无变化。",
        score: 1,
        explanation: '空转就是死胡同，属于 “Cul-de-Sac”，即“用勤奋的战术挣扎掩盖战略上的死胡同”。'
      },
      {
        letter: 'C',
        text: "项目或技术架构早已彻底崩盘。基本确定无法交付，但我只是因为已经投入了大量的资源和时间而害怕丢脸。",
        score: 0,
        explanation: '执着于已经沉没的成本而拒绝退却，是标准的 “Cliff/Trap”，应该勇敢做战略撤退！'
      }
    ]
  },
  {
    id: 3,
    text: "在沮丧、最想放弃、怀疑人生的深夜，你最底层的心理退缩引擎是什么？",
    options: [
      {
        letter: 'A',
        text: "只是今天觉得太累、太烦，不想再重复第 100 遍乏聊的微小优化和调试（即时生理痛苦）。",
        score: 3,
        explanation: '痛苦只是暂时的，真正的成就感在爬上山顶那一刻。这恰恰是把普通人筛掉的最佳阶段！'
      },
      {
        letter: 'B',
        text: "我内心早已明确知道这一行完全不适合我，当初只是看别人赚钱眼红，盲目跟风冲进来的。",
        score: 1,
        explanation: '缺乏原生的内心热爱，意味着你没有足够的心理储备，很难在这项运动中成为世界顶级，现在放弃并不可耻。'
      },
      {
        letter: 'C',
        text: "我发现哪怕赢下了这场战役，终点处的奖品也完全是我不想要的（发现自己并不喜欢那个顶峰的生活）。",
        score: 0,
        explanation: '如果不喜欢顶峰的风景，再努力往上爬也只会让你更痛苦。此时放弃不仅正确，而且高级！'
      }
    ]
  },
  {
    id: 4,
    text: "你目前的身心状态、可用时间以及经济生存资本（即长夜跑道/Runway）如何？",
    options: [
      {
        letter: 'A',
        text: "还有足够的备用资源、精力和健康支持。我可以接受用『每天只进步0.1%』的微增量策略进行抗衡。",
        score: 3,
        explanation: '拥有支持抗磨损的底层跑道，代表你能够以稳定的心态等待阻力消散、越过转折点。'
      },
      {
        letter: 'B',
        text: "精神濒临极度透支或绝望崩溃。而且孤立无援，基本是靠盲目的自我感动自我消耗式顶撑。",
        score: 1,
        explanation: '如果弹尽粮绝，单凭盲目蛮力极易遭受永久心理反噬。你需要重新梳理资源，或暂停重新审视战略。'
      },
      {
        letter: 'C',
        text: "零跑道、零支持。全靠毫无策略的赌一波爆发力，随时会面临彻底崩溃崩塌的毁灭危险。",
        score: 0,
        explanation: '没有跑道而盲目爬坡，是危险的物理孤峰。应当迅速止损退出或者寻求强力外援！'
      }
    ]
  }
];



const QUOTE_TEXT = "Quit the wrong stuff.\nStick with the right stuff.\nHave the guts to do one or the other.";

interface QuoteHighlighterProps {
  onComplete: () => void;
  globalHandStateRef?: React.MutableRefObject<any>;
}

function QuoteHighlighter({ onComplete, globalHandStateRef }: QuoteHighlighterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const highlightedDistance = useRef(0);
  const lastX = useRef(-1);
  const lastY = useRef(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const resizeCanvas = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    let animFrame: number;
    let isActive = false;
    
    const drawLoop = () => {
       let x = -1;
       let y = -1;
       
       if (globalHandStateRef?.current?.isActive && !isCompleted) {
           const rect = canvas.getBoundingClientRect();
           x = globalHandStateRef.current.x - rect.left;
           y = globalHandStateRef.current.y - rect.top;
           isActive = true;
       } else {
           isActive = false;
       }
       
       if (isActive) {
           if (lastX.current === -1) {
               lastX.current = x;
               lastY.current = y;
           }
           const dx = x - lastX.current;
           const dy = y - lastY.current;
           const dist = Math.sqrt(dx*dx + dy*dy);
           
           if (dist > 2) {
               ctx.lineCap = 'round';
               ctx.lineJoin = 'round';
               ctx.lineWidth = 36;
               ctx.strokeStyle = 'rgba(253, 224, 71, 0.85)'; // yellow-300
               
               ctx.beginPath();
               ctx.moveTo(lastX.current, lastY.current);
               ctx.lineTo(x, y);
               ctx.stroke();
               
               highlightedDistance.current += dist;
               
               if (highlightedDistance.current > 1800 && !isCompleted) {
                  setIsCompleted(true);
                  setTimeout(() => {
                     onComplete();
                  }, 1200);
               }
           }
           lastX.current = x;
           lastY.current = y;
       } else {
           lastX.current = -1;
       }
       
       animFrame = requestAnimationFrame(drawLoop);
    };
    
    animFrame = requestAnimationFrame(drawLoop);
    
    const handlePointerDown = (e: PointerEvent) => {
       if (isCompleted) return;
       const rect = canvas.getBoundingClientRect();
       lastX.current = e.clientX - rect.left;
       lastY.current = e.clientY - rect.top;
       
       const handlePointerMove = (e: PointerEvent) => {
           if (isCompleted) return;
           const cx = e.clientX - rect.left;
           const cy = e.clientY - rect.top;
           const dx = cx - lastX.current;
           const cy_dy = cy - lastY.current;
           const dist = Math.sqrt(dx*dx + cy_dy*cy_dy);
           
           if (dist > 2) {
               ctx.lineCap = 'round';
               ctx.lineJoin = 'round';
               ctx.lineWidth = 36;
               ctx.strokeStyle = 'rgba(253, 224, 71, 0.85)';
               
               ctx.beginPath();
               ctx.moveTo(lastX.current, lastY.current);
               ctx.lineTo(cx, cy);
               ctx.stroke();
               
               highlightedDistance.current += dist;
               if (highlightedDistance.current > 1800 && !isCompleted) {
                  setIsCompleted(true);
                  setTimeout(() => {
                     onComplete();
                  }, 1200);
               }
               lastX.current = cx;
               lastY.current = cy;
           }
       };
       
       const handlePointerUp = () => {
           window.removeEventListener('pointermove', handlePointerMove);
           window.removeEventListener('pointerup', handlePointerUp);
           lastX.current = -1;
       };
       
       window.addEventListener('pointermove', handlePointerMove);
       window.addEventListener('pointerup', handlePointerUp);
    };
    
    canvas.addEventListener('pointerdown', handlePointerDown);
    
    return () => {
       cancelAnimationFrame(animFrame);
       window.removeEventListener('resize', resizeCanvas);
       canvas.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isCompleted, onComplete, globalHandStateRef]);

  return (
    <div className={`absolute inset-0 z-[100] w-full h-full flex flex-col items-center justify-center bg-paper transition-opacity duration-1000 ${isCompleted ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
       <div ref={containerRef} className="relative max-w-2xl px-12 py-16 bg-white shadow-xl rotate-[1deg] border border-ink-soft/20 mx-4">
           {/* Text */}
           <p className="font-typewriter text-3xl md:text-4xl leading-[1.8] text-ink-black/90 relative z-10 whitespace-pre-line text-center select-none font-bold tracking-tight">
              {QUOTE_TEXT}
           </p>
           
           {/* Canvas Overlay for Highlighter */}
           <canvas 
             ref={canvasRef}
             className="absolute inset-0 w-full h-full z-20 cursor-crosshair touch-none"
             style={{ mixBlendMode: 'multiply' }}
           />
       </div>
       <div className="mt-12 text-ink-soft font-hand text-2xl animate-pulse flex items-center gap-2">
          <span className="text-3xl">✍️</span> 挥动手势（或用鼠标拖拽）为这句箴言划上重点
       </div>
    </div>
  );
}

export default function DiagnosticLab({
  onActivateBoost,
  onStrategicQuitRequest,
  onQuizComplete,
  onExitQuiz,
  onOpenGames,
  defaultTab = 'diagnostic',
  hideTabsControl = false,
  initialPhase = 'intro',
  globalHandStateRef
}: DiagnosticLabProps) {
  const [activeTab, setActiveTab] = useState<'diagnostic' | 'momentum'>(defaultTab);
  const [selectedGame, setSelectedGame] = useState<'rhythm' | 'breath'>('rhythm');
  const [phase, setPhase] = useState<'intro' | 'quiz' | 'verdict'>(initialPhase);

  // Question State
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const answersRef = useRef<number[]>([]);
  const [testCompleted, setTestCompleted] = useState<boolean>(false);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);

  // Carousel State
  const currentIdxRef = useRef(0);
  const carouselContainerRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef<number>(0);
  const dragStartYRef = useRef<number>(0);
  const scrollXRef = useRef<number>(0); 
  const currentScrollXRef = useRef<number>(0); 
  const pullYRef = useRef<number>(0); 
  const isDraggingRef = useRef<boolean>(false);
  const isProcessingSelectionRef = useRef<boolean>(false);
  const requiresRepinchRef = useRef<boolean>(false);
  const isPinchingRef = useRef<boolean>(false); // mirror of hand pinch state for the render loop
  const isHandTrackingActiveRef = useRef<boolean>(false);
  const smoothedHandXRef = useRef<number>(0);
  const smoothedHandYRef = useRef<number>(0);
  // Plan C — Axis lock: first few frames decide whether gesture is H or V
  const axisLockRef = useRef<'none' | 'h' | 'v'>('none');
  const axisAccRef = useRef<{ dx: number; dy: number; frames: number }>({ dx: 0, dy: 0, frames: 0 });
  // Verdict button dwell refs (for hand gesture activation)
  const verdictDwellRef = useRef<{ side: 'path' | 'game' | null; timer: number; armed: boolean }>({ side: null, timer: 0, armed: false });
  const pathBtnRef = useRef<HTMLButtonElement>(null);
  const gameBtnRef = useRef<HTMLButtonElement>(null);
  // Live rawDx/rawDy from hand tracking — read by verdict dwell logic
  const handRawDxRef = useRef<number>(0);
  const handRawDyRef = useRef<number>(0);

  // Plan A — Dwell: hold still to arm, then swipe up to confirm
  const dwellTimerRef = useRef<number>(0);
  const dwellArmedRef = useRef<boolean>(false);   // true = ring filled, waiting for swipe-up
  const dwellTriggeredRef = useRef<boolean>(false);

  useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);

  // Reset carousel position when switching between quiz and verdict screens
  // so the verdict carousel opens centered on the first card.
  useEffect(() => {
    scrollXRef.current = 0;
    currentScrollXRef.current = 0;
    pullYRef.current = 0;
    isDraggingRef.current = false;
  }, [testCompleted]);

  // Common Momentum Meter
  const [momentumMeter, setMomentumMeter] = useState<number>(30); // 0 to 100
  const [isBoostActive, setIsBoostActive] = useState<boolean>(false);
  const [boostTimeLeft, setBoostTimeLeft] = useState<number>(0);
  const [comboText, setComboText] = useState<string>('');
  const [boostFlash, setBoostFlash] = useState<'none' | 'in' | 'hold' | 'out'>('none');

  // Rhythm timing game variables
  const [streak, setStreak] = useState<number>(0);
  const [isPlayingRhythm, setIsPlayingRhythm] = useState<boolean>(false);
  const [sweepAngle, setSweepAngle] = useState<number>(0);
  const [comboFlash, setComboFlash] = useState<boolean>(false);
  const sweepAngleRef = useRef<number>(0);
  const requestRef = useRef<number | null>(null);


  // Breathing game variables
  const [breathingPhase, setBreathingPhase] = useState<'idle' | 'inhale' | 'hold' | 'exhale' | 'done'>('idle');
  const [breathProgress, setBreathProgress] = useState<number>(0); // 0 to 100
  const [breathTimer, setBreathTimer] = useState<number>(0);
  const [breathLog, setBreathLog] = useState<string>('🧘 点击开始，跟随 4-7-8 节律，吐出废气、吸入笃定。');

  // 1. Core Jet-Booster Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isBoostActive && boostTimeLeft > 0) {
      interval = setInterval(() => {
        setBoostTimeLeft((prev) => {
          if (prev <= 0.1) {
            setIsBoostActive(false);
            onActivateBoost(false);
            return 0;
          }
          return Number((prev - 0.1).toFixed(1));
        });
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isBoostActive, boostTimeLeft, onActivateBoost]);

  // 2. Rhythm Game Loop (Sweep angle)
  useEffect(() => {
    const runSweep = () => {
      if (isPlayingRhythm && selectedGame === 'rhythm') {
        sweepAngleRef.current = (sweepAngleRef.current + 3.9) % 360;
        setSweepAngle(sweepAngleRef.current);
        requestRef.current = requestAnimationFrame(runSweep);
      }
    };
    if (isPlayingRhythm && selectedGame === 'rhythm') {
      requestRef.current = requestAnimationFrame(runSweep);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlayingRhythm, selectedGame]);


  // Keyboard binding for timing game
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab === 'momentum' && selectedGame === 'rhythm' && isPlayingRhythm && e.code === 'Space') {
        e.preventDefault();
        triggerRhythmTap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTab, selectedGame, isPlayingRhythm, sweepAngle]);

  // 4-7-8 Breathing Loop controller
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (activeTab === 'momentum' && selectedGame === 'breath' && breathingPhase !== 'idle' && breathingPhase !== 'done') {
      timer = setInterval(() => {
        setBreathTimer((prev) => {
          let duration = 4; // inhale
          if (breathingPhase === 'hold') duration = 7;
          if (breathingPhase === 'exhale') duration = 8;

          const nextTime = prev + 0.1;
          const percentage = Math.min((nextTime / duration) * 100, 100);
          setBreathProgress(percentage);

          if (nextTime >= duration) {
            // Transition phase
            if (breathingPhase === 'inhale') {
              setBreathingPhase('hold');
              setBreathProgress(0);
              setBreathLog('🧘 憋气中 Hold Breath (7s) • 放空身心，汲取底层安定力...');
              return 0;
            } else if (breathingPhase === 'hold') {
              setBreathingPhase('exhale');
              setBreathProgress(0);
              setBreathLog('💨 呼气 Exhale (8s) • 均匀吐气，释放大脑中全部焦虑与阻碍...');
              return 0;
            } else if (breathingPhase === 'exhale') {
              setBreathingPhase('done');
              setBreathProgress(100);
              setBreathLog('✨ 正念呼吸循环完成！内心已复归清静，100% 动力气流爆满！');
              // Trigger instant physics boost
              triggerBreakthroughBoost();
              return 0;
            }
          }
          return nextTime;
        });
      }, 100);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [breathingPhase, selectedGame, activeTab]);


  const handleSelectOption = (score: number, letter: string) => {
    if (isProcessingSelectionRef.current || testCompleted) return;
    
    isProcessingSelectionRef.current = true;
    setSelectedLetter(letter);
    
    // Slight delay for UI feedback
    setTimeout(() => {
      const nextAnswers = [...answersRef.current, score];
      answersRef.current = nextAnswers;
      setAnswers(nextAnswers);
      
      if (currentIdxRef.current < DIAGNOSTIC_QUESTIONS.length - 1) {
        setCurrentIdx(prev => prev + 1);
        setSelectedLetter(null);
        // Reset scroll position for next question
        scrollXRef.current = 0;
        currentScrollXRef.current = 0;
        pullYRef.current = 0;
        
        // Force the user to physically release their pinch before the next action
        requiresRepinchRef.current = true;
        isProcessingSelectionRef.current = false;
      } else {
        setTestCompleted(true);
        pullYRef.current = 0;
        
        const total = nextAnswers.reduce((a, b) => a + b, 0);
        if (total >= 9) {
          setMomentumMeter(75); // very primed
        } else {
          setMomentumMeter(45);
        }

        // Notify parent of the storytelling trajectory resolution
        if (onQuizComplete) {
          let verdictStr: 'THE_DIP' | 'CUL_DE_SAC' | 'CLIFF' = 'THE_DIP';
          if (total <= 4) verdictStr = 'CLIFF';
          else if (total <= 8) verdictStr = 'CUL_DE_SAC';
          onQuizComplete(verdictStr);
        }
        
        // Force release before taking verdict actions
        requiresRepinchRef.current = true;
        isProcessingSelectionRef.current = false;
      }
    }, 400);
  };

  // Go back to the previous question (undo last answer) — triggered by pull-down gesture
  const handleGoBack = () => {
    if (isProcessingSelectionRef.current || testCompleted) return;
    if (currentIdxRef.current <= 0) return; // already on the first question

    isProcessingSelectionRef.current = true;
    setSelectedLetter(null);

    setTimeout(() => {
      // Drop the most recent answer so the question can be re-answered
      const prevAnswers = answersRef.current.slice(0, -1);
      answersRef.current = prevAnswers;
      setAnswers(prevAnswers);

      setCurrentIdx(prev => Math.max(0, prev - 1));

      // Reset carousel position for the previous question
      scrollXRef.current = 0;
      currentScrollXRef.current = 0;
      pullYRef.current = 0;

      // Require the pinch to be released before the next action
      requiresRepinchRef.current = true;
      isProcessingSelectionRef.current = false;
    }, 300);
  };

  // Verdict final choice handler
  const handleVerdictChoice = (choice: 'path' | 'game') => {
    if (isProcessingSelectionRef.current) return;
    isProcessingSelectionRef.current = true;
    setSelectedLetter(choice); // Reuse this state for visual feedback

    setTimeout(() => {
      if (choice === 'path') {
        if (onExitQuiz) onExitQuiz();
      } else {
        if (onExitQuiz) onExitQuiz();
        if (onOpenGames) onOpenGames();
      }
      isProcessingSelectionRef.current = false;
    }, 400);
  };

  // 4. Carousel Physics Loop
  useEffect(() => {
    let animFrame: number;
    const runSwipeLoop = () => {
      if (activeTab === 'diagnostic') {
        if (globalHandStateRef?.current.isActive) {
          isHandTrackingActiveRef.current = true;
          const { x, y } = globalHandStateRef.current;

          if (!isDraggingRef.current) {
            isDraggingRef.current = true;
            dragStartXRef.current = x;
            dragStartYRef.current = y;
            smoothedHandXRef.current = x;
            smoothedHandYRef.current = y;
            // Fresh gesture — reset axis lock and dwell
            axisLockRef.current = 'none';
            axisAccRef.current = { dx: 0, dy: 0, frames: 0 };
            dwellTimerRef.current = 0;
            dwellArmedRef.current = false;
            dwellTriggeredRef.current = false;
          }

          // Low-pass filter — 0.30 gives responsive tracking without jitter
          smoothedHandXRef.current += (x - smoothedHandXRef.current) * 0.30;
          smoothedHandYRef.current += (y - smoothedHandYRef.current) * 0.30;

          const H_SENSITIVITY = 3.5;
          const rawDx = (smoothedHandXRef.current - dragStartXRef.current) * H_SENSITIVITY;
          const rawDy = (smoothedHandYRef.current - dragStartYRef.current) * H_SENSITIVITY;
          dragStartXRef.current = smoothedHandXRef.current;
          dragStartYRef.current = smoothedHandYRef.current;
          // Share with verdict dwell logic below
          handRawDxRef.current = rawDx;
          handRawDyRef.current = rawDy;

          // ── Plan C: Axis Lock ──────────────────────────────────────────
          // Accumulate |dx| vs |dy| for the first 6 frames, then commit to one axis.
          if (axisLockRef.current === 'none') {
            axisAccRef.current.dx += Math.abs(rawDx);
            axisAccRef.current.dy += Math.abs(rawDy);
            axisAccRef.current.frames++;
            if (axisAccRef.current.frames >= 4) {
              axisLockRef.current = axisAccRef.current.dx >= axisAccRef.current.dy ? 'h' : 'v';
            }
          }

          // Only apply the locked axis component
          const dx = axisLockRef.current === 'v' ? 0 : rawDx;
          // (No vertical pull in hand mode — dwell replaces it)

          // Cool-down after a selection: reset once hand moves away significantly
          if (requiresRepinchRef.current) {
            if (Math.abs(rawDx) > 20 || Math.abs(rawDy) > 20) {
              requiresRepinchRef.current = false;
              axisLockRef.current = 'none';
              axisAccRef.current = { dx: 0, dy: 0, frames: 0 };
              dwellTimerRef.current = 0;
              dwellArmedRef.current = false;
              dwellTriggeredRef.current = false;
            }
          } else {
            // Horizontal scroll (only when axis is H or still undecided)
            if (axisLockRef.current !== 'v') {
              scrollXRef.current += dx;
            }
            if (testCompleted) {
              scrollXRef.current = Math.max(-300, Math.min(0, scrollXRef.current));
            }

            const closestIndex = Math.max(0, Math.min(testCompleted ? 1 : 2, Math.round(-scrollXRef.current / 300)));
            const distanceToCenter = Math.abs(scrollXRef.current + closestIndex * 300);

            // Magnetic snap when moving slowly
            if (Math.abs(dx) < 6) {
              scrollXRef.current += ((-closestIndex * 300) - scrollXRef.current) * 0.25;
            }

            // ── Plan A: Dwell → Armed → Swipe-up to confirm ────────────────
            const isHandStill = Math.abs(rawDx) < 5 && Math.abs(rawDy) < 5;
            const isCardCentered = distanceToCenter < 100;

            if (dwellArmedRef.current) {
              // ARMED: let pullY accumulate so card animates upward
              if (rawDy < 0) {
                pullYRef.current += rawDy; // swipe up → card moves up
              } else {
                pullYRef.current += (0 - pullYRef.current) * 0.15; // spring back if not pulling
              }

              if (pullYRef.current < -75) {
                // Threshold crossed → fly away and confirm
                pullYRef.current = -800;
                dwellArmedRef.current = false;
                dwellTriggeredRef.current = true;
                requiresRepinchRef.current = true;
                if (!testCompleted) {
                  const activeQ = DIAGNOSTIC_QUESTIONS[currentIdxRef.current];
                  handleSelectOption(activeQ.options[closestIndex].score, activeQ.options[closestIndex].letter);
                } else {
                  handleVerdictChoice(closestIndex === 0 ? 'path' : 'game');
                }
                dwellTimerRef.current = 0;
              } else if (Math.abs(rawDx) > 18 || rawDy > 18) {
                // Moved away — cancel arm, spring card back
                dwellArmedRef.current = false;
                dwellTimerRef.current = 0;
                pullYRef.current += (0 - pullYRef.current) * 0.3;
              }
              // While armed: hard-snap scrollX so card doesn't drift
              scrollXRef.current += ((-closestIndex * 300) - scrollXRef.current) * 0.4;
            } else {
              // Non-armed: spring pullY back to 0
              pullYRef.current += (0 - pullYRef.current) * 0.2;

              // DWELL ACCUMULATION: still + centered + axis decided
              const dwellReady = isHandStill && isCardCentered && axisLockRef.current !== 'none' && !dwellTriggeredRef.current;
              if (dwellReady) {
                dwellTimerRef.current = Math.min(dwellTimerRef.current + 1 / 60, 1.5);
                if (dwellTimerRef.current >= 1.5) {
                  dwellArmedRef.current = true; // ring full — now waiting for swipe-up
                }
              } else {
                dwellTimerRef.current = Math.max(0, dwellTimerRef.current - 1 / 60 * 3);
                if (dwellTimerRef.current === 0) dwellTriggeredRef.current = false;
              }
            }
          }
        } else {
          if (isHandTrackingActiveRef.current) {
            isHandTrackingActiveRef.current = false;
            isDraggingRef.current = false;
            requiresRepinchRef.current = false;
            isPinchingRef.current = false;
            axisLockRef.current = 'none';
            axisAccRef.current = { dx: 0, dy: 0, frames: 0 };
            dwellTimerRef.current = 0;
            dwellArmedRef.current = false;
            dwellTriggeredRef.current = false;
          }
        }
        
        if (!isDraggingRef.current) {
          if (pullYRef.current > -500) {
            pullYRef.current += (0 - pullYRef.current) * 0.15;
          }
          const closestIndex = Math.max(0, Math.min(testCompleted ? 1 : 2, Math.round(-scrollXRef.current / 300)));
          scrollXRef.current += ((-closestIndex * 300) - scrollXRef.current) * 0.1;
        }

        currentScrollXRef.current += (scrollXRef.current - currentScrollXRef.current) * 0.25;

        // Render transforms onto DOM cards — the quiz carousel and the verdict
        // carousel share carouselContainerRef (only one is mounted at a time).
        if (carouselContainerRef.current) {
          const maxIdx = testCompleted ? 1 : 2;
          const cards = carouselContainerRef.current.children;
          let cardIdx = 0;
          for (let i = 0; i < cards.length; i++) {
             const card = cards[i] as HTMLElement;
             if (!card.classList.contains('option-card')) continue;

             const targetX = (cardIdx * 300) + currentScrollXRef.current;
             const absX = Math.abs(targetX);
             const scale = Math.max(0.75, 1 - (absX / 800));
             const opacity = Math.max(0.3, 1 - (absX / 600));

             let yOffset = 0;
             const closestIndex = Math.max(0, Math.min(maxIdx, Math.round(-currentScrollXRef.current / 300)));
             const upHint = card.querySelector('.pull-hint-overlay') as HTMLElement;
             const backHint = card.querySelector('.pull-back-overlay') as HTMLElement;
             const isCenter = cardIdx === closestIndex;

             if (isHandTrackingActiveRef.current) {
               // Hand mode: apply pullY to centered card so swipe-up animates
               if (isCenter) yOffset = pullYRef.current;

               if (upHint) {
                 if (isCenter && dwellArmedRef.current) {
                   upHint.style.opacity = '1';
                   const span = upHint.querySelector('span');
                   if (span) span.textContent = '↑ swipe up';
                 } else if (isCenter && dwellTimerRef.current > 0.05) {
                   const p = dwellTimerRef.current / 1.5;
                   upHint.style.opacity = Math.min(p * 2, 1).toString();
                   const span = upHint.querySelector('span');
                   if (span) {
                     const filled = Math.floor(p * 3);
                     span.textContent = '●'.repeat(filled) + '○'.repeat(3 - filled);
                   }
                 } else {
                   upHint.style.opacity = '0';
                 }
               }
               if (backHint) backHint.style.opacity = '0';
             } else {
               // Mouse mode: show pull-up / pull-down hints based on pullY
               if (isCenter) {
                 yOffset = pullYRef.current;
                 const mag = Math.min(Math.abs(yOffset) / 80, 1).toString();
                 if (upHint) upHint.style.opacity = yOffset < 0 ? mag : '0';
                 if (backHint) backHint.style.opacity = yOffset > 0 ? mag : '0';
               } else {
                 if (upHint) upHint.style.opacity = '0';
                 if (backHint) backHint.style.opacity = '0';
               }
             }

             card.style.outline = 'none';
             card.style.transform = `translateX(${targetX}px) translateY(${yOffset}px) scale(${scale})`;
             card.style.opacity = opacity.toString();
             card.style.zIndex = isCenter ? '20' : '10';
             
             cardIdx++;
          }
        }
      }
      animFrame = requestAnimationFrame(runSwipeLoop);
    };

    animFrame = requestAnimationFrame(runSwipeLoop);
    return () => cancelAnimationFrame(animFrame);
  }, [activeTab, testCompleted, globalHandStateRef]);

  const triggerBreakthroughBoost = () => {
    setIsBoostActive(true);
    setBoostTimeLeft(9.5);
    onActivateBoost(true);
    setMomentumMeter(0);
    setIsPlayingRhythm(false);

    // In-place burst animation
    setBoostFlash('hold');
    setTimeout(() => setBoostFlash('out'), 900);
    setTimeout(() => setBoostFlash('none'), 1800);
  };

  // Game 1 Action: Rhythm Tap
  const triggerRhythmTap = () => {
    if (!isPlayingRhythm) return;
    const angle = sweepAngle;
    // optimal Target zone is roughly 100deg to 160deg
    const targetStart = 100;
    const targetEnd = 160;
    const isInside = angle >= targetStart && angle <= targetEnd;

    setComboFlash(true);
    setTimeout(() => setComboFlash(false), 130);

    if (isInside) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      const gain = Math.min(15 + nextStreak * 2, 35);
      const nextMeter = Math.min(momentumMeter + gain, 100);
      setMomentumMeter(nextMeter);
      
      const praises = ["Nice timing!", "In the zone!", "Momentum +", "Micro step+", "Consistency wins!"];
      setComboText(`🎯 ${praises[Math.floor(Math.random() * praises.length)]} +${gain}% (Combo: ${nextStreak})`);

      if (nextMeter >= 100) {
        triggerBreakthroughBoost();
      }
    } else {
      setStreak(0);
      setComboText(`❌ Clicked off-target (Daily chain broken)`);
      setMomentumMeter((prev) => Math.max(prev - 8, 0));
    }
  };


  // Game 3 Action: Manage breathing
  const handleStartBreath = () => {
    setBreathingPhase('inhale');
    setBreathProgress(0);
    setBreathTimer(0);
    setBreathLog('👃 吸气 Inhale (4s) • 关注鼻腔气流，感知周围安静的力量...');
  };

  const handleResetBreath = () => {
    setBreathingPhase('idle');
    setBreathProgress(0);
    setBreathTimer(0);
    setBreathLog('🧘 点击开始，跟随 4-7-8 节律，吐出废气、吸入笃定。');
  };



  const handleResetDiagnostic = () => {
    setCurrentIdx(0);
    setAnswers([]);
    setTestCompleted(false);
    setSelectedLetter(null);
    if (onQuizComplete) {
      onQuizComplete(null);
    }
  };

  const getDiagnosticVerdict = () => {
    if (answers.length === 0) return null;
    const sum = answers.reduce((a, b) => a + b, 0);

    // Matching exact logic of App's expected onQuizComplete
    if (sum >= 9) {
      return {
        type: 'THE_DIP',
        title: 'THE DIP — 真正的黄金低谷',
        badgeColor: 'bg-ink-black text-paper border-ink-black',
        textColor: 'text-ink-black',
        scoreLabel: `${sum} / 12`,
        description: '恭喜，你处于真正的黄金低谷！Godin指出，低谷是阻挡平庸大众的天然壁垒，正是这种痛苦才赋予了你最终成果一骑绝尘的稀缺尊贵性。不要退缩，这是你的主战场。',
      };
    } else if (sum >= 5) {
      return {
        type: 'CUL_DE_SAC',
        title: 'CUL-DE-SAC — 空转死胡同',
        badgeColor: 'bg-paper text-ink-black border-ink-black',
        textColor: 'text-ink-black',
        scoreLabel: `${sum} / 12`,
        description: '你现在遇到的是不温不火的死胡同。在这个路口你怎么玩，未来都无法由于稀缺性带来几何级的跃升。Godin 强调：在死胡同里坚持就是资源浪费，是战术勤奋掩盖了战略止损。',
      };
    } else {
      return {
        type: 'CLIFF',
        title: 'THE CLIFF — 虚假的诱饵悬崖',
        badgeColor: 'bg-paper text-ink-black border-ink-black border-dashed',
        textColor: 'text-ink-black',
        scoreLabel: `${sum} / 12`,
        description: '警惕！这就是最危险的温水悬崖。由于不甘心沉没成本或害怕社会评价（面子），你在假装抗争。继续死撑极有可能导致心理能量和资源彻底爆仓毁灭。',
      };
    }
  };

  const activeQuestion = DIAGNOSTIC_QUESTIONS[currentIdx];
  const verdict = getDiagnosticVerdict();

  return (
    <div className="bg-paper border border-ink-black/20 overflow-hidden flex flex-col animate-fade-in relative min-h-[600px]" id="survival-diagnostic-lab">


      {phase === 'intro' && (
        <QuoteHighlighter 
          globalHandStateRef={globalHandStateRef} 
          onComplete={() => setPhase('quiz')} 
        />
      )}
      
      {/* 1. Lab Header — hidden when quiz modal (hideTabsControl + diagnostic) */}
      {!(hideTabsControl && activeTab === 'diagnostic') && (
      <div className="border-b border-ink-black/15 flex flex-row items-center justify-between px-5 py-3.5 bg-paper gap-3" id="lab-tab-banner">
        <div className="flex items-center gap-2.5">
          <p className="font-mono text-[11px] text-ink-soft tracking-widest">
            {activeTab === 'momentum' ? 'stress-relief cabin' : 'inner diagnostic center'}
          </p>
          {isBoostActive && (
            <span className="text-[10px] bg-ink-black text-paper px-1.5 py-0.5 font-mono">BOOST</span>
          )}
        </div>

        {/* Primary view controls */}
        {!hideTabsControl && (
          <div className="flex bg-paper p-1 border border-ink-black/20 relative z-10" id="lab-tab-triggers">
            <button
              onClick={() => { setActiveTab('diagnostic'); }}
              className={`px-3 py-1.5 text-2xs font-bold transition-all cursor-pointer btn-press border ${
                activeTab === 'diagnostic'
                  ? 'bg-paper-warm text-ink-black border-ink-black'
                  : 'text-ink-soft border-transparent hover:text-ink-black'
              }`}
            >
              自测问卷
            </button>
            <button
              onClick={() => { setActiveTab('momentum'); }}
              className={`px-3 py-1.5 text-2xs font-bold transition-all cursor-pointer flex items-center gap-1.5 btn-press border ${
                activeTab === 'momentum'
                  ? 'bg-paper-warm text-ink-black border-ink-black'
                  : 'text-ink-soft border-transparent hover:text-ink-black'
              }`}
            >
              解压游戏
              {momentumMeter > 80 && !isBoostActive && (
                <span className="w-2 h-2 rounded-full bg-ink-black animate-ping"></span>
              )}
            </button>
          </div>
        )}
      </div>
      )}

      {/* 2. Interactive Area content */}
      <div className="p-5 font-sans min-h-[320px] flex flex-col" id="lab-inner-core">
        
        {/* Tab A: Diagnostic Questionnaire */}
        {activeTab === 'diagnostic' && (
          <div className="flex-1 flex flex-col justify-between" id="diagnostic-tab-view">
            {!testCompleted ? (
              <div className="flex flex-col gap-4 animate-fade-in">
                {/* Gauge header */}
                <div className="flex justify-between items-center text-4xs font-mono text-ink-soft leading-none">
                  <span>Godin's Core Self-Verification</span>
                  <span>Question {currentIdx + 1} of {DIAGNOSTIC_QUESTIONS.length}</span>
                </div>
                
                {/* Progress dot row */}
                <div className="flex gap-2 w-full mt-1.5">
                  {DIAGNOSTIC_QUESTIONS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 transition-all duration-300 border border-ink-black ${
                        i === currentIdx
                          ? 'bg-ink-black scale-y-125'
                          : i < currentIdx
                          ? 'bg-ink-black/40'
                          : 'bg-paper-warm'
                      }`}
                    />
                  ))}
                </div>

                {/* Question box */}
                <div className="bg-paper border border-ink-black/20 p-4 mt-1.5">
                  <span className="text-[10px] text-ink-soft font-mono tracking-wide block mb-1">
                    Step {activeQuestion.id} · Decision Scan
                  </span>
                  <h4 className="text-xs md:text-sm font-bold text-ink-black leading-relaxed font-serif italic tracking-wide">
                    {activeQuestion.text}
                  </h4>
                </div>

                {/* Horizontal Carousel Options */}
                <div 
                  ref={carouselContainerRef}
                  className="flex relative mt-4 mb-2 min-h-[220px] items-center justify-center overflow-visible touch-none"
                  onPointerDown={(e) => {
                    if (globalHandStateRef?.current.isActive) return;
                    isDraggingRef.current = true;
                    dragStartXRef.current = e.clientX;
                    dragStartYRef.current = e.clientY;
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (globalHandStateRef?.current.isActive || !isDraggingRef.current) return;
                    const dx = e.clientX - dragStartXRef.current;
                    const dy = e.clientY - dragStartYRef.current;
                    
                    scrollXRef.current += dx;
                    const closestIndex = Math.max(0, Math.min(2, Math.round(-scrollXRef.current / 300)));
                    const distanceToCenter = Math.abs(scrollXRef.current + closestIndex * 300);
                    
                    const canGoBack = currentIdx > 0;
                    if (distanceToCenter < 100 && (dy < 0 || canGoBack)) {
                      pullYRef.current += dy; // up = select, down = back
                    } else {
                      pullYRef.current += (0 - pullYRef.current) * 0.2;
                    }

                    dragStartXRef.current = e.clientX;
                    dragStartYRef.current = e.clientY;
                  }}
                  onPointerUp={(e) => {
                    if (globalHandStateRef?.current.isActive || !isDraggingRef.current) return;
                    isDraggingRef.current = false;
                    e.currentTarget.releasePointerCapture(e.pointerId);

                    const closestIndex = Math.max(0, Math.min(2, Math.round(-scrollXRef.current / 300)));
                    if (pullYRef.current < -75) {
                      const activeOpt = activeQuestion.options[closestIndex];
                      handleSelectOption(activeOpt.score, activeOpt.letter);
                      pullYRef.current = -500;
                    } else if (pullYRef.current > 75 && currentIdx > 0) {
                      handleGoBack();
                      pullYRef.current = 0;
                    } else {
                      scrollXRef.current = -closestIndex * 300;
                      pullYRef.current = 0;
                    }
                  }}
                  onPointerCancel={(e) => {
                    if (globalHandStateRef?.current.isActive) return;
                    isDraggingRef.current = false;
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  }}
                >
                  {/* Central alignment guide */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-px bg-ink-black/10 -translate-x-1/2 pointer-events-none" />

                  {activeQuestion.options.map((opt, idx) => (
                    <div 
                      key={opt.letter}
                      className="option-card absolute w-[260px] min-h-[160px] bg-paper border border-ink-black/20 p-5 select-none flex flex-col justify-center cursor-grab active:cursor-grabbing origin-center"
                    >
                      {/* Pull Up Hint Overlay (select) */}
                      <div className="pull-hint-overlay absolute -top-8 left-0 right-0 flex justify-center opacity-0 pointer-events-none transition-opacity">
                        <span className="bg-ink-black px-3 py-1 text-[10px] font-mono text-paper whitespace-nowrap tracking-wide">
                          ↑ 捏住上拉 · 确认
                        </span>
                      </div>

                      {/* Pull Down Hint Overlay (back) */}
                      {currentIdx > 0 && (
                        <div className="pull-back-overlay absolute -bottom-8 left-0 right-0 flex justify-center opacity-0 pointer-events-none transition-opacity">
                          <span className="bg-paper px-3 py-1 border border-ink-black/40 text-[10px] font-mono text-ink-black whitespace-nowrap tracking-wide">
                            ↓ 捏住下拉 · 返回
                          </span>
                        </div>
                      )}

                      <div className="flex gap-4 items-start font-sans">
                        <span className="w-10 h-10 text-lg font-medium font-mono border bg-paper border-ink-black/25 text-ink-black flex items-center justify-center shrink-0">
                          {opt.letter}
                        </span>
                        <p className="flex-1 font-sans font-medium leading-relaxed text-sm md:text-base">
                          {opt.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-3xs text-ink-soft text-center mt-3 border border-ink-black/15 p-2 bg-paper mx-auto max-w-sm font-mono">
                  ← 左右浏览 · 停住锁定 · 上划确认 →
                </p>
              </div>
            ) : (
              // Test Complete Verdict prescription
              <div className="flex flex-col gap-6 animate-fade-in" id="diagnostic-conclusion">
                <div className="flex items-center justify-between border-b border-ink-black/15 pb-4">
                  <span className="text-[10px] font-mono text-ink-soft uppercase tracking-widest">Diagnostic Result</span>
                  <button
                    onClick={handleResetDiagnostic}
                    className="px-3 py-1 border border-ink-black/30 hover:border-ink-black text-[10px] font-mono text-ink-soft hover:text-ink-black cursor-pointer transition-colors bg-paper"
                  >
                    ↩ retake test
                  </button>
                </div>

                {verdict && (
                  <div className="flex flex-col animate-fade-in">

                    {/* Hero — black for THE_DIP (echoes canvas black void), cream for others */}
                    <div className={`px-8 py-10 flex flex-col gap-3 ${verdict.type === 'THE_DIP' ? 'bg-ink-black' : 'bg-paper'}`}>
                      <span className={`font-mono text-[10px] uppercase tracking-[0.25em] ${verdict.type === 'THE_DIP' ? 'text-paper/35' : 'text-ink-soft'}`}>
                        score: {verdict.scoreLabel}
                      </span>
                      <h2 className={`text-4xl md:text-5xl font-serif italic leading-none tracking-tight ${verdict.type === 'THE_DIP' ? 'text-paper' : 'text-ink-black'}`}>
                        {verdict.title.includes('—') ? verdict.title.split('—')[0].trim() : verdict.title}
                      </h2>
                      {verdict.title.includes('—') && (
                        <p className={`font-mono text-[11px] ${verdict.type === 'THE_DIP' ? 'text-paper/40' : 'text-ink-soft'}`}>
                          {verdict.title.split('—')[1]?.trim()}
                        </p>
                      )}
                    </div>

                    <div className="h-px bg-ink-black/10" />

                    {/* Description */}
                    <div className="px-8 py-6">
                      <p className="text-sm font-serif italic text-ink-black/70 leading-relaxed max-w-prose">
                        {verdict.description}
                      </p>
                    </div>

                    {/* Actions — same carousel mechanic as the quiz:
                        swipe left/right to browse, dwell to lock, swipe up to confirm */}
                    <div
                      ref={carouselContainerRef}
                      className="flex relative mt-4 mb-2 min-h-[200px] items-center justify-center overflow-visible touch-none"
                      onPointerDown={(e) => {
                        if (globalHandStateRef?.current.isActive) return;
                        isDraggingRef.current = true;
                        dragStartXRef.current = e.clientX;
                        dragStartYRef.current = e.clientY;
                        e.currentTarget.setPointerCapture(e.pointerId);
                      }}
                      onPointerMove={(e) => {
                        if (globalHandStateRef?.current.isActive || !isDraggingRef.current) return;
                        const dx = e.clientX - dragStartXRef.current;
                        const dy = e.clientY - dragStartYRef.current;

                        scrollXRef.current += dx;
                        const closestIndex = Math.max(0, Math.min(1, Math.round(-scrollXRef.current / 300)));
                        const distanceToCenter = Math.abs(scrollXRef.current + closestIndex * 300);

                        if (distanceToCenter < 100 && dy < 0) {
                          pullYRef.current += dy; // up = confirm
                        } else {
                          pullYRef.current += (0 - pullYRef.current) * 0.2;
                        }

                        dragStartXRef.current = e.clientX;
                        dragStartYRef.current = e.clientY;
                      }}
                      onPointerUp={(e) => {
                        if (globalHandStateRef?.current.isActive || !isDraggingRef.current) return;
                        isDraggingRef.current = false;
                        e.currentTarget.releasePointerCapture(e.pointerId);

                        const closestIndex = Math.max(0, Math.min(1, Math.round(-scrollXRef.current / 300)));
                        if (pullYRef.current < -75) {
                          handleVerdictChoice(closestIndex === 0 ? 'path' : 'game');
                          pullYRef.current = -500;
                        } else {
                          scrollXRef.current = -closestIndex * 300;
                          pullYRef.current = 0;
                        }
                      }}
                      onPointerCancel={(e) => {
                        if (globalHandStateRef?.current.isActive) return;
                        isDraggingRef.current = false;
                        e.currentTarget.releasePointerCapture(e.pointerId);
                      }}
                    >
                      {/* Central alignment guide */}
                      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-ink-black/10 -translate-x-1/2 pointer-events-none" />

                      {/* Card 0 — back to path */}
                      <div className="option-card absolute w-[260px] min-h-[150px] bg-paper border border-ink-black/20 p-5 select-none flex flex-col justify-center cursor-grab active:cursor-grabbing origin-center">
                        <div className="pull-hint-overlay absolute -top-8 left-0 right-0 flex justify-center opacity-0 pointer-events-none transition-opacity">
                          <span className="bg-ink-black px-3 py-1 text-[10px] font-mono text-paper whitespace-nowrap tracking-wide">
                            ↑ 捏住上拉 · 确认
                          </span>
                        </div>
                        <div className="flex gap-4 items-center font-sans">
                          <span className="w-10 h-10 text-lg font-medium font-mono border bg-paper border-ink-black/25 text-ink-black flex items-center justify-center shrink-0">↩</span>
                          <div className="flex-1">
                            <p className="font-sans font-medium leading-relaxed text-sm md:text-base text-ink-black">回到路径</p>
                            <p className="font-mono text-[10px] text-ink-soft tracking-widest uppercase mt-1">back to path</p>
                          </div>
                        </div>
                      </div>

                      {/* Card 1 — play games */}
                      <div className="option-card absolute w-[260px] min-h-[150px] bg-ink-black border border-ink-black p-5 select-none flex flex-col justify-center cursor-grab active:cursor-grabbing origin-center">
                        <div className="pull-hint-overlay absolute -top-8 left-0 right-0 flex justify-center opacity-0 pointer-events-none transition-opacity">
                          <span className="bg-ink-black px-3 py-1 text-[10px] font-mono text-paper whitespace-nowrap tracking-wide">
                            ↑ 捏住上拉 · 确认
                          </span>
                        </div>
                        <div className="flex gap-4 items-center font-sans">
                          <span className="w-10 h-10 text-lg font-medium font-mono border bg-ink-black border-paper/30 text-paper flex items-center justify-center shrink-0">▶</span>
                          <div className="flex-1">
                            <p className="font-sans font-medium leading-relaxed text-sm md:text-base text-paper">玩解压游戏</p>
                            <p className="font-mono text-[10px] text-paper/50 tracking-widest uppercase mt-1">play games</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-3xs text-ink-soft text-center mt-1 mb-6 border border-ink-black/15 p-2 bg-paper mx-auto max-w-sm font-mono">
                      ← 左右浏览 · 停住锁定 · 上划确认 →
                    </p>

                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab B: Three Switchable Energy Micro-Games Deck */}
        {activeTab === 'momentum' && (
          <div className="flex-1 flex flex-col gap-4 animate-fade-in" id="momentum-tab-view">
            
            {/* Game selector — Timing + Breathing only */}
            <div className="flex items-center border-b border-ink-black/15 pb-3" id="sub-games-selector">
              <div className="flex gap-1" id="game-selectors-array">
                <button
                  onClick={() => { setSelectedGame('rhythm'); setComboText(''); }}
                  className={`px-4 py-1.5 text-[10px] font-mono cursor-pointer transition border ${
                    selectedGame === 'rhythm'
                      ? 'bg-paper-warm border-ink-black text-ink-black font-extrabold'
                      : 'text-ink-soft border-transparent hover:text-ink-black'
                  }`}
                >
                  Timing
                </button>
                <button
                  onClick={() => { setSelectedGame('breath'); setComboText(''); handleResetBreath(); }}
                  className={`px-4 py-1.5 text-[10px] font-mono cursor-pointer transition border ${
                    selectedGame === 'breath'
                      ? 'bg-paper-warm border-ink-black text-ink-black font-extrabold'
                      : 'text-ink-soft border-transparent hover:text-ink-black'
                  }`}
                >
                  Breathing
                </button>
              </div>
            </div>

            {/* Sub-Game Area Panel */}
            <div className="flex-1 flex flex-col min-h-[220px]" id="selected-subgame-playground">
              
              {/* Game Mode 1: Rhythm Timing Sweep — large centered circle */}
              {selectedGame === 'rhythm' && (
                <div className="flex flex-col items-center gap-8 py-6" id="rhythm-timing-game-block">

                  {/* Keyframes for in-place boost burst */}
                  <style>{`
                    @keyframes boost-shake {
                      0%,100% { transform: translate(0,0) rotate(0deg); }
                      10%  { transform: translate(-6px, 3px) rotate(-2deg); }
                      20%  { transform: translate(6px,-4px) rotate(2deg); }
                      30%  { transform: translate(-5px, 4px) rotate(-1.5deg); }
                      40%  { transform: translate(5px,-3px) rotate(1.5deg); }
                      50%  { transform: translate(-4px, 2px) rotate(-1deg); }
                      60%  { transform: translate(3px,-2px) rotate(1deg); }
                      70%  { transform: translate(-2px, 1px); }
                      85%  { transform: translate(1px,-1px); }
                    }
                    @keyframes ring-burst {
                      0%   { transform: scale(1);   opacity: 0.55; }
                      100% { transform: scale(2.8); opacity: 0; }
                    }
                    @keyframes bar-flash {
                      0%,100% { opacity: 1; }
                      30%     { opacity: 0.25; }
                      60%     { opacity: 0.9; }
                    }
                  `}</style>

                  {/* Large clock circle — shakes on boost */}
                  <div
                    className="relative w-[220px] h-[220px] flex items-center justify-center"
                    style={{ animation: boostFlash === 'hold' ? 'boost-shake 0.55s ease-in-out' : 'none' }}
                  >
                    <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 100 100">
                      {/* Outer track */}
                      <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(10,10,10,0.08)" strokeWidth="1" />
                      {/* Target zone arc */}
                      <circle
                        cx="50" cy="50" r="46"
                        fill="none"
                        stroke="rgba(10,10,10,0.70)"
                        strokeWidth="3"
                        strokeDasharray="48.1 241.0"
                        strokeDashoffset={-48.1 * 1.66}
                      />
                    </svg>

                    {/* Burst rings — expand outward on boost */}
                    {boostFlash !== 'none' && [0, 160, 320].map((delay, i) => (
                      <div
                        key={i}
                        className="absolute inset-0 rounded-full border border-ink-black/35 pointer-events-none"
                        style={{ animation: `ring-burst 0.85s ease-out ${delay}ms forwards` }}
                      />
                    ))}

                    {/* Sweep hand */}
                    <div
                      className="absolute w-[44%] h-[1px] bg-ink-black origin-left left-[50%] top-[50%]"
                      style={{ transform: `translateY(-50%) rotate(${sweepAngle - 90}deg)` }}
                    />

                    {/* Center button */}
                    <div
                      className="w-20 h-20 rounded-full border border-ink-black/20 flex items-center justify-center transition-colors duration-300"
                      style={{ background: boostFlash === 'hold' ? '#0a0a0a' : '#fdfbf5' }}
                    >
                      {isBoostActive ? (
                        <span
                          className="font-mono text-[11px] transition-colors duration-300"
                          style={{ color: boostFlash === 'hold' ? '#fdfbf5' : '#0a0a0a' }}
                        >
                          {boostFlash === 'hold' ? 'boost' : `${boostTimeLeft}s`}
                        </span>
                      ) : isPlayingRhythm ? (
                        <span className="text-[9px] font-mono text-ink-black/50 uppercase tracking-widest">focus</span>
                      ) : (
                        <button
                          onClick={() => setIsPlayingRhythm(true)}
                          className="w-full h-full rounded-full flex items-center justify-center cursor-pointer hover:bg-paper-warm transition-colors"
                        >
                          <Play className="w-5 h-5 fill-current text-ink-black opacity-60" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full max-w-xs flex flex-col gap-1.5">
                    <div className="flex justify-between text-[10px] font-mono text-ink-soft">
                      <span>momentum</span>
                      <span>{momentumMeter}%</span>
                    </div>
                    <div
                      className="w-full bg-paper-warm h-1 border-b border-ink-black/15"
                      style={{ animation: boostFlash === 'hold' ? 'bar-flash 0.5s ease-in-out' : 'none' }}
                    >
                      <div className="bg-ink-black h-full transition-all duration-200" style={{ width: `${momentumMeter}%` }} />
                    </div>
                    {streak > 1 && (
                      <p className="text-[10px] font-mono text-ink-soft mt-0.5">{streak}× chain — keep tempo</p>
                    )}
                  </div>

                  {/* Tap button */}
                  <button
                    disabled={!isPlayingRhythm || isBoostActive}
                    onClick={triggerRhythmTap}
                    className="px-8 py-2 border border-ink-black/30 hover:border-ink-black text-[10px] font-mono text-ink-black disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors bg-paper"
                  >
                    {isPlayingRhythm ? 'space / tap' : '▶ start'}
                  </button>
                </div>
              )}

              {/* Game Mode 2: Guided 4-7-8 Breathing — centered large circle, mirrors Timing layout */}
              {selectedGame === 'breath' && (
                <div className="flex flex-col items-center gap-8 py-6" id="breathing-game-block">

                  {/* Large breathing circle — scales with phase */}
                  <div className="relative w-[220px] h-[220px] flex items-center justify-center">
                    {/* Outer track ring */}
                    <div className="absolute inset-0 rounded-full border border-ink-black/8" />

                    {/* Breathing core — scales in/out */}
                    <div
                      className="rounded-full flex items-center justify-center transition-all"
                      style={{
                        transitionDuration: breathingPhase === 'inhale' ? '4000ms' :
                                            breathingPhase === 'hold'   ? '100ms'  :
                                            breathingPhase === 'exhale' ? '8000ms' : '400ms',
                        transitionTimingFunction: 'ease-in-out',
                        width:  breathingPhase === 'inhale' || breathingPhase === 'hold' ? '190px' : '90px',
                        height: breathingPhase === 'inhale' || breathingPhase === 'hold' ? '190px' : '90px',
                        background: breathingPhase === 'idle' || breathingPhase === 'done'
                          ? 'transparent'
                          : `rgba(10,10,10,${breathingPhase === 'inhale' ? 0.88 : breathingPhase === 'hold' ? 0.70 : 0.45})`,
                        border: '1px solid rgba(10,10,10,0.18)',
                      }}
                    >
                      <span className="font-mono text-[9px] tracking-widest uppercase select-none"
                        style={{ color: breathingPhase === 'idle' || breathingPhase === 'done' ? 'rgba(10,10,10,0.35)' : '#fdfbf5' }}>
                        {breathingPhase === 'inhale' ? 'inhale'
                          : breathingPhase === 'hold'   ? 'hold'
                          : breathingPhase === 'exhale' ? 'exhale'
                          : breathingPhase === 'done'   ? 'done'
                          : '4 · 7 · 8'}
                      </span>
                    </div>
                  </div>

                  {/* Phase progress bar */}
                  <div className="w-full max-w-xs flex flex-col gap-1.5">
                    <div className="flex justify-between text-[10px] font-mono text-ink-soft">
                      <span>
                        {breathingPhase === 'inhale' ? 'inhale · 4s'
                          : breathingPhase === 'hold'   ? 'hold · 7s'
                          : breathingPhase === 'exhale' ? 'exhale · 8s'
                          : breathingPhase === 'done'   ? 'complete'
                          : '4 · 7 · 8 breathing'}
                      </span>
                      <span>{Math.round(breathProgress)}%</span>
                    </div>
                    <div className="w-full bg-paper-warm h-1 border-b border-ink-black/15">
                      <div className="bg-ink-black h-full transition-all duration-200" style={{ width: `${breathProgress}%` }} />
                    </div>
                  </div>

                  {/* Start / reset button */}
                  {breathingPhase === 'idle' || breathingPhase === 'done' ? (
                    <button
                      onClick={handleStartBreath}
                      className="px-8 py-2 border border-ink-black/30 hover:border-ink-black text-[10px] font-mono text-ink-black transition-colors cursor-pointer bg-paper"
                    >
                      ▶ start
                    </button>
                  ) : (
                    <button
                      onClick={handleResetBreath}
                      className="px-8 py-2 border border-ink-black/20 border-dashed text-[10px] font-mono text-ink-black/50 hover:text-ink-black transition-colors cursor-pointer bg-paper"
                    >
                      reset
                    </button>
                  )}
                </div>
              )}

            </div>

            {/* Bottom Real-time terminal feedback for the selected game */}
            {comboText && (
              <div className="bg-paper border border-ink-black/30 px-4 py-2 text-3xs font-mono text-ink-black flex items-center justify-between" id="game-feedback-bar">
                <span className="text-ink-soft tracking-wide">log</span>
                <span className="font-bold text-ink-black">{comboText.replace(/[🎯❌🫧✨👃💨🧘🚀🔥]/g, '').trim()}</span>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
