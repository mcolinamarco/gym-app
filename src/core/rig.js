// Shared rig: builds the skinned body, neutral standing pose, anatomical posing and muscle masks.
// Works in the browser and in Node (for the clipping check).
import * as THREE from 'three';

const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const band = (x, a0, a1, b0, b1) => ss(a0, a1, x) * (1 - ss(b0, b1, x));

export function decode(META, BODY) {
  const bs = atob(BODY); const u8 = new Uint8Array(bs.length);
  for (let i = 0; i < bs.length; i++) u8[i] = bs.charCodeAt(i);
  const buf = u8.buffer, nv = META.nv; let o = 0;
  const pos = new Float32Array(buf, o, nv * 3); o += nv * 12;
  const si = new Uint8Array(buf, o, nv * 4); o += nv * 4;
  const sw = new Uint8Array(buf, o, nv * 4); o += nv * 4;
  const flag = new Uint8Array(buf, o, nv); o += nv;
  const idx = META.i32 ? new Uint32Array(buf, o, META.ni) : new Uint16Array(buf, o, META.ni);
  return { pos, si, sw, flag, idx, nv };
}

export const MUSCLES = ['pec', 'abs1', 'abs2', 'abs3', 'obl', 'delt', 'bic', 'tri', 'fflex', 'fext',
  'trap', 'lat', 'erec', 'gmax', 'gmed', 'rf', 'vl', 'vm', 'add', 'ham', 'gastm', 'gastl', 'sol', 'tib'];

export class Rig {
  constructor(META, data) {
    this.meta = META; this.d = data;
    const { pos, si, sw, idx, nv, flag } = data;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(Uint16Array.from(si), 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(new Float32Array(Array.from(sw, v => v / 255)), 4));
    g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
    this.geo = g;
    this.names = META.bones; this.bi = Object.fromEntries(this.names.map((n, i) => [n, i]));
    this.H = META.heads.map(V3); this.T = META.tails.map(V3);
    this.bones = this.names.map(n => { const b = new THREE.Bone(); b.name = n; return b; });
    this.parent = META.parents;
    this.bones.forEach((b, i) => { const p = this.parent[i]; if (p < 0) b.position.copy(this.H[i]); else { b.position.copy(this.H[i]).sub(this.H[p]); this.bones[p].add(b); } });
    this.root = new THREE.Group();
    this.mesh = new THREE.SkinnedMesh(g, new THREE.MeshBasicMaterial());
    this.root.add(this.mesh); this.mesh.add(this.bones[0]);
    this.mesh.updateMatrixWorld(true);
    this.skeleton = new THREE.Skeleton(this.bones); this.mesh.bind(this.skeleton);
    this.mesh.frustumCulled = false;
    // child map / rest directions
    this.child = {};
    this.names.forEach((n, i) => { const p = this.parent[i]; if (p >= 0 && !this.child[this.names[p]]) this.child[this.names[p]] = n; });
    this.child.handL = 'f31L'; this.child.handR = 'f31R'; this.child.upperarmL = 'forearmL'; this.child.upperarmR = 'forearmR';
    this.child.thighL = 'shinL'; this.child.thighR = 'shinR'; this.child.shinL = 'footL'; this.child.shinR = 'footR';
    this.dom = new Uint8Array(nv); for (let i = 0; i < nv; i++) this.dom[i] = si[i * 4];
    this.face = new Uint8Array(nv);
    for (let i = 0; i < nv; i++) if (flag[i] || this.dom[i] === this.bi.head) this.face[i] = 1;
    this.neutral = {}; this.cfg = { abd: 0.24, elbow: 0.14, palm: -0.12 };
    this.buildNeutral();
    this.buildMasks();
  }
  restDir(n) {
    const i = this.bi[n], c = this.child[n];
    const end = c ? this.H[this.bi[c]] : this.T[i];
    return end.clone().sub(this.H[i]).normalize();
  }
  // neutral world orientations (standing, arms at sides, palms toward thighs)
  buildNeutral() {
    const N = this.neutral, Q = THREE.Quaternion, cfg = this.cfg;
    const aim = (n, dir, twist = 0) => { const q = new Q().setFromUnitVectors(this.restDir(n), dir.clone().normalize()); const t = new Q().setFromAxisAngle(dir.clone().normalize(), twist); return t.multiply(q); };
    for (const n of this.names) N[n] = new Q();
    for (const s of ['L', 'R']) {
      const k = s === 'L' ? 1 : -1;
      const ua = new THREE.Vector3(k * Math.sin(cfg.abd), -Math.cos(cfg.abd), 0);
      N['upperarm' + s] = aim('upperarm' + s, ua);
      const fa = new THREE.Vector3(k * Math.sin(cfg.abd * 0.55), -Math.cos(cfg.elbow), Math.sin(cfg.elbow)).normalize();
      // solve forearm twist so the palm faces the thigh
      let best = -9, bt = 0;
      for (let a = -Math.PI; a < Math.PI; a += 0.02) {
        const qf = aim('forearm' + s, fa, a);
        const qh = qf.clone().multiply(new Q().setFromUnitVectors(this.restDir('hand' + s), this.restDir('forearm' + s)));
        const pn = this.palmNormal(s).applyQuaternion(qh);
        const sc = pn.dot(new THREE.Vector3(-k, 0, cfg.palm).normalize());
        if (sc > best) { best = sc; bt = a; }
      }
      N['forearm' + s] = aim('forearm' + s, fa, bt);
      N['hand' + s] = N['forearm' + s].clone().multiply(new Q().setFromUnitVectors(this.restDir('hand' + s), this.restDir('forearm' + s)));
      for (let f = 1; f <= 5; f++) for (let j = 1; j <= 3; j++) N[`f${f}${j}${s}`] = N['hand' + s].clone();
      N['thigh' + s] = aim('thigh' + s, new THREE.Vector3(k * 0.035, -1, 0.01));
      N['shin' + s] = aim('shin' + s, new THREE.Vector3(k * 0.012, -1, -0.02));
      N['foot' + s] = new Q();
    }
  }
  palmNormal(s) {
    const h = this.H[this.bi['hand' + s]], i2 = this.H[this.bi['f21' + s]], i5 = this.H[this.bi['f51' + s]], th = this.T[this.bi['f13' + s]];
    const across = i5.clone().sub(i2).normalize(), dir = this.restDir('hand' + s);
    const n = new THREE.Vector3().crossVectors(across, dir).normalize();
    if (n.dot(th.clone().sub(h)) < 0) n.negate();
    return n;
  }
  fingerAxis(s, f) {
    const i2 = this.H[this.bi['f21' + s]], i5 = this.H[this.bi['f51' + s]];
    const across = i5.clone().sub(i2).normalize();
    const pn = this.palmNormal(s);
    if (f === 1) { const td = this.restDir('f11' + s); const ax = new THREE.Vector3().crossVectors(td, pn).normalize(); return ax; }
    // sign: rotating the finger direction about the axis must move it toward the palm normal
    const fd = this.restDir(`f${f}1${s}`); const ax = across.clone();
    if (fd.clone().applyAxisAngle(ax, 0.3).dot(pn) < fd.dot(pn)) ax.negate();
    return ax;
  }
  // pose: { bone: {x, z, tw} } angles in radians about neutral world axes (x = flex/extend, z = side, tw = along the bone)
  // plus pose.curl (0..1) for relaxed fingers
  apply(pose = {}, curl = 0.55, grip = {}) {
    const Q = THREE.Quaternion, N = this.neutral, X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1);
    const worldR = {};
    for (const n of this.names) {
      const p = pose[n] || {}; const r = new Q();
      if (p.z) r.premultiply(new Q().setFromAxisAngle(Z, p.z));
      if (p.x) r.premultiply(new Q().setFromAxisAngle(X, p.x));
      worldR[n] = r;
    }
    for (const s of ['L', 'R']) {
      const ang = { 1: [0.15, 0.2, 0.2], 2: [0.22, 0.32, 0.18], 3: [0.28, 0.38, 0.2], 4: [0.34, 0.42, 0.22], 5: [0.4, 0.45, 0.24] };
      const pn = this.palmNormal(s).applyQuaternion(N['hand' + s]);
      const mid = this.restDir('f31' + s).applyQuaternion(N['hand' + s]);
      const spread = { 2: 0.1, 3: 0, 4: 0.1, 5: 0.22 };
      const G = grip[s];
      for (let f = 2; f <= 5; f++) {
        const ax = this.fingerAxis(s, f).applyQuaternion(N['hand' + s]);
        if (G) { const ga = [1.2, 1.35, 0.75]; for (let j = 1; j <= 3; j++) worldR[`f${f}${j}${s}`] = new Q().setFromAxisAngle(ax, ga[j - 1]); continue; }
        const fd = this.restDir(`f${f}1${s}`).applyQuaternion(N['hand' + s]);
        let sp = spread[f]; if (fd.clone().applyAxisAngle(pn, 0.05).angleTo(mid) > fd.angleTo(mid)) sp = -sp;
        for (let j = 1; j <= 3; j++) {
          const q = new Q().setFromAxisAngle(ax, ang[f][j - 1] * curl * 1.5);
          if (j === 1) q.premultiply(new Q().setFromAxisAngle(pn, sp));
          worldR[`f${f}${j}${s}`] = q;
        }
      }
      // thumb: swing it in toward the index finger (about the palm normal), then a light curl
      const th = this.H[this.bi['f11' + s]], tt = this.T[this.bi['f13' + s]], i2 = this.H[this.bi['f21' + s]];
      const tdir = tt.clone().sub(th).applyQuaternion(N['hand' + s]), toI = i2.clone().sub(th).applyQuaternion(N['hand' + s]);
      let add = G ? 0.85 : 0.5; if (tdir.clone().applyAxisAngle(pn, 0.2).angleTo(toI) > tdir.angleTo(toI)) add = -add;
      const tax = this.fingerAxis(s, 1).applyQuaternion(N['hand' + s]);
      worldR['f11' + s] = new Q().setFromAxisAngle(pn, add).multiply(new Q().setFromAxisAngle(tax, 0.25));
      worldR['f12' + s] = new Q().setFromAxisAngle(tax, G ? 0.55 : 0.12 * curl * 1.5);
      worldR['f13' + s] = new Q().setFromAxisAngle(tax, G ? 0.6 : 0.18 * curl * 1.5);
    }
    this.names.forEach((n, i) => {
      const p = this.parent[i];
      const tw = pose[n] && pose[n].tw ? new Q().setFromAxisAngle(this.restDir(n), pose[n].tw) : new Q();
      const Nn = N[n].clone().multiply(tw);
      if (p < 0) { this.bones[i].quaternion.copy(worldR[n]).multiply(Nn); return; }
      const pn = this.names[p];
      const Np = N[pn];
      this.bones[i].quaternion.copy(Np.clone().invert().multiply(worldR[n]).multiply(Nn));
    });
    this.root.position.set(0, 0, 0); this.root.updateMatrixWorld(true);
  }
  // CPU-skinned positions (for checks and grounding)
  skinned(out) {
    const v = new THREE.Vector3(), nv = this.d.nv; out = out || new Float32Array(nv * 3);
    this.root.updateMatrixWorld(true);
    for (let i = 0; i < nv; i++) { v.fromBufferAttribute(this.geo.attributes.position, i); this.mesh.applyBoneTransform(i, v); v.applyMatrix4(this.mesh.matrixWorld); out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z; }
    return out;
  }
  // body segment of each vertex: 0 torso/head, 1 left arm, 2 right arm, 3 left leg, 4 right leg
  segments() {
    const seg = new Uint8Array(this.d.nv);
    for (let i = 0; i < this.d.nv; i++) {
      const n = this.names[this.dom[i]];
      if (/^(upperarm|forearm|hand|f\d)/.test(n)) seg[i] = n.endsWith('L') ? 1 : 2;
      else if (/^(thigh|shin|foot|toes)/.test(n)) seg[i] = n.endsWith('L') ? 3 : 4;
    }
    return seg;
  }
  buildMasks() {
    const { pos, nv, flag } = this.d; const nrm = this.geo.attributes.normal.array;
    const M = {}; for (const m of MUSCLES) M[m] = new Float32Array(nv);
    this.side = new Int8Array(nv); for (let i = 0; i < nv; i++) this.side[i] = pos[i * 3] >= 0 ? 1 : -1;
    const H = (n) => this.H[this.bi[n]];
    const v = new THREE.Vector3(), r = new THREE.Vector3();
    const limb = (s, a0, b0, fn, names) => {
      const a = H(a0), b = H(b0), ax = b.clone().sub(a), L = ax.length(); ax.normalize();
      const k = s === 'L' ? 1 : -1;
      const lat = new THREE.Vector3(k, 0, 0); lat.sub(ax.clone().multiplyScalar(lat.dot(ax))).normalize();
      const fr = new THREE.Vector3(0, 0, 1); fr.sub(ax.clone().multiplyScalar(fr.dot(ax))).normalize();
      const ok = new Set(names.map(n => this.bi[n + s]));
      for (let i = 0; i < nv; i++) {
        if (flag[i] || !ok.has(this.dom[i])) continue;
        v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).sub(a);
        const t = v.dot(ax) / L; r.copy(v).sub(ax.clone().multiplyScalar(t * L)).normalize();
        fn(i, t, r.dot(fr), r.dot(lat));
      }
    };
    const set = (m, i, val) => { if (val > M[m][i]) M[m][i] = val; };
    // spindle-shaped muscle: centred at angle th (0 front, +pi/2 lateral, pi back), half-width w, spanning t0..t1
    const sp = (m, i, t, f, l, t0, t1, th, w) => {
      const u = (t - t0) / (t1 - t0); if (u <= 0 || u >= 1) return;
      const wid = w * Math.pow(Math.sin(Math.PI * u), 0.55);
      let d = Math.atan2(l, f) - th; d = Math.atan2(Math.sin(d), Math.cos(d));
      set(m, i, 1 - ss(0.55, 1.4, Math.abs(d) / Math.max(wid, 1e-3)));
    };
    for (const s of ['L', 'R']) {
      limb(s, 'thigh' + s, 'shin' + s, (i, t, f, l) => {
        sp('rf', i, t, f, l, 0.1, 0.86, 0.12, 0.42);
        sp('vl', i, t, f, l, 0.16, 0.96, 1.2, 0.62);
        sp('vm', i, t, f, l, 0.52, 0.97, -0.6, 0.42);
        sp('add', i, t, f, l, -0.02, 0.62, -1.55, 0.55);
        sp('ham', i, t, f, l, 0.1, 0.92, Math.PI, 0.85);
      }, ['thigh', 'hips']);
      limb(s, 'shin' + s, 'foot' + s, (i, t, f, l) => {
        sp('gastl', i, t, f, l, 0.02, 0.55, 2.55, 0.5);
        sp('gastm', i, t, f, l, 0.02, 0.62, -2.55, 0.55);
        sp('tib', i, t, f, l, 0.06, 0.8, 0.5, 0.33);
      }, ['shin']);
      limb(s, 'upperarm' + s, 'forearm' + s, (i, t, f, l) => {
        sp('bic', i, t, f, l, 0.28, 0.94, 0.0, 0.72);
        sp('tri', i, t, f, l, 0.18, 0.92, Math.PI, 0.85);
      }, ['upperarm']);
      limb(s, 'forearm' + s, 'hand' + s, (i, t, f, l) => {
        sp('fflex', i, t, f, l, -0.02, 0.7, 0.35, 0.95);
        sp('fext', i, t, f, l, -0.02, 0.7, Math.PI - 0.2, 0.9);
      }, ['forearm']);
    }
    const blob = (m, c, rad, nf, ok, p = 2) => {
      for (let i = 0; i < nv; i++) {
        if (flag[i]) continue; if (ok && !ok(i)) continue;
        const d = Math.pow(Math.pow(Math.abs((pos[i * 3] - c[0]) / rad[0]), p) + Math.pow(Math.abs((pos[i * 3 + 1] - c[1]) / rad[1]), p) + Math.pow(Math.abs((pos[i * 3 + 2] - c[2]) / rad[2]), 2), 1 / p);
        const val = (1 - ss(0.6, 1.15, d)) * nf(nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2], i);
        set(m, i, val);
      }
    };
    const sh = H('upperarmL'), hp = H('hips'), th = H('thighL');
    const torso = (i) => { const n = this.names[this.dom[i]]; return /^(hips|spine|chest|neck|upperarm)/.test(n); };
    const trunk = (i) => /^(hips|spine|chest)/.test(this.names[this.dom[i]]);
    for (const k of [1, -1]) {
      blob('pec', [k * 0.105, sh.y - 0.075, 0.1], [0.1, 0.07, 0.2], (x, y, z) => ss(0.35, 0.55, z), torso, 2.4);
      blob('abs1', [k * 0.045, hp.y + 0.24, 0.1], [0.04, 0.17, 0.2], (x, y, z) => ss(0.55, 0.7, z), trunk, 3);
      blob('obl', [k * 0.12, hp.y + 0.15, 0.04], [0.055, 0.12, 0.2], (x, y, z) => ss(0.3, 0.5, k * x) * ss(-0.2, 0.1, z), trunk, 2.2);
      blob('delt', [k * (sh.x + 0.035), sh.y - 0.04, 0.0], [0.08, 0.11, 0.09], () => 1, (i) => /^(upperarm|chest)/.test(this.names[this.dom[i]]) && k * this.d.pos[i * 3] > sh.x - 0.03);
      blob('lat', [k * 0.12, sh.y - 0.2, -0.05], [0.075, 0.14, 0.2], (x, y, z) => ss(0.2, 0.45, -z), trunk);
      blob('erec', [k * 0.05, hp.y + 0.17, -0.1], [0.03, 0.16, 0.2], (x, y, z) => ss(0.45, 0.65, -z), trunk);
      blob('gmax', [k * 0.085, th.y - 0.05, -0.06], [0.095, 0.12, 0.2], (x, y, z) => ss(0.2, 0.45, -z), (i) => /^(hips|thigh)/.test(this.names[this.dom[i]]));
      blob('gmed', [k * 0.14, th.y + 0.075, -0.02], [0.06, 0.065, 0.12], (x, y, z) => ss(0.25, 0.5, k * x), (i) => /^(hips|thigh|spine)/.test(this.names[this.dom[i]]));
    }
    blob('trap', [0, sh.y + 0.02, -0.06], [0.16, 0.17, 0.2], (x, y, z) => ss(0.3, 0.5, -z) * 1, (i) => /^(chest|neck|spine)/.test(this.names[this.dom[i]]));
    // smooth each field across mesh neighbours so contour lines come out clean
    const idx = this.d.idx, nb = Array.from({ length: nv }, () => new Set());
    for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2]; nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b); }
    const NB = nb.map(x => Int32Array.from(x));
    for (const m of MUSCLES) { let A = M[m], B2 = new Float32Array(nv);
      for (let it = 0; it < 2; it++) { for (let i = 0; i < nv; i++) { const n = NB[i]; let sum = A[i]; for (let j = 0; j < n.length; j++) sum += A[n[j]]; B2[i] = sum / (n.length + 1); } [A, B2] = [B2, A]; }
      let mx = 0; for (let i = 0; i < nv; i++) mx = Math.max(mx, A[i]); if (mx > 0) for (let i = 0; i < nv; i++) A[i] /= mx;
      M[m] = A; }
    this.masks = M;
  }
}
