// Seated calf raise props (new, exercise-specific): Olympic barbell with a foam pad and two
// bumper plates, and a bumper plate lying flat on the floor under the forefeet.
// Sizes: bar 2.2 m, 28 mm shaft, 1.31 m between collars, 50 mm sleeves (standard Olympic bar);
// bumper 450 mm diameter (standard); plate thickness ~50 mm and pad size are judgement from the video.
import * as THREE from 'three';
export const BAR = { len: 2.2, r: 0.014, inner: 0.655, sleeveR: 0.025, collarR: 0.03, plateR: 0.225, plateT: 0.05, padR: 0.045, padL: 0.40 };
export function makeBarbell(material) {
  const g = new THREE.Group(); const B = BAR;
  const cyl = (r, l, x) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 32), material); m.rotation.z = Math.PI / 2; m.position.x = x; g.add(m); return m; };
  cyl(B.r, 2 * B.inner, 0);                                   // shaft
  cyl(B.padR, B.padL, 0);                                     // foam pad
  for (const s of [-1, 1]) {
    cyl(B.collarR, 0.03, s * (B.inner + 0.015));                // collar
    cyl(B.sleeveR, B.len / 2 - B.inner - 0.03, s * (B.inner + 0.03 + (B.len / 2 - B.inner - 0.03) / 2)); // sleeve
    cyl(B.plateR, B.plateT, s * (B.inner + 0.03 + B.plateT / 2 + 0.002));                                 // bumper
    cyl(0.05, 0.012, s * (B.inner + 0.03 + B.plateT + 0.008));                                            // outer collar clamp
  }
  return g;
}
// point (in the barbell's local frame, bar along x) inside any part?
export function insideBar(l, skipShaft = false) {
  const B = BAR, r = Math.hypot(l.y, l.z), x = Math.abs(l.x);
  if (x <= B.padL / 2 && r < B.padR) return 'pad';
  if (!skipShaft && x <= B.inner && r < B.r) return 'shaft';
  const p0 = B.inner + 0.032, p1 = p0 + B.plateT; if (x >= p0 && x <= p1 && r < B.plateR) return 'plate';
  if (x > B.inner && x <= B.len / 2 && r < B.collarR) return 'sleeve';
  return null;
}
// bumper plate lying flat on the floor
export function makeFloorPlate(material) {
  const g = new THREE.Group(); const B = BAR;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(B.plateR, B.plateR, B.plateT, 48), material); m.position.y = B.plateT / 2; g.add(m);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, B.plateT + 0.004, 24), material); hub.position.y = B.plateT / 2; g.add(hub);
  return g;
}
// Flat bench like the approved one (props.js makeBench) but with the pad top at `top` metres.
// The calf raise uses 0.46 m: judgement, so the joint angles match the video for this taller model.
export function makeBenchH(material, top, x, z0, len = 1.16, w = 0.28, pad = 0.075) {
  const g = new THREE.Group();
  const box = (bw, h, d, px, py, pz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bw, h, d), material); m.position.set(px, py, pz); g.add(m); return m; };
  const zc = z0 - len / 2;
  box(w, pad, len, 0, top - pad / 2, zc);
  box(0.06, 0.05, len - 0.18, 0, top - pad - 0.025, zc);
  for (const e of [-1, 1]) {
    const ze = zc + e * (len / 2 - 0.12);
    box(0.06, top - pad - 0.05, 0.06, 0, (top - pad - 0.05) / 2 + 0.025, ze);
    box(e > 0 ? 0.42 : 0.36, 0.05, 0.07, 0, 0.025, ze);
  }
  g.position.set(x, 0, 0);
  return g;
}
