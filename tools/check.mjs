// Checks every exercise using the exact poses the app shows (same modules, same timing):
// self-clipping, props (dumbbells, bench, barbell, plate), floor, and balance.
// Usage: npm run check            (all exercises)
//        npm run check -- pogo-hops   (one exercise)
// Optional: N=400 for more sample points (default 161 per loop).
import * as THREE from 'three';
import { Rig, decode } from '../src/core/rig.js';
import { BENCH, insideDB } from '../src/core/props.js';
import { BAR, insideBar } from '../src/core/props-barbell.js';
import { check } from './qa.mjs';
const { EXERCISES } = await import('../src/exercises/index.js');
const { META, BODY } = await import('../src/core/body_c.js');

const N = +(process.env.N || 161);
const only = process.argv[2];
const mat = new THREE.MeshBasicMaterial();
const cm = x => (x * 100).toFixed(1) + ' cm';

// surface-area weights per vertex (for the centre of mass), as in the original solvers
function areaWeights(rig) {
  const nv = rig.d.nv, idx = rig.d.idx, B = rig.d.pos, wA = new Float32Array(nv); let wS = 0;
  for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    const ab = [B[b*3]-B[a*3], B[b*3+1]-B[a*3+1], B[b*3+2]-B[a*3+2]], ac = [B[c*3]-B[a*3], B[c*3+1]-B[a*3+1], B[c*3+2]-B[a*3+2]];
    const ar = Math.hypot(ab[1]*ac[2]-ab[2]*ac[1], ab[2]*ac[0]-ab[0]*ac[2], ab[0]*ac[1]-ab[1]*ac[0]) / 6; wA[a] += ar; wA[b] += ar; wA[c] += ar; wS += 3 * ar; }
  return { wA, wS };
}

// Per-exercise extra checks. Each returns { problems, ...numbers } for one pose (rig already placed).
const EXTRA = {
  'split-squat': (rig, inst, P, W) => {
    // bench pad: no body point inside it
    const by = inst.bench.position.y, bx = inst.bench.position.x;
    let inBench = 0, benchDepth = 0; const z0 = inst.benchZ0;
    for (let i = 0; i < rig.d.nv; i++) { const x = P[i*3], y = P[i*3+1], z = P[i*3+2];
      if (Math.abs(x - bx) < BENCH.w / 2 && y < by + BENCH.top - 0.001 && y > by + BENCH.top - BENCH.pad && z < z0 && z > z0 - BENCH.len) { inBench++; benchDepth = Math.max(benchDepth, by + BENCH.top - y); } }
    // balance: share of weight on the front foot (front ankle z = 0, rear foot on the bench at z = -0.86 m),
    // dumbbells count 15% of body weight each, as in the solver
    let z = 0; for (let i = 0; i < rig.d.nv; i++) z += P[i * 3 + 2] * W.wA[i];
    const v = new THREE.Vector3(); let dz = 0; for (const d of Object.values(inst.dumbbells)) { d.getWorldPosition(v); dz += v.z; }
    const com = (z + dz * W.wS * 0.15) / (W.wS * 1.3), rear = -0.86, front2 = 0.05;
    let kmin = 1e9; for (let i = 0; i < rig.d.nv; i++) { const n = rig.names[rig.dom[i]]; if (n === 'shinR' || n === 'thighR') kmin = Math.min(kmin, P[i * 3 + 1]); }
    return { problems: inBench, inBench, benchDepth, frontWeight: (com - rear) / (front2 - rear), rearKnee: kmin };
  },
  'single-leg-rdl': (rig, inst, P, W) => {
    // balance: centre of mass over the stance mid-foot (6 cm ahead of the ankle), dumbbell 15% of body weight
    let z = 0; for (let i = 0; i < rig.d.nv; i++) z += P[i * 3 + 2] * W.wA[i];
    const v = new THREE.Vector3(); inst.dumbbells.R.getWorldPosition(v);
    const com = (z + v.z * W.wS * 0.15) / (W.wS * 1.15);
    return { problems: 0, comErr: com - (inst.footRef.z + 0.06) };
  },
  'pogo-hops': (rig, inst, P, W, t) => {
    const contact = (t % 0.4) < inst.contactTime; if (!contact) return { problems: 0 };
    let cz = 0, w = 0; const touch = [];
    for (let i = 0; i < rig.d.nv; i++) { cz += P[i * 3 + 2] * W.wA[i]; w += W.wA[i]; if (P[i * 3 + 1] < 0.004) touch.push(P[i * 3 + 2]); }
    const lo = Math.min(...touch), hi = Math.max(...touch), com = cz / w;
    return { problems: com < lo || com > hi ? 1 : 0, com, patch: [lo, hi] };
  },
  'seated-calf-raise': (rig, inst, P, W, t, ctx) => {
    const fr = inst.bar.position, tb = inst.table, hand = ctx.hand, l = new THREE.Vector3(), g = new THREE.Vector3();
    let nb = 0, nhs = 0, np = 0, nbe = 0, gap = 9;
    for (let i = 0; i < rig.d.nv; i++) { const x = P[i*3], y = P[i*3+1], z = P[i*3+2];
      l.set(x - fr.x, y - fr.y, z - fr.z); const ib = insideBar(l, true);
      if (ib) nb++; if (hand[i] && Math.abs(l.x) <= BAR.inner && Math.hypot(l.y, l.z) < BAR.r) nhs++;
      if (!hand[i] && ib === null && Math.abs(l.x) <= BAR.inner && Math.hypot(l.y, l.z) < BAR.r) nb++;
      if (!hand[i] && Math.abs(l.x) <= BAR.padL / 2) gap = Math.min(gap, Math.hypot(l.y, l.z) - BAR.padR);
      if (y < BAR.plateT && Math.hypot(x, z - tb.plateZ) < BAR.plateR) np++;
      if (Math.abs(x) < 0.14 && y < tb.benchTop && y > tb.benchTop - 0.075 && z < tb.benchFront && z > tb.benchFront - 1.16) nbe++; }
    let grip = 0; for (const s of ['L', 'R']) { ctx.grip[s].getWorldPosition(g); grip = Math.max(grip, Math.hypot(g.y - fr.y, g.z - fr.z)); }
    return { problems: nb + nhs + np + nbe, bar: nb, handInShaft: nhs, plate: np, bench: nbe, padGap: gap, gripOff: grip };
  },
};

let failed = 0;
for (const entry of EXERCISES) {
  if (only && entry.id !== only) continue;
  const ex = (await entry.load()).default;
  const rig = new Rig(META, decode(META, BODY)); if (ex.prepareRig) ex.prepareRig(rig);
  const inst = ex.create(rig, mat);
  if (inst.bench) inst.benchZ0 = inst.bench.children[0].position.z + BENCH.len / 2; // front edge of the pad
  const W = areaWeights(rig), kind = ex.id.startsWith('split-squat') ? 'split-squat' : ex.id;
  const ctx = {};
  if (kind === 'seated-calf-raise') { // grip centre in each hand, as in the calf solver check
    ctx.hand = new Uint8Array(rig.d.nv); for (let i = 0; i < rig.d.nv; i++) if (/^(hand|f\d\d)[LR]$/.test(rig.names[rig.dom[i]])) ctx.hand[i] = 1;
    ctx.grip = {}; for (const s of ['L', 'R']) { const H = n => rig.H[rig.bi[n]]; const pn = rig.palmNormal(s), ax = H('f51' + s).clone().sub(H('f21' + s)).normalize(), dir = H('f31' + s).clone().sub(H('hand' + s)).normalize(), sd = new THREE.Vector3().crossVectors(ax, pn).normalize(); const o = new THREE.Object3D(); o.position.copy(H('hand' + s).clone().lerp(H('f31' + s), 0.95).add(pn.clone().multiplyScalar(0.0335)).add(dir.multiplyScalar(0.015)).add(sd.multiplyScalar(s === 'L' ? -0.005 : 0.005))).sub(H('hand' + s)); rig.bones[rig.bi['hand' + s]].add(o); ctx.grip[s] = o; }
  }
  let bad = 0, self = 0, dbIn = 0, dbFloor = 9, floor = 9; const S = [];
  for (let j = 0; j < N; j++) {
    const t = j / N * ex.length, pose = inst.poseAt(t);
    // self-clipping and dumbbells (the check poses the rig itself, at the origin)
    let n = 0; const dbs = inst.dumbbells ? Object.entries(inst.dumbbells) : [[null, null]];
    for (const [s, db] of dbs) { const q = check(rig, pose, ex.curl, ex.grip, db, s || 'R');
      const sv = q.armL.verts + q.armR.verts + q.legL.verts + q.legR.verts; self += sv; n += sv;
      if (q.dumbbell) { dbIn += q.dumbbell.bodyVertsInside; n += q.dumbbell.bodyVertsInside; dbFloor = Math.min(dbFloor, q.dumbbell.clearanceAboveFloorCm); } }
    // world position as shown on the page
    inst.update(t); const P = rig.skinned(); let my = 9; for (let i = 1; i < P.length; i += 3) my = Math.min(my, P[i]); floor = Math.min(floor, my);
    const x = EXTRA[kind](rig, inst, P, W, t, ctx); n += x.problems; if (my < -0.001) n++;
    S.push(x); if (n) { bad++; if (bad <= 3) console.log('   problem at', t.toFixed(3) + 's', JSON.stringify(x)); }
  }
  const line = [`${ex.id}: ${N} poses, poses with a problem: ${bad}`, `self-clipping verts ${self}`];
  if (inst.dumbbells) line.push(`body inside dumbbells ${dbIn}`, `dumbbell lowest ${dbFloor} cm above floor`);
  line.push(`lowest body point ${(floor * 1000).toFixed(1)} mm`);
  if (kind === 'split-squat') { const fw = S.map(s => s.frontWeight), bi = S.reduce((a, s) => a + s.inBench, 0), bt = Math.round((ex.tempo[0][1] + ex.tempo[1][1]) / ex.length * N);
    line.push(`inside bench ${bi} (deepest ${(Math.max(...S.map(s => s.benchDepth)) * 1000).toFixed(1)} mm)`, `front-foot weight top ${(fw[0] * 100).toFixed(0)}%, bottom ${(fw[bt] * 100).toFixed(0)}%`, `rear knee lowest ${cm(Math.min(...S.map(s => s.rearKnee)))} above floor`); }
  if (kind === 'single-leg-rdl') { const e = S.map(s => Math.abs(s.comErr)); line.push(`centre of mass within ${cm(Math.max(...e))} of mid-foot`); }
  if (kind === 'pogo-hops') { const c = S.filter(s => s.com !== undefined); line.push(`ground contact: centre of mass ${cm(Math.min(...c.map(s => s.com)))} to ${cm(Math.max(...c.map(s => s.com)))}, inside contact patch ${cm(Math.min(...c.map(s => s.patch[0])))} to ${cm(Math.max(...c.map(s => s.patch[1])))}`); }
  if (kind === 'seated-calf-raise') { const k = ['bar', 'handInShaft', 'plate', 'bench']; line.push(k.map(n => `${n} ${S.reduce((a, s) => a + s[n], 0)}`).join(', '), `closest body point to pad ${(Math.min(...S.map(s => s.padGap)) * 1000).toFixed(1)} mm`, `grip centre max ${cm(Math.max(...S.map(s => s.gripOff)))} off the bar axis`, 'balance: seated, n/a'); }
  console.log(line.join(' | ')); if (bad) failed++;
}
if (failed) { console.log(`\n${failed} exercise(s) have problems`); process.exit(1); } else console.log('\nAll checked exercises: no problems.');
