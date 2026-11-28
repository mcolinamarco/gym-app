// Anatomical line strokes drawn on the body surface (illustration style).
// Each stroke is a list of anchors: ['T', x, y, 'f'|'b'] on the trunk (x mirrored per side), or
// ['L', bone, t, theta] along a limb (t 0..1 from bone head to child, theta 0 front, + lateral, pi back).
// Per vertex we store a signed distance to the stroke and a fade (tapers the ends), packed into shared channels.
const PI = Math.PI;
const T = (x, y, s = 'f') => ['T', x, y, s];
const L = (b, t, th) => ['L', b, t, th];
export const STROKES = [
  // front trunk
  { a: [T(0, 1.335), T(0, 1.2), T(0, 1.07), T(0, 0.99)], once: true },
  { a: [T(0.006, 1.292), T(0.04, 1.287), T(0.078, 1.297)] },
  { a: [T(0.006, 1.215), T(0.04, 1.21), T(0.08, 1.218)] },
  { a: [T(0.006, 1.14), T(0.04, 1.136), T(0.078, 1.142)] },
  { a: [T(0.086, 1.335), T(0.09, 1.22), T(0.076, 1.09), T(0.045, 0.995)] },
  { a: [T(0.012, 1.362), T(0.06, 1.33), T(0.115, 1.34), T(0.155, 1.375), T(0.172, 1.42)] },
  { a: [T(0, 1.47), T(0, 1.37)], once: true },
  { a: [T(0.025, 1.565), T(0.09, 1.556), T(0.155, 1.565)] },
  { a: [T(0.135, 1.548), T(0.165, 1.49), L('upperarm', 0.3, 0.35), L('upperarm', 0.45, 0.8)] },
  { a: [T(0.125, 1.062), T(0.085, 1.0), T(0.04, 0.955)] },
  { a: [T(0.145, 1.33), T(0.148, 1.2), T(0.128, 1.09)] },
  { a: [T(0.022, 1.57), T(0.045, 1.6), T(0.058, 1.645)] },
  // back trunk
  { a: [T(0, 1.58, 'b'), T(0, 1.32, 'b'), T(0, 1.06, 'b')], once: true },
  { a: [T(0.062, 1.33, 'b'), T(0.066, 1.16, 'b'), T(0.048, 1.04, 'b')] },
  { a: [T(0.07, 1.53, 'b'), T(0.088, 1.43, 'b'), T(0.105, 1.345, 'b')] },
  { a: [T(0.072, 1.505, 'b'), T(0.14, 1.53, 'b'), T(0.19, 1.55, 'b')] },
  { a: [T(0.172, 1.42, 'b'), T(0.158, 1.28, 'b'), T(0.122, 1.12, 'b')] },
  { a: [T(0, 0.985, 'b'), T(0, 0.9, 'b')], once: true },
  { a: [T(0.105, 1.345, 'b'), T(0.13, 1.355, 'b'), T(0.152, 1.395, 'b')] },
  { a: [T(0.006, 1.265, 'b'), T(0.04, 1.36, 'b'), T(0.074, 1.47, 'b')] },
  { a: [T(0.025, 0.995, 'b'), T(0.08, 1.04, 'b'), T(0.14, 1.04, 'b')] },
  { a: [L('thigh', 0.22, -2.25), L('thigh', 0.5, -2.3), L('thigh', 0.82, -2.1)] },
  { a: [L('thigh', 0.28, 2.15), L('thigh', 0.55, 2.2), L('thigh', 0.85, 2.3)] },
  { a: [L('upperarm', 0.3, 2.6), L('upperarm', 0.5, 2.75), L('upperarm', 0.72, 2.9)] },
  { a: [L('thigh', 0.1, -2.6), L('thigh', 0.12, PI), L('thigh', 0.09, 2.3)] },
  { a: [T(0.15, 1.035, 'b'), L('thigh', 0.1, 1.9), L('thigh', 0.2, 1.75)] },
  // thigh
  { a: [L('thigh', 0.15, 0.55), L('thigh', 0.5, 0.45), L('thigh', 0.86, 0.3)] },
  { a: [L('thigh', 0.22, -0.22), L('thigh', 0.55, -0.32), L('thigh', 0.8, -0.22)] },
  { a: [L('thigh', 0.62, -0.32), L('thigh', 0.8, -0.55), L('thigh', 0.93, -0.3), L('thigh', 0.95, 0.05)] },
  { a: [L('thigh', 0.03, 0.75), L('thigh', 0.35, -0.3), L('thigh', 0.7, -1.2), L('thigh', 0.96, -1.7)] },
  { a: [L('thigh', 0.25, 1.75), L('thigh', 0.6, 1.7), L('thigh', 0.92, 1.55)] },
  { a: [L('thigh', 0.3, PI), L('thigh', 0.6, PI + 0.05), L('thigh', 0.86, PI - 0.25)] },
  { a: [L('thigh', 0.92, -0.55), L('thigh', 0.98, 0), L('thigh', 0.92, 0.55)] },
  // lower leg
  { a: [L('shin', 0.08, 0.22), L('shin', 0.5, 0.15), L('shin', 0.86, 0.05)] },
  { a: [L('shin', 0.05, -1.95), L('shin', 0.3, -2.0), L('shin', 0.58, -2.65)] },
  { a: [L('shin', 0.05, 1.95), L('shin', 0.3, 2.0), L('shin', 0.5, 2.6)] },
  { a: [L('shin', 0.06, PI), L('shin', 0.32, PI)] },
  { a: [L('shin', 0.35, 1.55), L('shin', 0.72, 1.7)] },
  // arm
  { a: [L('upperarm', 0.08, 0.9), L('upperarm', 0.43, 1.3), L('upperarm', 0.12, 2.4)] },
  { a: [L('upperarm', 0.45, 1.6), L('upperarm', 0.86, 1.5)] },
  { a: [L('upperarm', 0.35, -1.6), L('upperarm', 0.86, -1.5)] },
  { a: [L('forearm', 0.05, 0.9), L('forearm', 0.5, 0.6)] },
  { a: [L('forearm', 0.1, -0.6), L('forearm', 0.55, -0.4)] },
];

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const NEXT = { thigh: 'shin', shin: 'foot', upperarm: 'forearm', forearm: 'hand' };

export function buildStrokes(rig, nChan = 12) {
  const { pos, nv } = rig.d; const nrm = rig.geo.attributes.normal.array;
  const name = i => rig.names[rig.dom[i]];
  const trunkRe = /^(hips|spine|chest|neck)/;
  const limbCache = {};
  function limbCoords(bone, s) {
    const key = bone + s; if (limbCache[key]) return limbCache[key];
    const a = rig.H[rig.bi[bone + s]], b = rig.H[rig.bi[NEXT[bone] + s]];
    const ax = [b.x - a.x, b.y - a.y, b.z - a.z]; const Ln = Math.hypot(...ax); ax.forEach((v, i) => ax[i] = v / Ln);
    const k = s === 'L' ? 1 : -1;
    const orth = v => { const d = v[0] * ax[0] + v[1] * ax[1] + v[2] * ax[2]; const o = [v[0] - d * ax[0], v[1] - d * ax[1], v[2] - d * ax[2]]; const l = Math.hypot(...o); return o.map(x => x / l); };
    const lat = orth([k, 0, 0]), fr = orth([0, 0, 1]);
    const ids = [], tt = [], th = [];
    for (let i = 0; i < nv; i++) {
      const n = name(i); if (!(n === bone + s || n === NEXT[bone] + s || (bone === 'thigh' && n === 'hips') || (bone === 'upperarm' && n === 'chest'))) continue;
      if (Math.sign(pos[i * 3]) !== k) continue;
      const v = [pos[i * 3] - a.x, pos[i * 3 + 1] - a.y, pos[i * 3 + 2] - a.z];
      const t = (v[0] * ax[0] + v[1] * ax[1] + v[2] * ax[2]) / Ln;
      const r = [v[0] - t * Ln * ax[0], v[1] - t * Ln * ax[1], v[2] - t * Ln * ax[2]];
      ids.push(i); tt.push(t); th.push(Math.atan2(r[0] * lat[0] + r[1] * lat[1] + r[2] * lat[2], r[0] * fr[0] + r[1] * fr[1] + r[2] * fr[2]));
    }
    return limbCache[key] = { ids, tt, th, Ln };
  }
  function anchor(an, s) {
    const k = s === 'L' ? 1 : -1; let best = -1, bd = 1e9;
    if (an[0] === 'T') {
      const x = an[1] * k, y = an[2], back = an[3] === 'b';
      for (let i = 0; i < nv; i++) {
        if (rig.face[i] || !trunkRe.test(name(i))) continue;
        const nz = nrm[i * 3 + 2]; if (back ? nz > -0.15 : nz < 0.15) continue;
        const d = (pos[i * 3] - x) ** 2 + (pos[i * 3 + 1] - y) ** 2; if (d < bd) { bd = d; best = i; }
      }
    } else {
      const c = limbCoords(an[1], s);
      for (let j = 0; j < c.ids.length; j++) {
        let dth = c.th[j] - an[3]; dth = Math.atan2(Math.sin(dth), Math.cos(dth));
        const d = ((c.tt[j] - an[2]) * c.Ln) ** 2 + (0.06 * dth) ** 2; if (d < bd) { bd = d; best = c.ids[j]; }
      }
    }
    return best;
  }
  const P = i => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
  const lines = [];
  for (const st of STROKES) for (const s of (st.once ? ['L'] : ['L', 'R'])) {
    const ai = st.a.map(an => anchor(an, s)); if (ai.some(i => i < 0)) continue;
    const ap = ai.map(P);
    // Catmull-Rom through anchors, then snap samples to the nearest vertex and smooth
    let pts = [];
    for (let j = 0; j < ap.length - 1; j++) {
      const p0 = ap[Math.max(0, j - 1)], p1 = ap[j], p2 = ap[j + 1], p3 = ap[Math.min(ap.length - 1, j + 2)];
      const n = Math.max(4, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]) / 0.006));
      for (let q = 0; q < n; q++) {
        const t = q / n, t2 = t * t, t3 = t2 * t;
        pts.push([0, 1, 2].map(c => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
      }
    }
    pts.push(ap[ap.length - 1]);
    const near = pts.map(p => { let b = -1, bd = 1e9; for (let i = 0; i < nv; i++) { if (rig.face[i]) continue; const d = (pos[i * 3] - p[0]) ** 2 + (pos[i * 3 + 1] - p[1]) ** 2 + (pos[i * 3 + 2] - p[2]) ** 2; if (d < bd) { bd = d; b = i; } } return b; });
    pts = near.map(P); const nn = near.map(i => [nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]]);
    for (let it = 0; it < 4; it++) pts = pts.map((p, j) => j === 0 || j === pts.length - 1 ? p : [0, 1, 2].map(c => (pts[j - 1][c] + 2 * p[c] + pts[j + 1][c]) / 4));
    const cum = [0]; for (let j = 1; j < pts.length; j++) cum.push(cum[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1], pts[j][2] - pts[j - 1][2]));
    lines.push({ pts, nn, cum, len: cum[cum.length - 1] });
  }
  // per-vertex signed distance + fade for each line
  const R = 0.04;
  const fields = lines.map(ln => {
    const S = new Map();
    let mn = [9, 9, 9], mx = [-9, -9, -9]; ln.pts.forEach(p => p.forEach((v, c) => { mn[c] = Math.min(mn[c], v); mx[c] = Math.max(mx[c], v); }));
    for (let i = 0; i < nv; i++) {
      const p = P(i); if (p.some((v, c) => v < mn[c] - R * 1.7 || v > mx[c] + R * 1.7)) continue;
      let bd = 1e9, bq = null, bj = 0, bu = 0;
      for (let j = 0; j < ln.pts.length - 1; j++) {
        const a = ln.pts[j], b = ln.pts[j + 1]; const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1e-9;
        let u = ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / l2; u = Math.max(0, Math.min(1, u));
        const q = [a[0] + ab[0] * u, a[1] + ab[1] * u, a[2] + ab[2] * u]; const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
        if (d < bd) { bd = d; bq = q; bj = j; bu = u; }
      }
      const dist = Math.sqrt(bd); if (dist > R * 1.7) continue;
      const n = ln.nn[bj]; const facing = n[0] * nrm[i * 3] + n[1] * nrm[i * 3 + 1] + n[2] * nrm[i * 3 + 2] >= 0.35 ? 1 : 0;
      const a = ln.pts[bj], b = ln.pts[bj + 1]; const dir = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const side = [dir[1] * n[2] - dir[2] * n[1], dir[2] * n[0] - dir[0] * n[2], dir[0] * n[1] - dir[1] * n[0]]; const sl = Math.hypot(...side) || 1;
      const sd = ((p[0] - bq[0]) * side[0] + (p[1] - bq[1]) * side[1] + (p[2] - bq[2]) * side[2]) / sl;
      const uu = (ln.cum[bj] + bu * (ln.cum[bj + 1] - ln.cum[bj])) / ln.len;
      const along = (bj === 0 && bu === 0) || (bj === ln.pts.length - 2 && bu === 1) ? 0 : 1;
      const fade = facing * along * ss(0, 0.18, uu) * (1 - ss(0.82, 1, uu)) * (1 - ss(R * 0.4, R * 0.9, dist));
      S.set(i, [sd, fade]);
    }
    return S;
  });
  // pack lines into channels so overlapping lines never share one
  const used = Array.from({ length: nChan }, () => new Uint8Array(nv));
  const chan = Array.from({ length: nChan }, () => { const a = new Float32Array(nv * 2); for (let i = 0; i < nv; i++) a[i * 2] = 1; return a; });
  let dropped = 0;
  fields.forEach(F => {
    let c = 0; for (; c < nChan; c++) { let ok = true; for (const i of F.keys()) if (used[c][i]) { ok = false; break; } if (ok) break; }
    if (c === nChan) { dropped++; return; }
    for (const [i, [sd, f]] of F) { used[c][i] = 1; chan[c][i * 2] = sd; chan[c][i * 2 + 1] = f; }
  });
  // into vec4 attributes (2 channels each)
  const attrs = [];
  for (let c = 0; c < nChan; c += 2) { const a = new Float32Array(nv * 4); for (let i = 0; i < nv; i++) { a[i * 4] = chan[c][i * 2]; a[i * 4 + 1] = chan[c][i * 2 + 1]; a[i * 4 + 2] = chan[c + 1][i * 2]; a[i * 4 + 3] = chan[c + 1][i * 2 + 1]; } attrs.push(a); }
  return { attrs, count: lines.length, dropped };
}
