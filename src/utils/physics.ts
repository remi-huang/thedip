import { Point, BallState, HandState } from '../types';

/**
 * Perform cosine interpolation between two values
 */
export function interpolate(y1: number, y2: number, t: number): number {
  const mu2 = (1 - Math.cos(t * Math.PI)) / 2;
  return y1 * (1 - mu2) + y2 * mu2;
}

/**
 * Get the y coordinate (normalized 0 to 1) of the curve at relative position x (0 to 1)
 */
export function getCurveY(x: number, points: Point[]): number {
  if (points.length === 0) return 0.5;
  if (points.length === 1) return points[0].y;

  // Clamp x between 0 and 1
  const cx = Math.max(0, Math.min(1, x));

  // Find the two control points surrounding cx
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    if (cx >= p1.x && cx <= p2.x) {
      if (p2.x === p1.x) return p1.y;
      const t = (cx - p1.x) / (p2.x - p1.x);
      return interpolate(p1.y, p2.y, t);
    }
  }

  // Fallback
  return points[points.length - 1].y;
}

/**
 * Get the y coordinate (normalized 0 to 1) of the curve at relative position x (0 to 1),
 * incorporating Seth Godin's diagnosed path types!
 */
export function getVerdictCurveY(
  x: number,
  points: Point[],
  verdict: 'THE_DIP' | 'CUL_DE_SAC' | 'CLIFF' | null
): number {
  const normX = Math.max(0, Math.min(1, x));

  // Find bottom of the standard dip points to branch off (deepest peak where y is largest in canvas coordinates)
  let bottomX = 0.48;
  let maxCurveY = 0;
  for (let i = 0; i < points.length; i++) {
    const candidateY = getCurveY(points[i].x, points);
    if (candidateY > maxCurveY) {
      maxCurveY = candidateY;
      bottomX = points[i].x;
    }
  }

  // The walkable flat floor lasts from bottomX to bottomX + 0.12 (approx. 0.48 to 0.60)
  const forkX = bottomX + 0.12;

  // 1. Before bottomX: follow standard slope down to the low valley
  if (normX <= bottomX) {
    return getCurveY(normX, points);
  }

  // 2. Walkable flat valley slice: perfect horizontal walk!
  if (normX <= forkX) {
    return maxCurveY;
  }

  // 3. Past the fork (normX > forkX)
  // All transitions use easing functions with zero slope at t=0 to
  // smoothly connect with the flat floor section (which has slope=0).

  // easeIn quadratic: slope=0 at t=0, accelerates smoothly
  const easeIn = (t: number) => t * t;
  // smoothstep: slope=0 at both ends
  const smooth = (t: number) => t * t * (3 - 2 * t);

  // Case A: Quiz not taken yet — gentle upward slope into fog
  if (verdict === null) {
    const t = (normX - forkX) / (1.0 - forkX);
    return maxCurveY - 0.30 * smooth(t);
  }

  // Case B: CUL_DE_SAC — flat with gentle sine wiggles, no corner
  if (verdict === 'CUL_DE_SAC') {
    const t = (normX - forkX) / (1.0 - forkX);
    const fade = smooth(Math.min(t * 2, 1)); // ramp up the wiggle smoothly
    const wiggle = 0.018 * Math.sin((normX - forkX) * 40) * fade;
    return Math.min(0.92, maxCurveY + wiggle);
  }

  // Case C: CLIFF — false hope rise then plunge, both with eased starts
  if (verdict === 'CLIFF') {
    const risePeakX = forkX + 0.14;
    if (normX < risePeakX) {
      const t = (normX - forkX) / (risePeakX - forkX);
      const targetVal = maxCurveY - 0.18;
      return maxCurveY + (targetVal - maxCurveY) * easeIn(t);
    } else {
      const t = (normX - risePeakX) / (1.0 - risePeakX);
      const startY = maxCurveY - 0.18;
      const endY = 0.96;
      return startY + (endY - startY) * smooth(Math.min(t * 3.5, 1));
    }
  }

  // Case D: THE_DIP — smooth climb from floor to breakthrough
  const plateauX = 0.95;
  const effectiveX = Math.min(normX, plateauX);
  const t = (effectiveX - forkX) / (plateauX - forkX);
  const targetEnd = getCurveY(effectiveX, points);
  return maxCurveY + (targetEnd - maxCurveY) * easeIn(t);
}

/**
 * Compute the numerical derivative (slope) of the curve at relative position x
 */
export function getCurveSlope(x: number, points: Point[]): number {
  const dx = 0.005;
  const y1 = getCurveY(x - dx, points);
  const y2 = getCurveY(x + dx, points);
  return (y2 - y1) / (2 * dx);
}

/**
 * Compute the numerical derivative (slope) of the diagnosed curve at relative position x
 */
export function getVerdictCurveSlope(
  x: number,
  points: Point[],
  verdict: 'THE_DIP' | 'CUL_DE_SAC' | 'CLIFF' | null
): number {
  const dx = 0.005;
  const y1 = getVerdictCurveY(x - dx, points, verdict);
  const y2 = getVerdictCurveY(x + dx, points, verdict);
  return (y2 - y1) / (2 * dx);
}

/**
 * Solves mathematical physics for the ball on the curve.
 * This function updates the ball's position, velocity, and handles curve collision in screen pixels.
 */
export function updatePhysics(
  ball: BallState,
  hand: HandState,
  points: Point[],
  width: number,
  height: number,
  gravityMultiplier: number,
  frictionMultiplier: number,
  dragMode: 'push' | 'spring' | 'assist',
  dt: number = 0.016, // ~60fps
  boosterActive: boolean = false,
  quizVerdict: 'THE_DIP' | 'CUL_DE_SAC' | 'CLIFF' | null = null
): { newBall: BallState; collisionForce: number; wasPushed: boolean; hitWall: boolean } {
  // Create copies of state
  let x = ball.x;
  let y = ball.y;
  let vx = ball.vx;
  let vy = ball.vy;

  let wasPushed = false;
  let maxCollisionImpulse = 0;
  let hitWall = false;

  // Let's compute forkX and limitX early for physical blockades
  const isQuizBlocked = (quizVerdict === null);
  let limitX = width;
  let forkX = 0.60; // fallback
  if (isQuizBlocked) {
    let bottomX = 0.48;
    let maxCurveY = 0;
    for (let i = 0; i < points.length; i++) {
      const candidateY = getCurveY(points[i].x, points);
      if (candidateY > maxCurveY) {
        maxCurveY = candidateY;
        bottomX = points[i].x;
      }
    }
    forkX = bottomX + 0.12;
    limitX = forkX * width;
  }

  // Convert physics factors into screen pixels
  const gForce = gravityMultiplier * 1580; // Super heavy physics (was 1180, original 480)

  // Calculate ground parameters at current x
  const relX = x / width;
  const curveYRel = getVerdictCurveY(relX, points, quizVerdict);
  const curveYPx = curveYRel * height;
  const slope = getVerdictCurveSlope(relX, points, quizVerdict);
  
  // Transform normalized curve slope to screen pixels slope (Y/X ratio)
  const slopeInPx = slope * (height / width);
  const len = Math.sqrt(slopeInPx * slopeInPx + 1) || 1;

  // Unit tangent vector (pointing to the right along the curve downhill/uphill)
  const tx = 1 / len;
  const ty = slopeInPx / len; // ty is positive if going downhill to the right (+y is down in canvas)

  // Force the ball to be locked on the curve Y coordinate at all times (no jumping or floating)
  y = curveYPx - ball.radius;

  // Project the ball's current 2D velocity onto the tangent vector to get its 1D speed vt
  let vt = vx * tx + vy * ty;

  // 1. Apply gravity component along the curve tangent: F_gravity_tangent = g * sin(theta)
  // Gravity pulls vertically downward (vector: 0, gForce). 
  // Projected onto tangent (tx, ty): 0 * tx + gForce * ty = gForce * ty.
  let gravityEffect = gForce * ty;

  // If the ball is moving uphill (climbing Y-up, i.e., height is increasing / Y is decreasing: vt * ty < 0)
  if (vt * ty < 0) {
    // Height is increasing, so climbing uphill. Apply steep extra gravity force and ascending drag!
    gravityEffect *= 2.2; // 2.2x uphill gravity resistance
    vt -= Math.sign(vt) * 160 * dt; // strong ascending rolling drag opposing upward motion
  }

  vt += gravityEffect * dt;

  // 2. Apply persistent booster push along the tangent
  if (boosterActive) {
    const boosterForceX = 230;
    const boosterForceY = -350; // upwards boost lift
    const boosterForceT = boosterForceX * tx + boosterForceY * ty;
    vt += boosterForceT * dt;
  }

  // 3. Apply rolling/sliding friction along the tangent with extra base air-resistance dampening
  const frictionFactor = Math.max(0, 1 - (frictionMultiplier * 0.38) * dt * 5.5);
  vt *= frictionFactor;
  vt *= 0.965; // continuous deep clay friction (approx 3.5% dampening per frame) to prevent runaway speeds

  // 4. Apply hand controls (Mouse/Fingertip) projected onto tangent space
  if (hand.isActive) {
    const dx = x - hand.x;
    const dy = y - hand.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = ball.radius + hand.radius;

    // Cap incoming hand velocity to prevent crazy mouse or fingertip flick speeds
    const handVxCapped = Math.max(-200, Math.min(200, hand.vx));
    const handVyCapped = Math.max(-200, Math.min(200, hand.vy));

    if (dragMode === 'push') {
      if (dist < minDist) {
        wasPushed = true;

        // Softly resolve overlapping position strictly along the curve's X axis
        const overlap = minDist - dist;
        const pushDir = dx >= 0 ? 1 : -1;
        x += pushDir * overlap * 0.70; // slightly more solid overlap resolution

        if (isQuizBlocked && x + ball.radius > limitX) {
          x = limitX - ball.radius;
        }

        // Recalculate curve position to prevent clipping
        const nextRelX = Math.max(0, Math.min(1, x / width));
        const nextCurveY = getVerdictCurveY(nextRelX, points, quizVerdict) * height;
        y = nextCurveY - ball.radius;

        // Push force calculations based on relative hand speed
        const rvx = (vt * tx) - handVxCapped;
        const rvy = (vt * ty) - handVyCapped;
        
        const px = dx / (dist || 1);
        const py = dy / (dist || 1);
        const vDotN = rvx * px + rvy * py;

        if (vDotN < 0) {
          const impulse = -0.75 * vDotN; // halved impulse response for massive dampening
          // Project push direction onto the sliding tangent
          const pushT = px * tx + py * ty;
          
          // Determine if the push directs the ball uphill (push direction Y opposes gravity slope)
          const isPushingUphill = (pushT * ty < 0);
          const pushEfficiency = isPushingUphill ? 0.16 : 0.42; // highly inefficient when pushing heavy ball uphill

          vt += pushT * impulse * pushEfficiency;

          // Directly inherit a highly dampened portion of the hand's speed
          const handVt = handVxCapped * tx + handVyCapped * ty;
          vt += handVt * 0.18 * pushEfficiency;

          maxCollisionImpulse = (impulse + Math.abs(handVxCapped) * 0.25) * pushEfficiency;
        }
      }
    } else if (dragMode === 'spring' && hand.isGrabbing) {
      // Direct spring lasso force attracting the ball along the curve tangent
      const springK = 1.2; // 1.2 instead of 4.0 for a slow, laggy, clay-dragging feel!
      const dX = hand.x - x;
      const dY = hand.y - y;
      const forceT = dX * tx + dY * ty;

      vt += (forceT / ball.mass) * springK * dt * 75;
      vt *= 0.88; // 0.88 instead of 0.94 for high mud resistance in grabbing mode
      wasPushed = true;

      if (isQuizBlocked && x + ball.radius > limitX) {
        x = limitX - ball.radius;
      }
    } else if (dragMode === 'assist') {
      // Dynamic bubble field assisting the ball uphill/upwards
      const assistRange = 150;
      if (dist < assistRange) {
        const forcePct = (assistRange - dist) / assistRange;
        const assistAX = (dx / (dist || 1)) * 140 * forcePct;
        const assistAY = -390 * forcePct; // upward assistant push
        const assistAT = assistAX * tx + assistAY * ty;
        vt += assistAT * dt;
        wasPushed = true;

        if (isQuizBlocked && x + ball.radius > limitX) {
          x = limitX - ball.radius;
        }
      }
    }
  }

  // 5. Constrain velocity to safe limits
  const maxSpeed = 1600;
  if (Math.abs(vt) > maxSpeed) {
    vt = Math.sign(vt) * maxSpeed;
  }

  // 6. Integrate position
  x += vt * tx * dt;

  // 7. Prevent ball from rolling past left or right boundaries (bounce support) or the unresolved quiz wall!
  if (x - ball.radius < 0) {
    x = ball.radius;
    vt = -vt * 0.25; // inelastic bounce off wall
  } else if (isQuizBlocked && x + ball.radius >= limitX) {
    const prevX = ball.x;
    x = limitX - ball.radius;
    if (vt > 0.1 || prevX + ball.radius < limitX - 1 || (wasPushed && Math.abs(x + ball.radius - limitX) < 2)) {
      hitWall = true;
    }
    vt = -Math.abs(vt) * 0.15; // bounce back
  } else if (x + ball.radius > width) {
    x = width - ball.radius;
    vt = -vt * 0.25; // inelastic bounce off wall
  }

  // Ensure absolute mathematical lock to the curve trajectory at final step
  const finalRelX = Math.max(0, Math.min(1, x / width));
  const finalCurveY = getVerdictCurveY(finalRelX, points, quizVerdict) * height;
  y = finalCurveY - ball.radius;

  // Reconstruct physical 2D velocity vectors for components that read them
  vx = vt * tx;
  vy = vt * ty;

  return {
    newBall: {
      ...ball,
      x,
      y,
      vx,
      vy,
    },
    collisionForce: maxCollisionImpulse,
    wasPushed,
    hitWall,
  };
}
