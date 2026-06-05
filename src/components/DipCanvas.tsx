import React, { useEffect, useRef, useState } from 'react';
import { CurvePreset, DipMilestone, BallState, HandState, Particle, SimulationStats } from '../types';
import { getCurveY, getVerdictCurveY, getVerdictCurveSlope, updatePhysics } from '../utils/physics';

// Dynamic script loader for dynamic MediaPipe client setups without bundling errors
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

// 2.0: Hand cursor — alternating white/black rings, visible on any background
function drawHandCursor(ctx: CanvasRenderingContext2D, landmarks: any, width: number, height: number) {
  const indexTip = landmarks[8];
  const px = (1 - indexTip.x) * width;
  const py = indexTip.y * height;

  ctx.save();

  // Outer white ring (black background)
  ctx.beginPath();
  ctx.arc(px, py, 13.5, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(253, 251, 245, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner black ring (cream background)
  ctx.beginPath();
  ctx.arc(px, py, 11, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(10, 10, 10, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Center white dot + black outline
  ctx.beginPath();
  ctx.arc(px, py, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#fdfbf5';
  ctx.fill();
  ctx.strokeStyle = '#0a0a0a';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

interface DipCanvasProps {
  preset: CurvePreset;
  dragMode: 'push' | 'spring' | 'assist';
  gravityMultiplier: number;
  frictionMultiplier: number;
  ballMass: number;
  stats: SimulationStats;
  onStatsChange: (updater: (prev: SimulationStats) => SimulationStats) => void;
  onMilestoneTrigger: (milestone: DipMilestone | null) => void;
  onBreakthrough: () => void;
  boosterActive?: boolean;
  quizVerdict?: 'THE_DIP' | 'CUL_DE_SAC' | 'CLIFF' | null;
  onWallCollision?: () => void;
  isModalOpen?: boolean;
  showQuizPromptAlert?: boolean;
  onAcceptQuiz?: () => void;
  onRejectQuiz?: () => void;
  onRetakeTest?: () => void;
  onOpenGames?: () => void;
  onOpenRead?: () => void;
  globalHandStateRef?: React.MutableRefObject<{ x: number; y: number; isPinching: boolean; isActive: boolean; pinchRatio: number }>;
}

export default function DipCanvas({
  preset,
  dragMode,
  gravityMultiplier,
  frictionMultiplier,
  ballMass,
  stats,
  onStatsChange,
  onMilestoneTrigger,
  onBreakthrough,
  boosterActive = false,
  quizVerdict = null,
  onWallCollision,
  isModalOpen = false,
  showQuizPromptAlert = false,
  onAcceptQuiz,
  onRejectQuiz,
  onRetakeTest,
  onOpenGames,
  onOpenRead,
  globalHandStateRef,
}: DipCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Core Physics and Entities State stored in refs to prevent React state sync rendering thrashing
  const ballRef = useRef<BallState>({
    x: 100,
    y: 100,
    vx: 0,
    vy: 0,
    radius: 12,
    mass: ballMass,
    isDragging: false,
  });

  const handRef = useRef<HandState>({
    x: -500,
    y: -500,
    vx: 0,
    vy: 0,
    radius: 32,
    isGrabbing: false,
    isActive: false,
  });

  const particlesRef = useRef<Particle[]>([]);
  const flashRef = useRef<number>(0); // breakthrough white flash life 0→1→0
  const lastActiveMilestoneId = useRef<string | null>(null);
  const hasTriggeredBreakthrough = useRef<boolean>(false);
  // Only show milestone labels after the user has pushed the ball at least once
  const everPushedRef = useRef<boolean>(false);
  const consecutiveBottomTimeRef = useRef<number>(0);

  // Visual/UI states
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 });
  const [hoveredMilestone, setHoveredMilestone] = useState<DipMilestone | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // Initial state is 1.0 (Zoom disabled)

  // Camera Smooth Interp Refs
  const cameraXRef = useRef(400); // centers on default width/2
  const cameraYRef = useRef(225); // centers on default height/2
  const cameraZoomRef = useRef(1.0);

  // Webcam Pose and MediaPipe Hand Tracking state
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [webcamLoading, setWebcamLoading] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraInstanceRef = useRef<any>(null);
  const handsInstanceRef = useRef<any>(null);
  const handLandmarksRef = useRef<any>(null);
  const prevIsPinching = useRef<boolean>(false);
  const cursorRef = useRef<HTMLDivElement>(null);
  const modalOpenRef = useRef<boolean>(false);
  const showQuizPromptAlertRef = useRef<boolean>(false);

  // Canvas overlay gesture target
  const diagnoseCircleRef = useRef<{ cx: number; cy: number; r: number } | null>(null);
  const dwellTimerRef = useRef<number>(0);
  const dwellTriggeredRef = useRef<boolean>(false);
  // Legacy hit refs (kept for mouse click fallback)
  const diagnoseHitRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const skipHitRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    modalOpenRef.current = !!isModalOpen;
    showQuizPromptAlertRef.current = !!showQuizPromptAlert;
  }, [isModalOpen, showQuizPromptAlert]);

  const cleanupWebcam = () => {
    // Stop camera instance
    if (cameraInstanceRef.current) {
      try {
        cameraInstanceRef.current.stop();
      } catch (e) {}
      cameraInstanceRef.current = null;
    }

    // Close hands instance
    if (handsInstanceRef.current) {
      try {
        handsInstanceRef.current.close();
      } catch (e) {}
      handsInstanceRef.current = null;
    }

    // Stop tracks of stream
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    handLandmarksRef.current = null;
    handRef.current.isActive = false;
  };

  const toggleWebcam = async () => {
    if (webcamEnabled) {
      cleanupWebcam();
      setWebcamEnabled(false);
      setWebcamError(null);
    } else {
      setWebcamLoading(true);
      setWebcamError(null);
      try {
        // 1. Load CDN scripts
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');

        // Check if camera is accessible and get media stream
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 320, height: 240, facingMode: "user" } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        const HandsClass = (window as any).Hands;
        const CameraClass = (window as any).Camera;

        if (!HandsClass || !CameraClass) {
          throw new Error('MediaPipe script libraries were loaded but could not be initialized in globals.');
        }

        const hands = new HandsClass({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });

        hands.onResults((results: any) => {
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            handLandmarksRef.current = results.multiHandLandmarks[0];
          } else {
            handLandmarksRef.current = null;
          }
        });

        const videoElement = videoRef.current;
        if (videoElement) {
          const camera = new CameraClass(videoElement, {
            onFrame: async () => {
              if (videoElement && (videoElement.readyState >= 2)) {
                await hands.send({ image: videoElement });
              }
            },
            width: 320,
            height: 240,
          });

          cameraInstanceRef.current = camera;
          handsInstanceRef.current = hands;
          await camera.start();
        }

        setWebcamEnabled(true);
      } catch (err: any) {
        console.error('Camera startup error:', err);
        setWebcamError(err.message || '启动摄像头失败。请检查系统设置与浏览器网页权限。');
        cleanupWebcam();
      } finally {
        setWebcamLoading(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      cleanupWebcam();
    };
  }, []);

  // Auto-start cam on mount
  useEffect(() => {
    toggleWebcam();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track cursor velocity
  const prevHandPos = useRef({ x: 0, y: 0, t: Date.now() });

  useEffect(() => {
    // Reset ball mass when it changes
    ballRef.current.mass = ballMass;
  }, [ballMass]);

  // Handle ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        let { width, height } = entry.contentRect;
        // Ensure reasonable minimums and ratio
        width = width || 800;
        height = Math.max(height, 420);
        setDimensions({ width, height });

        // Safely adjust ball position relative to new width and height
        const currentRelX = ballRef.current.x / (dimensions.width || 800);
        const nextX = currentRelX * width;
        const nextY = getCurveY(currentRelX, preset.curvePoints) * height - ballRef.current.radius - 20;

        ballRef.current.x = nextX || 100;
        ballRef.current.y = nextY || 100;
        ballRef.current.vx = 0;
        ballRef.current.vy = 0;
        hasTriggeredBreakthrough.current = false;
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [preset.curvePoints]);

  // Reset ball position on preset change
  useEffect(() => {
    const startX = 50; // Place it on the initial ramp
    const startRelX = startX / dimensions.width;
    const startY = getCurveY(startRelX, preset.curvePoints) * dimensions.height - 50;

    ballRef.current = {
      x: startX,
      y: startY,
      vx: 0,
      vy: 0,
      radius: 13,
      mass: ballMass,
      isDragging: false,
    };

    lastActiveMilestoneId.current = null;
    hasTriggeredBreakthrough.current = false;
    everPushedRef.current = false;
    onMilestoneTrigger(null);
  }, [preset, dimensions.width]);

  // 2.0: Spawn small ink-dot scatter — monochrome
  const spawnExplosion = (x: number, y: number, _color: string, count: number = 8, speed: number = 200) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const mag = (0.2 + Math.random() * 0.6) * speed;
      const size = 1.5 + Math.random() * 3;
      const maxLife = 0.4 + Math.random() * 0.5;
      newParticles.push({
        id: Math.random().toString(),
        x,
        y,
        vx: Math.cos(angle) * mag,
        vy: Math.sin(angle) * mag,
        color: '#0a0a0a',
        size,
        life: 1.0,
        maxLife,
      });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];
  };

  // 2.0: Spawn expanding ripple ring (ink drop on paper)
  const spawnRipple = (x: number, y: number, maxR: number = 40) => {
    particlesRef.current = [...particlesRef.current, {
      id: Math.random().toString(),
      x, y,
      vx: 0, vy: 0,
      color: '#0a0a0a',
      size: 1,
      life: 1.0,
      maxLife: 0.7,
      isRipple: true,
      currentRadius: 4,
      maxRadius: maxR,
    }];
  };

  // Safe direct manual reset to beginning of the dip
  const handleBallReset = () => {
    const startX = 50;
    const startRelX = startX / dimensions.width;
    const startY = getVerdictCurveY(startRelX, preset.curvePoints, quizVerdict) * dimensions.height - 40;

    ballRef.current = {
      x: startX,
      y: startY,
      vx: 0,
      vy: 0,
      radius: 13,
      mass: ballMass,
      isDragging: false,
    };

    hasTriggeredBreakthrough.current = false;
    lastActiveMilestoneId.current = null;
    onMilestoneTrigger(null);

    // Add particle explosion at starting point
    spawnExplosion(startX, startY, '#10b981', 12, 160);

    onStatsChange(prev => ({
      ...prev,
      timesReset: prev.timesReset + 1,
      motivationLevel: Math.min(100, prev.motivationLevel + 15),
    }));
  };

  // Main game / simulation loop
  useEffect(() => {
    let animationId: number;
    let lastTime = Date.now();

    const loop = () => {
      const now = Date.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05); // cap dt at 50ms to prevent extreme lags exploding physics
      lastTime = now;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { width, height } = dimensions;

      // 1. Grab and update Hand pointer velocity
      const hand = handRef.current;

      // Update position via webcam hand detection if active and landmarks found
      if (webcamEnabled && handLandmarksRef.current) {
        const indexTip = handLandmarksRef.current[8]; // Index finger tip is index 8
        const thumbTip = handLandmarksRef.current[4];

        // Map strictly back to canvas dimensions for high sensitivity and responsive physics feeling
        const screenX = (1 - indexTip.x) * width;
        const screenY = indexTip.y * height;

        const targetX = screenX;
        const targetY = screenY;

        if (hand.isActive) {
          hand.x += (targetX - hand.x) * 0.45; // smooth noise filtering
          hand.y += (targetY - hand.y) * 0.45;
        } else {
          hand.x = targetX;
          hand.y = targetY;
        }
        hand.isActive = true;

        const dx = thumbTip.x - indexTip.x;
        const dy = thumbTip.y - indexTip.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        // Scale-invariant pinch: normalize the thumb–index gap by the palm size
        // (wrist[0] → middle-finger MCP[9]) so distance from the camera doesn't matter.
        const wrist = handLandmarksRef.current[0];
        const middleMcp = handLandmarksRef.current[9];
        const palmSize = Math.hypot(wrist.x - middleMcp.x, wrist.y - middleMcp.y) || 0.0001;
        const pinchRatio = dist / palmSize; // ~0.2–0.35 when pinched, ~0.8+ when open
        // Hysteresis: harder to engage (0.4) than to release (0.6) → no flicker.
        const isPinching = prevIsPinching.current ? pinchRatio < 0.6 : pinchRatio < 0.4;

        let smoothedClientX = 0;
        let smoothedClientY = 0;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          smoothedClientX = hand.x + rect.left;
          smoothedClientY = hand.y + rect.top;
        }

        if (globalHandStateRef) {
          globalHandStateRef.current = {
            x: smoothedClientX,
            y: smoothedClientY,
            isPinching: isPinching,
            isActive: true,
            pinchRatio: pinchRatio
          };
        }

        // Pinch — check diagnose circle first, then DOM fallback
        if (isPinching && !prevIsPinching.current) {
          if (showQuizPromptAlertRef.current && diagnoseCircleRef.current) {
            const canvasRect = canvas?.getBoundingClientRect();
            if (canvasRect) {
              const hx = ((smoothedClientX - canvasRect.left) / canvasRect.width) * width;
              const hy = ((smoothedClientY - canvasRect.top) / canvasRect.height) * height;
              const { cx, cy, r } = diagnoseCircleRef.current;
              if (Math.hypot(hx - cx, hy - cy) <= r + 22) {
                if (onAcceptQuiz) onAcceptQuiz();
              }
            }
          } else {
            const el = document.elementFromPoint(smoothedClientX, smoothedClientY);
            if (el instanceof HTMLElement) {
              el.click();
            }
          }
        }
        prevIsPinching.current = isPinching;

        // Hand cursor is drawn on canvas — keep HTML div hidden always
        if (cursorRef.current) {
          cursorRef.current.style.display = 'none';
        }

      } else {
        hand.isActive = false;
        if (cursorRef.current) {
          cursorRef.current.style.display = 'none';
        }
        if (globalHandStateRef) {
          globalHandStateRef.current.isActive = false;
        }
      }

      const curTime = Date.now();
      const timeDiff = (curTime - prevHandPos.current.t) / 1000;
      if (timeDiff > 0.005) {
        hand.vx = (hand.x - prevHandPos.current.x) / timeDiff;
        hand.vy = (hand.y - prevHandPos.current.y) / timeDiff;

        prevHandPos.current = { x: hand.x, y: hand.y, t: curTime };
      }

      // Smooth hand velocity a bit to avoid extreme friction micro-spikes
      hand.vx *= 0.85;
      hand.vy *= 0.85;

      // 2. Resolve general physical interactions
      let ball = ballRef.current;
      const { newBall, collisionForce, wasPushed, hitWall } = updatePhysics(
        ball,
        hand,
        preset.curvePoints,
        width,
        height,
        gravityMultiplier,
        frictionMultiplier,
        dragMode,
        dt,
        boosterActive,
        quizVerdict
      );
      ballRef.current = newBall;

      if (hitWall) {
        // 2.0: wall impact — small black ink scatter + ripple
        spawnRipple(newBall.x + newBall.radius, newBall.y, 28);
        for (let i = 0; i < 6; i++) {
          particlesRef.current.push({
            id: Math.random().toString(),
            x: newBall.x + newBall.radius,
            y: newBall.y + (Math.random() - 0.5) * 20,
            vx: -Math.random() * 100 - 30,
            vy: (Math.random() - 0.5) * 80,
            color: '#0a0a0a',
            size: 1.5 + Math.random() * 2.5,
            life: 0.8,
            maxLife: 0.5,
          });
        }
        if (onWallCollision) {
          onWallCollision();
        }
      }

      // 2.0: Subtle dust trail — very faint ink marks
      const speed = Math.sqrt(newBall.vx * newBall.vx + newBall.vy * newBall.vy);
      const isRolling = Math.abs(newBall.y - getVerdictCurveY(newBall.x / width, preset.curvePoints, quizVerdict) * height + newBall.radius) < 6;
      if (speed > 20 && isRolling && Math.random() < 0.15) {
        particlesRef.current.push({
          id: Math.random().toString(),
          x: newBall.x - (newBall.vx / (speed || 1)) * newBall.radius,
          y: newBall.y + newBall.radius - 2,
          vx: (Math.random() - 0.5) * 20,
          vy: -Math.random() * 15 - 5,
          color: 'rgba(10, 10, 10, 0.25)',
          size: 1 + Math.random() * 2,
          life: 1.0,
          maxLife: 0.3 + Math.random() * 0.3,
        });
      }

      // 2.0: Booster — subtle upward white dot stream
      if (boosterActive && Math.random() < 0.12) {
        particlesRef.current.push({
          id: Math.random().toString(),
          x: newBall.x + (Math.random() - 0.5) * 30,
          y: newBall.y + newBall.radius + 8,
          vx: (Math.random() - 0.5) * 20,
          vy: -Math.random() * 60 - 80,
          color: 'rgba(253, 251, 245, 0.8)',
          size: 2 + Math.random() * 2,
          life: 1.0,
          maxLife: 0.5 + Math.random() * 0.4,
        });
      }

      // 2.0: Impact ripple for significant pushes
      if (collisionForce > 40) {
        spawnRipple(newBall.x, newBall.y, Math.min(50, collisionForce * 0.6));
      }

      // 3. Track Stats and Milestone triggers
      const currentRelX = newBall.x / width;
      const resultsPct = Math.round((1 - (newBall.y / height)) * 100);

      // Stat Updates
      onStatsChange((prev) => {
        let maxResults = Math.max(prev.maxResults, resultsPct);
        let absoluteInDip = currentRelX >= 0.25 && currentRelX <= 0.65;
        let timeInDip = prev.timeInDip;
        let effortSpent = prev.effortSpent;

        if (absoluteInDip) {
          timeInDip += dt;
          consecutiveBottomTimeRef.current += dt;
        } else {
          consecutiveBottomTimeRef.current = 0;
        }

        if (wasPushed) {
          if (!everPushedRef.current) everPushedRef.current = true;
          // Effort scales with speed pushed and weight of the ball
          const baseEffortPower = Math.sqrt(hand.vx * hand.vx + hand.vy * hand.vy) || 20;
          effortSpent += (baseEffortPower * ballRef.current.mass * 0.005) * dt * 10;
        }

        // Deconstructive motivation check: if you spend consecutive long times deep in the dip, motivation slightly trickles down
        let selectMotivation = prev.motivationLevel;
        if (absoluteInDip && Math.random() < 0.004) {
          selectMotivation = Math.max(10, prev.motivationLevel - 1);
        }

        return {
          ...prev,
          maxResults,
          timeInDip,
          effortSpent,
          motivationLevel: selectMotivation,
        };
      });

      // Find closest milestone based on proximity along x relative path
      let triggerMilestone: DipMilestone | null = null;
      let closestDist = 0.08; // trigger threshold
      preset.milestones.forEach((m) => {
        const dx = Math.abs(currentRelX - m.x);
        if (dx < closestDist) {
          triggerMilestone = m;
          closestDist = dx;
        }
      });

      if (triggerMilestone) {
        const milestoneCast = triggerMilestone as DipMilestone;
        if (lastActiveMilestoneId.current !== milestoneCast.id) {
          lastActiveMilestoneId.current = milestoneCast.id;
          onMilestoneTrigger(milestoneCast);

          // 2.0: milestone ripple rings instead of colored explosion
          const mx = milestoneCast.x * width;
          const my = getVerdictCurveY(milestoneCast.x, preset.curvePoints, quizVerdict) * height;
          spawnRipple(mx, my, 36);
          spawnRipple(mx, my, 60);
          spawnExplosion(mx, my, '#0a0a0a', 6, 120);

          // Boost motivation on hitting normal milestones
          onStatsChange(prev => ({
            ...prev,
            motivationLevel: Math.min(100, prev.motivationLevel + 8)
          }));
        }
      }

      // Check Ultimate Breakthrough at far right
      if (currentRelX >= 0.96 && !hasTriggeredBreakthrough.current) {
        hasTriggeredBreakthrough.current = true;
        onBreakthrough();

        // 2.0: Breakthrough — white flash + cascading ripples
        flashRef.current = 1.0;
        for (let j = 0; j < 5; j++) {
          setTimeout(() => {
            spawnRipple(width * 0.9, height * 0.15, 80 + j * 20);
            spawnExplosion(width * 0.9, height * 0.15, '#0a0a0a', 8, 200);
          }, j * 120);
        }

        onStatsChange(prev => ({
          ...prev,
          breakthroughCount: prev.breakthroughCount + 1,
          motivationLevel: 100, // Recover complete motivation!
        }));
      }

      // If ball falls back into the deep dip valley, reset breakthrough checker so they can succeed again
      if (currentRelX < 0.6 && hasTriggeredBreakthrough.current) {
        hasTriggeredBreakthrough.current = false;
      }

      // Update particles decay (ripples expand, dots move)
      particlesRef.current = particlesRef.current
        .map((p) => {
          if (p.isRipple) {
            const progress = 1 - p.life;
            return {
              ...p,
              currentRadius: 4 + progress * ((p.maxRadius || 40) - 4),
              life: p.life - dt / p.maxLife,
            };
          }
          return {
            ...p,
            x: p.x + p.vx * dt,
            y: p.y + p.vy * dt,
            vy: p.vy + 60 * dt, // light gravity on dots
            life: p.life - dt / p.maxLife,
          };
        })
        .filter((p) => p.life > 0);

      // Decay flash
      if (flashRef.current > 0) {
        flashRef.current = Math.max(0, flashRef.current - dt * 2.5);
      }

      // 3.5 Dwell timer — accumulate when hand hovers over diagnose circle
      if (showQuizPromptAlertRef.current && diagnoseCircleRef.current && !dwellTriggeredRef.current) {
        const { cx, cy, r } = diagnoseCircleRef.current;
        const handOver = hand.isActive && Math.hypot(hand.x - cx, hand.y - cy) < r + 22;
        if (handOver) {
          dwellTimerRef.current += dt;
          if (dwellTimerRef.current >= 1.2) {
            dwellTriggeredRef.current = true;
            dwellTimerRef.current = 1.2;
            if (onAcceptQuiz) onAcceptQuiz();
          }
        } else {
          // Decay quickly when hand leaves
          dwellTimerRef.current = Math.max(0, dwellTimerRef.current - dt * 2.5);
        }
      }

      // 4. DRAW GRAPHICS CANVAS
      ctx.clearRect(0, 0, width, height);

      // Interpolate camera zoom and focal offsets smoothly
      let targetCamX = width / 2;
      let targetCamY = height / 2;
      
      // If zoomed in, follow the ball so it remains dynamically framed
      if (zoomLevel > 1.05) {
        targetCamX = ballRef.current.x;
        targetCamY = ballRef.current.y;
        
        // Prevent camera from scoping past the borders of the interactive board
        const halfBoxWidth = width / (2 * zoomLevel);
        const halfBoxHeight = height / (2 * zoomLevel);
        targetCamX = Math.max(halfBoxWidth, Math.min(width - halfBoxWidth, targetCamX));
        targetCamY = Math.max(halfBoxHeight, Math.min(height - halfBoxHeight, targetCamY));
      }

      cameraXRef.current += (targetCamX - cameraXRef.current) * 0.085;
      cameraYRef.current += (targetCamY - cameraYRef.current) * 0.085;
      cameraZoomRef.current += (zoomLevel - cameraZoomRef.current) * 0.085;

      // ────────────────────────────────────────────────────────
      // 2.0 VISUAL: CAMERA LAYER — BLACK VOID ABOVE CURVE
      // ────────────────────────────────────────────────────────
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(cameraZoomRef.current, cameraZoomRef.current);
      ctx.translate(-cameraXRef.current, -cameraYRef.current);

      const resolution = 150;

      // A. Fill canvas with paper (cream) as base
      ctx.fillStyle = '#fdfbf5';
      ctx.fillRect(0, 0, width, height);

      // B. Fill area ABOVE the curve with solid black — "The Dip is the darkness"
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width, 0);
      ctx.lineTo(width, getVerdictCurveY(1, preset.curvePoints, quizVerdict) * height);
      for (let k = resolution; k >= 0; k--) {
        const rx = k / resolution;
        ctx.lineTo(rx * width, getVerdictCurveY(rx, preset.curvePoints, quizVerdict) * height);
      }
      ctx.closePath();
      ctx.fillStyle = '#0a0a0a';
      ctx.fill();

      // G1. Booster: subtle cream upward dashes in the dip zone
      if (boosterActive) {
        ctx.save();
        ctx.strokeStyle = 'rgba(253, 251, 245, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 12]);
        const phaseShift = -Math.floor((Date.now() / 18) % 100);
        for (let colX = width * 0.28; colX <= width * 0.78; colX += 48) {
          const curveY = getVerdictCurveY(colX / width, preset.curvePoints, quizVerdict) * height;
          ctx.beginPath();
          ctx.moveTo(colX, curveY - 10);
          ctx.lineTo(colX, 0);
          ctx.lineDashOffset = phaseShift;
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.restore();
      // ────────────────────────────────────────────────────────
      // 2.0 VISUAL: CAMERA LAYER END
      // ────────────────────────────────────────────────────────

      // C. 2.0 Axis labels — minimal mono, paper bg zone
      ctx.fillStyle = '#0a0a0a';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.45;
      ctx.fillText('EFFORT →', width / 2, height - 8);
      ctx.save();
      ctx.translate(13, height * 0.72);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText('RESULTS →', 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1.0;

      // ────────────────────────────────────────────────────────
      // CAMERA TRANSLATION START (GAME WORLD ENTITIES LAYER)
      // ────────────────────────────────────────────────────────
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(cameraZoomRef.current, cameraZoomRef.current);
      ctx.translate(-cameraXRef.current, -cameraYRef.current);

      // D. 2.0: Verdict paths — white lines on black void, monochrome
      const paths: { id: 'THE_DIP' | 'CUL_DE_SAC' | 'CLIFF'; name: string }[] = [
        { id: 'THE_DIP',    name: '黄金低谷 The Dip' },
        { id: 'CUL_DE_SAC', name: '死胡同 Cul-de-Sac' },
        { id: 'CLIFF',      name: '虚假悬崖 The Cliff' },
      ];

      paths.forEach((path) => {
        const isActive = quizVerdict === path.id;
        const isUnknown = quizVerdict === null;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, getVerdictCurveY(0, preset.curvePoints, path.id) * height);
        for (let k = 1; k <= resolution; k++) {
          const rx = k / resolution;
          ctx.lineTo(rx * width, getVerdictCurveY(rx, preset.curvePoints, path.id) * height);
        }
        ctx.lineCap = 'round';

        if (isActive) {
          // Active: crisp white line — the chosen path glows through the darkness
          ctx.strokeStyle = '#fdfbf5';
          ctx.lineWidth = 3;
          ctx.stroke();
          // Label in the black zone
          ctx.fillStyle = 'rgba(253, 251, 245, 0.75)';
          ctx.font = '500 9px JetBrains Mono, monospace';
          ctx.textAlign = 'left';
          ctx.fillText(path.name, 0.78 * width, getVerdictCurveY(0.78, preset.curvePoints, path.id) * height - 10);
        } else if (isUnknown) {
          // Unknown future: faint white dashed paths — pulse when quiz alert active
          const pulse = showQuizPromptAlertRef.current
            ? 0.15 + 0.15 * (0.5 + 0.5 * Math.sin(Date.now() / 500))
            : 0.28;
          ctx.strokeStyle = `rgba(253, 251, 245, ${pulse})`;
          ctx.lineWidth = showQuizPromptAlertRef.current ? 1.5 : 1.2;
          ctx.setLineDash([3, 7]);
          ctx.stroke();
        } else {
          // Excluded: almost invisible
          ctx.strokeStyle = 'rgba(253, 251, 245, 0.08)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 6]);
          ctx.stroke();
        }
        ctx.restore();
      });

      // J. 2.0: Wall of uncertainty — clean minimal vertical line
      if (quizVerdict === null) {
        let curveBottomX = 0.48;
        let maxCurveY = 0;
        for (let i = 0; i < preset.curvePoints.length; i++) {
          const candidateY = getCurveY(preset.curvePoints[i].x, preset.curvePoints);
          if (candidateY > maxCurveY) {
            maxCurveY = candidateY;
            curveBottomX = preset.curvePoints[i].x;
          }
        }
        const forkX = curveBottomX + 0.12;
        const wallXInPx = forkX * width;
        const yCurvePx = getVerdictCurveY(forkX, preset.curvePoints, null) * height;

        ctx.save();
        // Thin white dashed vertical line in the black void
        ctx.strokeStyle = 'rgba(253, 251, 245, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 6]);
        ctx.beginPath();
        ctx.moveTo(wallXInPx, 0);
        ctx.lineTo(wallXInPx, yCurvePx);
        ctx.stroke();
        ctx.setLineDash([]);

        // Minimal label
        ctx.fillStyle = 'rgba(253, 251, 245, 0.5)';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('?', wallXInPx, yCurvePx - 18);
        ctx.restore();
      }

      // E. Draw Text Label: "The Dip" pointing directly at its valley
      // Find relative bottom index of the curve points
      let bottomX = 0.5;
      let bottomY = 0.72;
      // Seek the actual mathematical minimum
      let minY = 0;
      for (let xCheck = 0.2; xCheck <= 0.8; xCheck += 0.01) {
        const val = getVerdictCurveY(xCheck, preset.curvePoints, quizVerdict);
        if (val > minY) { // y is down, so larger is deeper
          minY = val;
          bottomX = xCheck;
          bottomY = val;
        }
      }

      ctx.save();
      const bX = bottomX * width;
      const bY = bottomY * height;

      // 2.0: "The Dip" label — white text floating in the black void above the curve
      // The label lives above the curve (in the black zone), so text is white
      const labelY = bY - 55; // this is above the curve bottom, in the black area
      ctx.fillStyle = 'rgba(253, 251, 245, 0.90)';
      ctx.font = 'italic 22px "Instrument Serif", serif';
      ctx.textAlign = 'center';
      ctx.fillText('The Dip', bX, labelY);

      // Sublabel
      ctx.fillStyle = 'rgba(253, 251, 245, 0.45)';
      ctx.font = '14px "Caveat", cursive';
      ctx.fillText('most quit here', bX, labelY + 16);

      // Subtle downward tick from label to curve boundary
      ctx.strokeStyle = 'rgba(253, 251, 245, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bX, labelY + 20);
      ctx.lineTo(bX, bY - 4);
      ctx.stroke();
      ctx.restore();

      // F. 2.0: Milestone pins — dot on curve + always-visible label in cream zone
      preset.milestones.forEach((m) => {
        const mx = m.x * width;
        const my = getVerdictCurveY(m.x, preset.curvePoints, quizVerdict) * height;
        const isHovered = hoveredMilestone?.id === m.id;
        const isActive = lastActiveMilestoneId.current === m.id;

        // Dot on the curve
        ctx.beginPath();
        ctx.arc(mx, my, isActive || isHovered ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = isActive || isHovered ? '#fdfbf5' : 'rgba(253, 251, 245, 0.45)';
        ctx.fill();

        // Label — only after user has interacted (ball pushed) or on hover
        if ((isActive && everPushedRef.current) || isHovered) {
          ctx.save();

          // Clamp x so label text never clips past canvas edges
          const hMargin = 58;
          const clampedX = Math.max(hMargin, Math.min(width - hMargin, mx));
          const align: CanvasTextAlign =
            clampedX < mx - 3 ? 'right' :
            clampedX > mx + 3 ? 'left'  : 'center';

          // Place 20px below dot (cream zone). If near canvas bottom, flip above into black zone.
          const belowY = my + 20;
          const flipAbove = belowY > height - 16;
          const labelY = flipAbove ? my - 10 : belowY;
          const onBlack = flipAbove;

          ctx.font = '600 9px JetBrains Mono, monospace';
          ctx.textAlign = align;

          // Background pill
          const tw = ctx.measureText(m.name).width;
          const pillH = 14;
          const pillPad = 4;
          const pillX =
            align === 'center' ? clampedX - tw / 2 - pillPad :
            align === 'left'   ? clampedX - pillPad            :
                                 clampedX - tw - pillPad;

          ctx.globalAlpha = 0.92;
          ctx.fillStyle = onBlack ? 'rgba(10,10,10,0.85)' : 'rgba(253,251,245,0.92)';
          ctx.fillRect(pillX, labelY - pillH + 3, tw + pillPad * 2, pillH);

          ctx.globalAlpha = 1.0;
          ctx.fillStyle = onBlack ? '#fdfbf5' : '#0a0a0a';
          ctx.fillText(m.name, clampedX, labelY);

          ctx.restore();
        }
      });

      // G. 2.0: Particles — dots and ripple rings
      particlesRef.current.forEach((p) => {
        ctx.globalAlpha = p.life;
        if (p.isRipple) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.currentRadius || 4, 0, Math.PI * 2);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1.0;

      // H. 2.0: The Ball — alternating white/black rings, visible on any background
      ctx.save();
      const bx = ballRef.current.x;
      const by = ballRef.current.y;
      const ballRadius = ballRef.current.radius;

      // Booster: subtle outer pulse ring
      if (boosterActive) {
        ctx.beginPath();
        ctx.arc(bx, by, ballRadius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(253, 251, 245, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Pure white ball
      ctx.beginPath();
      ctx.arc(bx, by, ballRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#fdfbf5';
      ctx.fill();

      ctx.restore();

      // I. 2.0: Hand cursor — minimal ring
      if (webcamEnabled && handLandmarksRef.current) {
        drawHandCursor(ctx, handLandmarksRef.current, width, height);
      }

      if (hand.isActive && hand.x >= 0 && hand.x <= width) {
        ctx.save();

        // Spring lasso line — thin dashed
        if (dragMode === 'spring' && hand.isGrabbing) {
          ctx.strokeStyle = 'rgba(10, 10, 10, 0.4)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 5]);
          ctx.beginPath();
          ctx.moveTo(hand.x, hand.y);
          ctx.lineTo(ballRef.current.x, ballRef.current.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Outer aura ring
        ctx.beginPath();
        ctx.arc(hand.x, hand.y, hand.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(10, 10, 10, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Alternating rings — visible on both black and cream backgrounds
        const ringR = hand.isGrabbing ? 8 : 11;

        // Outer white ring (visible on black void)
        ctx.beginPath();
        ctx.arc(hand.x, hand.y, ringR + 2.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(253, 251, 245, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner black ring (visible on cream background)
        ctx.beginPath();
        ctx.arc(hand.x, hand.y, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(10, 10, 10, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Center: white dot with black outline
        ctx.beginPath();
        ctx.arc(hand.x, hand.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fdfbf5';
        ctx.fill();
        ctx.strokeStyle = '#0a0a0a';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      }

      ctx.restore();
      // ────────────────────────────────────────────────────────
      // CAMERA TRANSLATION END (GAME WORLD ENTITIES LAYER)
      // ────────────────────────────────────────────────────────

      // J. 2.0: Fog of uncertainty — cream white from the right (the future is blank, not dark)
      if (quizVerdict === null) {
        ctx.save();
        const alertActive = showQuizPromptAlertRef.current;
        // When alert fires, fog expands left and deepens
        const fogStartRel = alertActive ? 0.50 : 0.62;
        const fogStart = fogStartRel * width;
        const fogGradient = ctx.createLinearGradient(fogStart, 0, width, 0);
        fogGradient.addColorStop(0,    'rgba(253, 251, 245, 0.0)');
        fogGradient.addColorStop(0.20, alertActive ? 'rgba(253, 251, 245, 0.80)' : 'rgba(253, 251, 245, 0.7)');
        fogGradient.addColorStop(0.55, 'rgba(253, 251, 245, 0.98)');
        fogGradient.addColorStop(1.0,  'rgba(253, 251, 245, 1.0)');
        ctx.fillStyle = fogGradient;
        ctx.fillRect(fogStart - 4, 0, width - fogStart + 8, height);
        ctx.restore();

        // J2. Quiz prompt canvas overlay — floating text + gesture circle in fog zone
        if (alertActive) {
          ctx.save();
          const fogCX = width * 0.795;
          const fogCY = height * 0.35;

          // Title: "path unknown" — italic serif
          ctx.font = 'italic 19px "Instrument Serif", Georgia, serif';
          ctx.fillStyle = 'rgba(10, 10, 10, 0.72)';
          ctx.textAlign = 'center';
          ctx.fillText('path unknown', fogCX, fogCY);

          // Subtitle
          ctx.font = '9px JetBrains Mono, monospace';
          ctx.fillStyle = 'rgba(10, 10, 10, 0.36)';
          ctx.fillText('three paths diverge ahead', fogCX, fogCY + 16);

          // Gesture circle target
          const circleR = 28;
          const circleCX = fogCX;
          const circleCY = fogCY + 60;

          // Register for hit detection
          diagnoseCircleRef.current = { cx: circleCX, cy: circleCY, r: circleR };
          diagnoseHitRef.current = { x: circleCX - circleR, y: circleCY - circleR, w: circleR * 2, h: circleR * 2 };
          skipHitRef.current = null;

          // Check hand proximity for hover glow
          const handNearby = handRef.current.isActive &&
            Math.hypot(handRef.current.x - circleCX, handRef.current.y - circleCY) < circleR + 22;
          const dwell = Math.min(dwellTimerRef.current / 1.2, 1.0); // 0 → 1 over 1.2s

          // Outer idle ring
          ctx.beginPath();
          ctx.arc(circleCX, circleCY, circleR, 0, Math.PI * 2);
          ctx.strokeStyle = handNearby
            ? `rgba(10, 10, 10, ${0.45 + dwell * 0.35})`
            : 'rgba(10, 10, 10, 0.22)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
          ctx.stroke();

          // Dwell progress arc (fills clockwise from top)
          if (dwell > 0) {
            ctx.beginPath();
            ctx.arc(circleCX, circleCY, circleR, -Math.PI / 2, -Math.PI / 2 + dwell * Math.PI * 2);
            ctx.strokeStyle = `rgba(10, 10, 10, ${0.55 + dwell * 0.35})`;
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }

          // Inner fill on hover
          if (handNearby || dwell > 0) {
            ctx.beginPath();
            ctx.arc(circleCX, circleCY, circleR - 4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(10, 10, 10, ${0.04 + dwell * 0.08})`;
            ctx.fill();
          }

          // Label inside circle
          ctx.font = `${dwell > 0.5 ? 'bold ' : ''}9px JetBrains Mono, monospace`;
          ctx.fillStyle = `rgba(10, 10, 10, ${0.5 + dwell * 0.4})`;
          ctx.textAlign = 'center';
          ctx.fillText('DIAGNOSE', circleCX, circleCY + 3);

          // Instruction hint below
          ctx.font = '8px JetBrains Mono, monospace';
          ctx.fillStyle = 'rgba(10, 10, 10, 0.28)';
          ctx.fillText('hover to diagnose', circleCX, circleCY + circleR + 14);

          ctx.restore();
        } else {
          // Clear targets when not showing
          diagnoseCircleRef.current = null;
          diagnoseHitRef.current = null;
          skipHitRef.current = null;
          dwellTimerRef.current = 0;
          dwellTriggeredRef.current = false;
        }
      }

      // K. 2.0: Breakthrough white flash overlay
      if (flashRef.current > 0) {
        ctx.save();
        ctx.globalAlpha = flashRef.current > 0.5
          ? (flashRef.current - 0.5) * 2        // fade in fast
          : flashRef.current * 2;               // fade out
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [
    dimensions, 
    preset, 
    dragMode, 
    gravityMultiplier, 
    frictionMultiplier, 
    hoveredMilestone, 
    quizVerdict, 
    boosterActive, 
    showQuizPromptAlert, 
    isModalOpen,
    webcamEnabled
  ]);

  // Handle Event Triggers (Movements, drags)
  const getCanvasMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Scale matching client boundaries correctly
    const screenX = ((e.clientX - rect.left) / rect.width) * dimensions.width;
    const screenY = ((e.clientY - rect.top) / rect.height) * dimensions.height;

    // Apply camera viewport inverse transform
    const scale = cameraZoomRef.current;
    const x = cameraXRef.current + (screenX - dimensions.width / 2) / scale;
    const y = cameraYRef.current + (screenY - dimensions.height / 2) / scale;
    return { x, y };
  };

  const getCanvasTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    
    const screenX = ((touch.clientX - rect.left) / rect.width) * dimensions.width;
    const screenY = ((touch.clientY - rect.top) / rect.height) * dimensions.height;

    // Apply camera viewport inverse transform
    const scale = cameraZoomRef.current;
    const x = cameraXRef.current + (screenX - dimensions.width / 2) / scale;
    const y = cameraYRef.current + (screenY - dimensions.height / 2) / scale;
    return { x, y };
  };

  const checkMilestoneHover = (x: number, y: number) => {
    const relX = x / dimensions.width;
    let hovered: DipMilestone | null = null;
    let bestDist = 0.04; // relative boundary width

    preset.milestones.forEach((m) => {
      const dist = Math.abs(relX - m.x);
      if (dist < bestDist) {
        hovered = m;
        bestDist = dist;
      }
    });
    setHoveredMilestone(hovered);
  };

  return (
    <div className="flex flex-col w-full h-full" id="canvas-container-root">
      {/* Simulation Workspace Card */}
      <div 
        ref={containerRef}
        className="relative flex-1 w-full min-h-[420px] bg-paper border-2 border-ink-black shadow-[4px_4px_0_rgba(26,26,26,1)] overflow-hidden cursor-none"
        id="canvas-gesture-pad"
      >
        {/* Dynamic Canvas element */}
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="absolute inset-0 block"
          onPointerDown={(e) => {
            if (webcamEnabled) return;

            // Check canvas overlay circle (mouse click fallback for gesture target)
            if (showQuizPromptAlertRef.current && diagnoseCircleRef.current) {
              const cvs = canvasRef.current;
              if (cvs) {
                const rect = cvs.getBoundingClientRect();
                const sx = ((e.clientX - rect.left) / rect.width) * dimensions.width;
                const sy = ((e.clientY - rect.top) / rect.height) * dimensions.height;
                const { cx, cy, r } = diagnoseCircleRef.current;
                if (Math.hypot(sx - cx, sy - cy) <= r + 8) {
                  if (onAcceptQuiz) onAcceptQuiz();
                  return;
                }
              }
            }

            const pos = getCanvasMousePos(e);
            handRef.current.x = pos.x;
            handRef.current.y = pos.y;
            handRef.current.isActive = true;

            const dx = pos.x - ballRef.current.x;
            const dy = pos.y - ballRef.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Trigger click-drag grab in spring mode
            if (dragMode === 'spring' && dist < ballRef.current.radius + handRef.current.radius + 15) {
              handRef.current.isGrabbing = true;
              ballRef.current.isDragging = false;
            }
          }}
          onPointerMove={(e) => {
            const pos = getCanvasMousePos(e);
            if (!webcamEnabled) {
              handRef.current.x = pos.x;
              handRef.current.y = pos.y;
              handRef.current.isActive = true;
            }

            checkMilestoneHover(pos.x, pos.y);
          }}
          onPointerUp={() => {
            if (webcamEnabled) return;
            handRef.current.isGrabbing = false;
            ballRef.current.isDragging = false;
          }}
          onPointerLeave={() => {
            if (!webcamEnabled) {
              handRef.current.isActive = false;
              handRef.current.isGrabbing = false;
              handRef.current.isDragging = false;
            }
            setHoveredMilestone(null);
          }}
          onTouchStart={(e) => {
            if (webcamEnabled) return;
            const pos = getCanvasTouchPos(e);
            handRef.current.x = pos.x;
            handRef.current.y = pos.y;
            handRef.current.isActive = true;

            const dx = pos.x - ballRef.current.x;
            const dy = pos.y - ballRef.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dragMode === 'spring' && dist < ballRef.current.radius + 50) {
              handRef.current.isGrabbing = true;
            }
          }}
          onTouchMove={(e) => {
            if (webcamEnabled) return;
            // Prevent browser scroll when dragging the canvas
            e.preventDefault();
            const pos = getCanvasTouchPos(e);
            handRef.current.x = pos.x;
            handRef.current.y = pos.y;
            handRef.current.isActive = true;
          }}
          onTouchEnd={() => {
            if (webcamEnabled) return;
            handRef.current.isActive = false;
            handRef.current.isGrabbing = false;
          }}
        />

        {/* Hidden or small webcam video feed for preview, mirrored scale */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute bottom-4 right-4 w-56 h-40 border border-ink-black/20 bg-ink-black object-cover transform scale-x-[-1] transition-all duration-300 z-10 ${
            webcamEnabled ? 'opacity-60' : 'opacity-0 pointer-events-none w-0 h-0 border-none'
          }`}
        />

        {/* Global Hand Pointer Indicator for Modal interactions */}
        <div 
          ref={cursorRef} 
          className="fixed z-[9999] pointer-events-none rounded-full border-[3px] border-ink-black shadow-[4px_4px_0_rgba(26,26,26,0.3)] transition-all duration-75" 
          style={{ width: 24, height: 24, display: 'none' }} 
        />

        {/* 2.0: Controls — minimal, bottom-left */}
        <div className="absolute bottom-4 left-4 flex gap-2 items-center">
          <button
            onClick={handleBallReset}
            className="px-3 py-1.5 bg-paper border border-ink-black/30 hover:border-ink-black text-ink-black font-mono text-[10px] cursor-pointer select-none transition-colors"
            title="Reset"
          >
            reset the ball
          </button>
          <button
            onClick={toggleWebcam}
            className={`px-3 py-1.5 font-mono text-[10px] border cursor-pointer select-none transition-colors ${
              webcamEnabled
                ? 'bg-ink-black text-paper border-ink-black'
                : 'bg-paper border-ink-black/30 hover:border-ink-black text-ink-black'
            }`}
          >
            {webcamLoading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 border border-paper border-t-transparent rounded-full animate-spin"></span>
                loading
              </span>
            ) : webcamEnabled ? 'mouse' : 'cam'}
          </button>

          {/* Read button */}
          {onOpenRead && (
            <button
              onClick={onOpenRead}
              className="px-3 py-1.5 bg-paper border border-ink-black/30 hover:border-ink-black text-ink-black font-mono text-[10px] cursor-pointer select-none transition-colors"
            >
              read
            </button>
          )}

          {/* Games button — always visible */}
          {onOpenGames && (
            <button
              onClick={onOpenGames}
              className="px-3 py-1.5 bg-paper border border-ink-black/30 hover:border-ink-black text-ink-black font-mono text-[10px] cursor-pointer select-none transition-colors"
            >
              games
            </button>
          )}

          {/* Retake button — appears only once a verdict has been set */}
          {quizVerdict !== null && onRetakeTest && (
            <button
              onClick={onRetakeTest}
              className="px-3 py-1.5 bg-paper border border-ink-black/30 hover:border-ink-black text-ink-black font-mono text-[10px] cursor-pointer select-none transition-colors"
            >
              quiz
            </button>
          )}
        </div>

        {/* 2.0: Loading overlay */}
        {webcamLoading && (
          <div className="absolute inset-0 bg-paper/90 z-[40] flex flex-col items-center justify-center gap-3 animate-fade-in">
            <div className="w-6 h-6 border border-ink-black border-t-transparent rounded-full animate-spin"></div>
            <span className="font-mono text-[10px] text-ink-soft">loading camera model...</span>
          </div>
        )}

        {/* 2.0: Error */}
        {webcamError && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-5 bg-paper border border-ink-black/30 z-20 max-w-sm flex flex-col gap-3 items-center text-center animate-fade-in">
            <span className="text-xs font-mono text-ink-black">camera error</span>
            <p className="text-[10px] text-ink-soft leading-normal font-sans">{webcamError}</p>
            <button
              onClick={() => setWebcamError(null)}
              className="px-4 py-1.5 bg-ink-black text-paper text-[10px] font-mono cursor-pointer hover:opacity-80 transition"
            >
              dismiss
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
