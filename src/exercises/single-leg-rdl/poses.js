// Single-leg RDL key positions (stance = left leg). Angles in radians, sagittal plane.
// trunk: forward pitch of the pelvis/torso; lean: forward tilt of the stance thigh (knee ahead of hip line);
// shin: backward tilt of the stance shin (knee ahead of ankle). Knee flexion = lean + shin.
export function slrdl({ trunk, lean, shin, backKnee = 0.05, backHip = 0, arms = 0, armOut = 0, armOutR = 0, neck = -0.08, freeFoot }) {
  const ff = freeFoot ?? (Math.PI / 2 * Math.min(1, trunk / 1.2) - trunk - backHip - backKnee);
  return {
    hips: { x: trunk },
    thighL: { x: -trunk - lean }, shinL: { x: lean + shin }, footL: { x: -shin },
    thighR: { x: backHip }, shinR: { x: backKnee }, footR: { x: ff },
    upperarmL: { x: -trunk + arms, z: armOut }, upperarmR: { x: -trunk + arms, z: -armOut - armOutR },
    neck: { x: neck }, head: { x: -0.04 },
  };
}
export const GRIP = { R: true };
export const KEYS = {
  start:  { trunk: 0.0, lean: 0.11, shin: 0.2, backHip: 0.12, backKnee: 0.66, freeFoot: 0.15, neck: 0, armOut: 0.1 },
  mid:    { trunk: 0.77, lean: 0.27, shin: 0.15, backKnee: 0.12, arms: 0.04, armOut: 0.11 },
  bottom: { trunk: 1.52, lean: 0.36, shin: 0.12, backKnee: 0.05, arms: 0.1, armOut: 0.03 },
};

// ---- full rep ----
const PN = ['trunk', 'shin', 'backHip', 'backKnee', 'arms', 'armOut', 'neck', 'freeFoot'];
const DEF = { backKnee: 0.05, backHip: 0, arms: 0, armOut: 0, neck: -0.08 };
function full(k) { const o = { ...DEF, ...k }; if (o.freeFoot === undefined) o.freeFoot = Math.PI / 2 * Math.min(1, o.trunk / 1.2) - o.trunk - o.backHip - o.backKnee; return o; }
const KN = [full(KEYS.start), full(KEYS.mid), full(KEYS.bottom)];
const KP = [0, KEYS.mid.trunk / KEYS.bottom.trunk, 1];
// monotone cubic (Fritsch-Carlson) through 3 knots
function pchip(xs, ys, x) {
  const h = [xs[1] - xs[0], xs[2] - xs[1]], d = [(ys[1] - ys[0]) / h[0], (ys[2] - ys[1]) / h[1]];
  const m = [d[0], d[0] * d[1] <= 0 ? 0 : (3 * (h[0] + h[1])) / ((2 * h[1] + h[0]) / d[0] + (h[1] + 2 * h[0]) / d[1]), d[1]];
  const i = x <= xs[1] ? 0 : 1, t = (x - xs[i]) / h[i], t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1];
}
// parameters at rep depth p (0 = standing, 1 = bottom); lean comes from the balance table
export function paramsAt(p, leanTable) {
  const o = {}; for (const n of PN) o[n] = pchip(KP, KN.map(k => k[n]), p);
  if (leanTable) { const f = p * (leanTable.length - 1), i = Math.min(leanTable.length - 2, Math.floor(f)); o.lean = leanTable[i] + (leanTable[i + 1] - leanTable[i]) * (f - i); }
  return o;
}
// tempo: top hold, 3 s lowering, bottom pause, 2 s rise
export const TEMPO = [['Top', 0.5], ['Lowering', 3.0], ['Bottom', 0.5], ['Rising', 2.0]];
export const REP_S = TEMPO.reduce((a, b) => a + b[1], 0);
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export function depthAt(sec) {
  let t = ((sec % REP_S) + REP_S) % REP_S;
  for (const [ph, d] of TEMPO) { if (t <= d) { const u = t / d; return { phase: ph, p: ph === 'Top' ? 0 : ph === 'Bottom' ? 1 : ph === 'Lowering' ? ease(u) : 1 - ease(u), u }; } t -= d; }
  return { phase: 'Top', p: 0, u: 0 };
}
