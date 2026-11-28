// Dumbbell held in the right hand (opposite the stance leg).
import * as THREE from 'three';
export const DB = { handle: 0.14, hr: 0.016, head: 0.055, R: 0.06 }; // ~12 kg hex dumbbell, metres
export function makeDumbbell(material) {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(DB.hr, DB.hr, DB.handle + 0.01, 20), material);
  g.add(handle);
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(DB.R, DB.R, DB.head, 6), material);
    h.position.y = s * (DB.handle / 2 + DB.head / 2); g.add(h);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(DB.hr * 1.7, DB.hr * 1.7, 0.012, 20), material);
    c.position.y = s * (DB.handle / 2 - 0.004); g.add(c);
  }
  return g;
}
// place the dumbbell in the closed right hand (bind-pose coordinates, parented to the hand bone)
export function attachGrip(rig, g, s = 'R') {
  const H = n => rig.H[rig.bi[n]];
  const hand = H('hand' + s), knuck = H('f31' + s);
  const pn = rig.palmNormal(s);
  const centre = hand.clone().lerp(knuck, 0.95).add(pn.clone().multiplyScalar(0.035));
  const axis = H('f51' + s).clone().sub(H('f21' + s)).normalize();
  g.position.copy(centre).sub(hand);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
  rig.bones[rig.bi['hand' + s]].add(g);
  return g;
}
// is a world point inside the dumbbell?
export function insideDB(g, p) {
  const l = g.worldToLocal(p.clone()); const r = Math.hypot(l.x, l.z), y = Math.abs(l.y);
  if (y <= DB.handle / 2) return r < DB.hr;
  if (y <= DB.handle / 2 + DB.head) return r < DB.R * Math.cos(Math.PI / 6);
  return false;
}

// Flat gym bench, long axis along z. top = pad top height, z0 = front edge of the pad.
export const BENCH = { top: 0.43, len: 1.16, w: 0.28, pad: 0.075 };
export function makeBench(material, x, z0) {
  const g = new THREE.Group(); const B = BENCH;
  const box = (w, h, d, px, py, pz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(px, py, pz); g.add(m); return m; };
  const zc = z0 - B.len / 2;
  box(B.w, B.pad, B.len, 0, B.top - B.pad / 2, zc);                        // pad
  box(0.06, 0.05, B.len - 0.18, 0, B.top - B.pad - 0.025, zc);             // spine rail
  for (const e of [-1, 1]) {
    const ze = zc + e * (B.len / 2 - 0.12);
    box(0.06, B.top - B.pad - 0.05, 0.06, 0, (B.top - B.pad - 0.05) / 2 + 0.025, ze);   // upright
    box(e > 0 ? 0.42 : 0.36, 0.05, 0.07, 0, 0.025, ze);                                 // foot bar
  }
  g.position.set(x, 0, 0);
  return g;
}
