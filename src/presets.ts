import { CurvePreset } from './types';

export const defaultPresets: CurvePreset[] = [
  {
    id: 'learning-react',
    name: 'Learning Fullstack Coding',
    icon: 'Code',
    description: 'A classic tech learning curve: early excitement when files load, followed by the deep dip of debugging, state management, and frameworks, leading to high-leverage mastery.',
    difficulty: 'Medium',
    baseGravity: 0.18,
    baseFriction: 0.04,
    ballMass: 1.0,
    // Godin canonical shape: brief honeymoon peak → deep dip valley → breakthrough higher than start
    curvePoints: [
      { x: 0.0,  y: 0.42 },  // starting results
      { x: 0.12, y: 0.22 },  // honeymoon peak
      { x: 0.50, y: 0.80 },  // THE DIP — the bottom
      { x: 1.0,  y: 0.06 },  // breakthrough summit
    ],
    milestones: [
      {
        id: 'start',
        name: 'Honeymoon Spark',
        x: 0.12,
        y: 0.22,
        description: 'You built a static HTML page with styled text! Excitement is peak; everyone seems encouraging.',
        keyAction: 'First lines of code written.',
        color: '#22c55e'
      },
      {
        id: 'the-wall',
        name: 'Reality Crash',
        x: 0.30,
        y: 0.60,
        description: 'Vite build fails, state resets on page reloads, and asynchronous API calls are returning cryptic errors.',
        keyAction: 'Encountering build errors.',
        color: '#f59e0b'
      },
      {
        id: 'the-bottom',
        name: 'The Valley of Despair',
        x: 0.50,
        y: 0.80,
        description: 'The "Dip" where 90% quit. Feeling like you are not cut out for this. Effort yields no visible results.',
        keyAction: 'Struggling with architecture.',
        color: '#ef4444'
      },
      {
        id: 'skills-ramp',
        name: 'Mastery Ascent',
        x: 0.78,
        y: 0.35,
        description: 'You finally understand closures, rendering cycles, and state sync. Standard tasks now flow naturally.',
        keyAction: 'Logical pieces click together.',
        color: '#3b82f6'
      },
      {
        id: 'breakthrough',
        name: 'Breakthrough Summit',
        x: 1.0,
        y: 0.06,
        description: 'You build interactive full-stack tools. You are highly employable and can sketch ideas into real code in hours!',
        keyAction: 'Full-stack application deployed!',
        color: '#a855f7'
      }
    ],
    tips: {
      start: 'Pace your enthusiasm. Initial high-spirits are normal, but they won\'t carry you through the grinding phase ahead.',
      bottom: 'This is where value is created! Godin says: "The Dip is the secret to your success." Pushing past this filter is what makes other developers scarce.',
      climb: 'Focus on deliberate practice. Standardize your solutions, build a portfolio, and minimize distractions as the summit nears.',
      summit: 'You solved it! You are now in the top-tier. Take on high-value problems and leverage your scarce capabilities!'
    }
  },
  {
    id: 'startup-venture',
    name: 'Launching a Startup',
    icon: 'Rocket',
    description: 'An extremely deep, heavy, and exhausting curve. Initial PR gets hype, but finding Product-Market Fit represents a long, grueling valley with high friction and psychological weight.',
    difficulty: 'Hard',
    baseGravity: 0.25, // harder, heavier gravity
    baseFriction: 0.06, // more drag
    ballMass: 2.0, // heavy ball
    curvePoints: [
      { x: 0.0, y: 0.45 },
      { x: 0.07, y: 0.60 },
      { x: 0.12, y: 0.45 },
      { x: 0.50, y: 0.85 }, // super deep dip
      { x: 0.82, y: 0.40 },
      { x: 1.0, y: 0.10 }
    ],
    milestones: [
      {
        id: 'start',
        name: 'Launch Hype',
        x: 0.12,
        y: 0.45,
        description: 'Product Hunt Launch day! Outpouring of encouraging comments from friends and transient signups.',
        keyAction: 'Landing page live.',
        color: '#10b981'
      },
      {
        id: 'the-wall',
        name: 'Traction Drought',
        x: 0.30,
        y: 0.65,
        description: 'Launch momentum fades. Churn goes up, users aren\'t returning, and cash runway is shrinking.',
        keyAction: 'Empty logs and cold feedback.',
        color: '#f59e0b'
      },
      {
        id: 'the-bottom',
        name: 'Trough of Sorrow',
        x: 0.50,
        y: 0.85,
        description: 'Co-founders argue, server bills arrive, and nobody seems to care about your feature updates. Investors say: "No."',
        keyAction: 'Considering a pivot or shutdown.',
        color: '#dc2626'
      },
      {
        id: 'skills-ramp',
        name: 'Product-Market Fit',
        x: 0.82,
        y: 0.40,
        description: 'Organic acquisition starts spinning! Users recommend it to colleagues. Revenue climbs, pipeline stabilizes.',
        keyAction: 'Substantial recurring revenue.',
        color: '#2563eb'
      },
      {
        id: 'breakthrough',
        name: 'Exponential Scale',
        x: 1.0,
        y: 0.10,
        description: 'The business expands and operates as its own engine. High valuation, market-leader status reached!',
        keyAction: 'Profitable enterprise scaling.',
        color: '#8b5cf6'
      }
    ],
    tips: {
      start: 'Do not base your business validity on launch-day pageviews. Build real, recurring value for 5 dedicated users instead.',
      bottom: 'Godin notes: "If it wasn\'t hard, there would be no premium." The difficulty of finding product-market fit is what keeps competitors from stealing your margins. Iterate fast, but quit strategically if the market is non-existent.',
      climb: 'Now is the time to optimize, raise capital if needed, and recruit early employees to delegate operation scale.',
      summit: 'Breakthrough reached! You built an elite asset. Cultivate focus to defend your product-market moat.'
    }
  },
  {
    id: 'fitness-journey',
    name: 'Athletic & Gym Journey',
    icon: 'Dumbbell',
    description: 'A lighter, highly responsive curve. The dip is shallow but requires consistent, lightweight pushes to maintain steady, gradual results without losing momentum.',
    difficulty: 'Easy',
    baseGravity: 0.12, // light gravity
    baseFriction: 0.02, // low friction
    ballMass: 0.6, // light ball
    curvePoints: [
      { x: 0.0, y: 0.35 },
      { x: 0.09, y: 0.50 },
      { x: 0.18, y: 0.38 },
      { x: 0.45, y: 0.58 }, // shallow dip
      { x: 0.72, y: 0.30 },
      { x: 1.0, y: 0.15 }
    ],
    milestones: [
      {
        id: 'start',
        name: 'First Week Rush',
        x: 0.18,
        y: 0.38,
        description: 'Excitedly bought shoes and gym gear. The first three sessions feel energizing and fresh.',
        keyAction: 'Signed up at gym.',
        color: '#10b981'
      },
      {
        id: 'the-wall',
        name: 'Soreness & Plates',
        x: 0.33,
        y: 0.46,
        description: 'Joint fatigue sets in, body weight fluctuates, and initial rapid changes stall. Going to the gym feels like a chore.',
        keyAction: 'The alarm rings at 6 AM.',
        color: '#f59e0b'
      },
      {
        id: 'the-bottom',
        name: 'The Motivation Desert',
        x: 0.45,
        y: 0.58,
        description: 'Skipped three sessions because of "busy meetings." Progress feels flat, and pizza looks extremely tempting.',
        keyAction: 'Struggling with consistency.',
        color: '#ef4444'
      },
      {
        id: 'skills-ramp',
        name: 'Identity Shift',
        x: 0.72,
        y: 0.30,
        description: 'Exercising is no longer a task—it is an internal habit. Sleep, stamina, and posture are visibly superior.',
        keyAction: 'Consistent weekly performance.',
        color: '#3b82f6'
      },
      {
        id: 'breakthrough',
        name: 'Peak Vitality',
        x: 1.0,
        y: 0.15,
        description: 'Superior longevity, focus, and strength. High physical recovery rate. You inspire others to start their walk.',
        keyAction: 'Optimal body condition achieved.',
        color: '#a855f7'
      }
    ],
    tips: {
      start: 'Set up sustainable habits. Going five times a week immediately causes quick burnout. Aim for three solid workouts.',
      bottom: 'The Dip here is purely psychological resistance. Lower the barrier to action: just pack your shoes, drive to the parking lot. You\'ll do the rest.',
      climb: 'Focus on progressive overload and dietary habits to match your energy output. Form and system are everything.',
      summit: 'A lifetime habit acquired! Cultivate active recovery to prevent injuries and maintain playfulness.'
    }
  }
];
