// Single-leg RDL balance solver: for 41 points through the rep, finds the stance-thigh lean that puts the
// centre of mass (dumbbell counted as 15% of body weight) over the stance mid-foot, 6 cm ahead of the ankle.
// Rewrites LEAN in src/exercises/single-leg-rdl/table.js and keeps ARMS. Ported from the original rep.mjs.
import * as THREE from 'three';
import fs from 'fs';
import { Rig, decode } from '../src/core/rig.js';
import { makeDumbbell, attachGrip } from '../src/core/props.js';
import { slrdl, GRIP, paramsAt } from '../src/exercises/single-leg-rdl/poses.js';
import { ARMS } from '../src/exercises/single-leg-rdl/table.js';
const { META, BODY } = await import('../src/core/body_c.js');
const rig = new Rig(META, decode(META, BODY));
const db = attachGrip(rig, makeDumbbell(new THREE.MeshBasicMaterial()));
const nv = rig.d.nv, idx = rig.d.idx, B = rig.d.pos, wA = new Float32Array(nv); let wS = 0;
for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2];
  const ab = [B[b*3]-B[a*3], B[b*3+1]-B[a*3+1], B[b*3+2]-B[a*3+2]], ac = [B[c*3]-B[a*3], B[c*3+1]-B[a*3+1], B[c*3+2]-B[a*3+2]];
  const ar = Math.hypot(ab[1]*ac[2]-ab[2]*ac[1], ab[2]*ac[0]-ab[0]*ac[2], ab[0]*ac[1]-ab[1]*ac[0]) / 6; wA[a] += ar; wA[b] += ar; wA[c] += ar; wS += 3 * ar; }
const fw = new THREE.Vector3(), dp = new THREE.Vector3();
rig.apply({}, 0.55, GRIP); rig.bones[rig.bi.footL].getWorldPosition(fw); const ref = fw.clone();
function place(pose) { rig.root.position.set(0, 0, 0); rig.apply(pose, 0.55, GRIP); rig.bones[rig.bi.footL].getWorldPosition(fw); rig.root.position.set(ref.x - fw.x, ref.y - fw.y, ref.z - fw.z); rig.root.updateMatrixWorld(true); }
function comErr(pose) { place(pose); const P = rig.skinned(); let z = 0; for (let i = 0; i < nv; i++) z += P[i * 3 + 2] * wA[i]; db.getWorldPosition(dp); return (z + dp.z * wS * 0.15) / (wS * 1.15) - (ref.z + 0.06); }
const N = 41, lean = [];
for (let s = 0; s < N; s++) { const base = paramsAt(s / (N - 1)); let lo = -0.2, hi = 0.8;
  for (let it = 0; it < 18; it++) { const m = (lo + hi) / 2; if (comErr(slrdl({ ...base, lean: m })) > 0) lo = m; else hi = m; }
  lean.push((lo + hi) / 2); }
const sm = lean.map((v, i) => i === 0 || i === N - 1 ? v : (lean[i - 1] + 2 * v + lean[i + 1]) / 4).map(v => +v.toFixed(4));
const f = 'src/exercises/single-leg-rdl/table.js';
fs.writeFileSync(f, 'export const LEAN = ' + JSON.stringify(sm) + ';\nexport const ARMS = ' + JSON.stringify(ARMS) + ';\n');
console.log('LEAN rewritten; top', sm[0], 'bottom', sm[N - 1]);
