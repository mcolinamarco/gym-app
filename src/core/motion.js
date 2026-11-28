// Shared timing and keyframe sampling used by every exercise.

// Smooth start and stop for lowering and rising.
export const easeInOutCubic = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// A rep tempo is four phases in order: top hold, lowering, bottom hold, rising.
// Each entry is [label, seconds]. Returns the phase label and the rep depth p (0 = top, 1 = bottom).
export function repLength(tempo) { return tempo.reduce((a, b) => a + b[1], 0); }
export function repDepth(tempo, sec, ease = easeInOutCubic) {
  const len = repLength(tempo);
  let t = ((sec % len) + len) % len;
  for (let k = 0; k < tempo.length; k++) {
    const [phase, d] = tempo[k];
    if (t <= d) { const u = t / d; return { phase, p: k === 0 ? 0 : k === 2 ? 1 : k === 1 ? ease(u) : 1 - ease(u), u }; }
    t -= d;
  }
  return { phase: tempo[0][0], p: 0, u: 0 };
}

const CH = ['x', 'z', 'tw'];
function mix(a, b, u, extra) {
  const L = (x, y) => (x || 0) + ((y || 0) - (x || 0)) * u;
  const pose = {};
  for (const k of new Set([...Object.keys(a.pose), ...Object.keys(b.pose)])) {
    const x = a.pose[k] || {}, y = b.pose[k] || {}; pose[k] = {};
    for (const c of CH) pose[k][c] = L(x[c], y[c]);
  }
  const out = { pose, root: a.root.map((v, j) => L(v, b.root[j])) };
  for (const e of extra) out[e] = a[e].map((v, j) => L(v, b[e][j]));
  return out;
}

// Keyframe table through one rep: frames[0] is the top, the last frame is the bottom. p in 0..1.
// Each frame is { pose: { bone: { x, z, tw } }, root: [x, y, z], ...extra arrays }.
export function sampleRep(frames, p, extra = []) {
  const f = p * (frames.length - 1), i = Math.min(frames.length - 2, Math.floor(f)), u = f - i;
  return mix(frames[i], frames[i + 1], u, extra);
}

// Keyframe table for a repeating cycle (e.g. one hop) of `period` seconds; wraps around.
export function sampleLoop(frames, period, t, extra = []) {
  const N = frames.length, f = ((t % period) + period) % period / period * N, i = Math.floor(f) % N, u = f - Math.floor(f);
  return mix(frames[i], frames[(i + 1) % N], u, extra);
}
