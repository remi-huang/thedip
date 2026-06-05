export interface Point {
  x: number;
  y: number;
}

export interface DipMilestone {
  id: string;
  name: string;
  x: number; // 0 to 1 normalized along width
  y: number; // 0 to 1 normalized along height
  description: string;
  keyAction: string;
  color: string;
}

export interface CurvePreset {
  id: string;
  name: string;
  icon: string; // lucide icon name
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  curvePoints: Point[]; // Set of control points (usually 4 or 5)
  baseGravity: number; // physics variables
  baseFriction: number;
  ballMass: number;
  milestones: DipMilestone[];
  tips: {
    start: string;
    bottom: string;
    climb: string;
    summit: string;
  };
}

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  isDragging: boolean;
}

export interface HandState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isGrabbing: boolean;
  isActive: boolean;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number; // 1 to 0
  maxLife: number;
  isRipple?: boolean;   // if true: draws as expanding ring, not filled dot
  maxRadius?: number;   // ripple max radius
  currentRadius?: number; // ripple current radius
}

export interface SimulationStats {
  effortSpent: number; // Cumulative work (force x displacement)
  timeInDip: number; // seconds spent in the valley of despair
  maxResults: number; // max result percentage reached
  breakthroughCount: number; // how many times clicked milestone 5
  timesReset: number;
  motivationLevel: number; // 0 to 100
}
