// Self-clipping check (arms against torso and legs, leg against leg) and dumbbell checks.
// Moved unchanged from the exercise-3d tools; only the import paths changed.
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { insideDB } from '../src/core/props.js';
export function check(rig, pose, curl, grip = {}, db = null, dbSide = 'R') {
  rig.apply(pose, curl, grip);
  const P = rig.skinned(); const seg = rig.segments(); const idx = rig.d.idx; const nv = rig.d.nv;
  const sh = { 1: rig.bones[rig.bi.upperarmL], 2: rig.bones[rig.bi.upperarmR], 3: rig.bones[rig.bi.thighL], 4: rig.bones[rig.bi.thighR] };
  const res = {};
  const pairs = [[1, [0, 3, 4, 2]], [2, [0, 3, 4, 1]], [3, [4]], [4, [3]]];
  const v = new THREE.Vector3(), j = new THREE.Vector3();
  for (const [a, others] of pairs) {
    const tris = [];
    for (let t = 0; t < idx.length; t += 3) { const s0 = seg[idx[t]], s1 = seg[idx[t + 1]], s2 = seg[idx[t + 2]]; if (others.includes(s0) && others.includes(s1) && others.includes(s2)) tris.push(idx[t], idx[t + 1], idx[t + 2]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setIndex(tris);
    const bvh = new MeshBVH(g); const ix = g.index.array; sh[a].getWorldPosition(j);
    let n = 0, max = 0; const tgt = {}; const tri = new THREE.Triangle(), nn = new THREE.Vector3();
    for (let i = 0; i < nv; i++) {
      if (seg[i] !== a) continue; v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
      if (v.distanceTo(j) < (a < 3 ? 0.13 : 0.16)) continue;
      const hit = bvh.closestPointToPoint(v, tgt, 0, 0.06); if (!hit) continue;
      const f = hit.faceIndex * 3; const ia = ix[f], ib = ix[f + 1], ic = ix[f + 2];
      tri.set(new THREE.Vector3(P[ia * 3], P[ia * 3 + 1], P[ia * 3 + 2]), new THREE.Vector3(P[ib * 3], P[ib * 3 + 1], P[ib * 3 + 2]), new THREE.Vector3(P[ic * 3], P[ic * 3 + 1], P[ic * 3 + 2]));
      tri.getNormal(nn);
      const d = v.clone().sub(hit.point).dot(nn);
      if (d < -0.0015) { n++; max = Math.max(max, -d); if (globalThis.QA_DEBUG) { const k = rig.names[rig.dom[i]] + '>' + rig.names[rig.dom[ia]]; (globalThis.QA_HITS[k] = globalThis.QA_HITS[k] || [0, 0]); globalThis.QA_HITS[k][0]++; globalThis.QA_HITS[k][1] = Math.max(globalThis.QA_HITS[k][1], +(-d * 1000).toFixed(1)); } }
    }
    res[['', 'armL', 'armR', 'legL', 'legR'][a]] = { verts: n, maxDepthMm: +(max * 1000).toFixed(1) };
  }
  if (db) {
    db.updateMatrixWorld(true); let n = 0;
    for (let i = 0; i < nv; i++) { const nm = rig.names[rig.dom[i]]; if (new RegExp('^(hand' + dbSide + '|f\\d\\d' + dbSide + ')$').test(nm)) continue; v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); if (insideDB(db, v)) { n++; if (globalThis.QA_DEBUG) { const k = 'db' + dbSide + '>' + nm; globalThis.QA_HITS[k] = (globalThis.QA_HITS[k] || 0) + 1; } } }
    // lowest point of the dumbbell vs the floor
    const box = new THREE.Box3().setFromObject(db); let floor = 1e9; for (let i = 1; i < P.length; i += 3) floor = Math.min(floor, P[i]);
    res.dumbbell = { bodyVertsInside: n, clearanceAboveFloorCm: +((box.min.y - floor) * 100).toFixed(1) };
  }
  return res;
}
