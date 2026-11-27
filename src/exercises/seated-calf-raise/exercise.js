// Seated calf raise, barbell on the knees, balls of the feet on a bumper plate. Measured from E3 Rehab.
import * as THREE from 'three';
import { makeBarbell, makeFloorPlate, makeBenchH } from '../../core/props-barbell.js';
import { repDepth, repLength, sampleRep } from '../../core/motion.js';
import { CALF } from './table.js';

// tempo from the video (about 0.3 s top, 2 s down, 0.5 s stretch, 1.5 s up)
const TEMPO = [['Top', 0.3], ['Lowering', 2.0], ['Bottom stretch', 0.5], ['Rising', 1.5]];
const GRIP = { L: true, R: true };

// Soleus mask (this exercise only for now; the shared rig has no soleus field):
// back and both sides of the lower leg, below the gastrocnemius.
function addSoleus(rig) {
  const { pos, nv, flag } = rig.d; const M = new Float32Array(nv);
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (const s of ['L', 'R']) {
    const a = rig.H[rig.bi['shin' + s]], b = rig.H[rig.bi['foot' + s]], ax = b.clone().sub(a), Ln = ax.length(); ax.normalize();
    const k = s === 'L' ? 1 : -1; const lat = new THREE.Vector3(k, 0, 0); lat.sub(ax.clone().multiplyScalar(lat.dot(ax))).normalize();
    const fr = new THREE.Vector3(0, 0, 1); fr.sub(ax.clone().multiplyScalar(fr.dot(ax))).normalize();
    const v = new THREE.Vector3(), r = new THREE.Vector3(), id = rig.bi['shin' + s];
    for (let i = 0; i < nv; i++) { if (flag[i] || rig.dom[i] !== id) continue;
      v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).sub(a); const t = v.dot(ax) / Ln; r.copy(v).sub(ax.clone().multiplyScalar(t * Ln)).normalize();
      const th = Math.abs(Math.atan2(r.dot(lat), r.dot(fr)));           // 0 front .. pi back
      const u = (t - 0.3) / (0.9 - 0.3); if (u <= 0 || u >= 1) continue;
      const along = Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.25)), 0.6);
      M[i] = Math.max(M[i], along * ss(1.45, 2.0, th)); }
  }
  const idx = rig.d.idx, nb = Array.from({ length: nv }, () => new Set());
  for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2]; nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b); }
  let A = M, B2 = new Float32Array(nv); for (let it = 0; it < 2; it++) { for (let i = 0; i < nv; i++) { let sum = A[i], n = 1; for (const j of nb[i]) { sum += A[j]; n++; } B2[i] = sum / n; } [A, B2] = [B2, A]; }
  let mx = 0; for (let i = 0; i < nv; i++) mx = Math.max(mx, A[i]); if (mx > 0) for (let i = 0; i < nv; i++) A[i] /= mx;
  rig.masks.sol = A;
}

export default {
  id: 'seated-calf-raise', name: 'Seated calf raise', style: 'Barbell on the knees', note: 'From E3 Rehab reference · balls of the feet on a plate',
  aria: '3D figure for the seated calf raise. Drag to rotate, pinch or scroll to zoom.',
  legend: [['Soleus', 1], ['Gastrocnemius (less with the knee bent)', .4]],
  // soleus is the main mover with the knee bent; gastrocnemius works less in this position
  weights: { solL: 1, solR: 1, gastmL: .4, gastlL: .4, gastmR: .4, gastlR: .4 },
  curl: 0.55, grip: GRIP, length: repLength(TEMPO), tempo: TEMPO,
  camera: { pos: [3.4, 1.35, 2.6], target: [0, 0.42, 0.25], minDistance: 0.8, orbit: { r: 4.2, y: 1.1, cz: 0.25 } },
  load: 'Barbell',
  prepareRig: addSoleus,
  create(rig, material) {
    const bar = makeBarbell(material);
    const plate = makeFloorPlate(material); plate.position.set(0, 0, CALF.plateZ);
    const bench = makeBenchH(material, CALF.benchTop, 0, CALF.benchFront);
    const frameAt = t => { const d = repDepth(TEMPO, t); return { ...sampleRep(CALF.frames, d.p, ['bar']), phase: d.phase }; };
    return {
      attached: [], placed: [bar, plate, bench], bar, table: CALF,
      poseAt: t => frameAt(t).pose,
      update(t) {
        const fr = frameAt(t);
        rig.apply(fr.pose, 0.55, GRIP); rig.root.position.set(...fr.root); rig.root.updateMatrixWorld(true);
        bar.position.set(...fr.bar);
        return fr.phase;
      },
    };
  },
};
